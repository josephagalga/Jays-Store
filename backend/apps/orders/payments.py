"""Instant split payments via Paystack.

Money model (locked in with the store owner):
- Buyer pays (items + delivery fee + gateway fee) in ONE Paystack charge.
- Paystack auto-settles each seller's net share straight to their
  subaccount at charge time. Seller funds never sit with the platform.
- Platform keeps: full 10% commission + full delivery fee.
- Paystack gateway fee is buyer-funded: buyer pays it on top (itemized at
  checkout), sellers get gross - commission untouched, Paystack deducts
  its fee once from the admin pot.
- Drivers are paid physically by the admin — no driver money in-system.
"""
import logging
from decimal import Decimal, ROUND_HALF_UP

import requests
from django.conf import settings
from django.utils import timezone

from .models import PLATFORM_COMMISSION_RATE

logger = logging.getLogger(__name__)

TWOPLACES = Decimal('0.01')


def _q(value):
    return Decimal(str(value)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def paystack_fee_rate():
    return Decimal(str(getattr(settings, 'PAYSTACK_GH_FEE_RATE', '0.0195')))


def paystack_fee_cap():
    return Decimal(str(getattr(settings, 'PAYSTACK_GH_FEE_CAP', '10.00')))


def compute_processing_fee(net_total):
    """Gateway fee passed to buyer+sellers for a given net amount.

    Solves fee = rate * (net + fee) subject to the cap, so the grossed-up
    charge nets exactly `net_total` after Paystack deducts its fee.
    """
    net_total = _q(net_total)
    if net_total <= 0:
        return Decimal('0.00')
    rate = paystack_fee_rate()
    cap = paystack_fee_cap()
    if rate <= 0:
        return Decimal('0.00')
    uncapped = (rate * net_total / (Decimal('1') - rate)).quantize(
        TWOPLACES, rounding=ROUND_HALF_UP)
    # Cap binds when even the capped gross still hits the cap.
    if rate * (net_total + cap) >= cap:
        return _q(cap)
    return _q(uncapped)


def compute_order_split(items):
    """Per-seller shares for an order's items.

    `items`: iterable of (seller, line_total Decimal).
    Returns (per_seller dict, admin_share Decimal, fee Decimal) where each
    seller entry is {gross, commission, fee_slice, net}.
    Fee is allocated pro-rata across sellers + admin by net share.
    """
    rate = Decimal(str(PLATFORM_COMMISSION_RATE))
    per_seller = {}
    sellers_gross = Decimal('0.00')
    for seller, line_total in items:
        line_total = _q(line_total)
        entry = per_seller.setdefault(seller.id, {'seller': seller, 'gross': Decimal('0.00')})
        entry['gross'] += line_total
        sellers_gross += line_total

    for entry in per_seller.values():
        entry['gross'] = _q(entry['gross'])
        entry['commission'] = _q(entry['gross'] * rate)

    sellers_net_before_fee = _q(sellers_gross * (Decimal('1') - rate))
    return per_seller, sellers_net_before_fee


def allocate_fee(per_seller, admin_net_before_fee, fee):
    """Buyer-covers-all: sellers get gross - commission untouched.

    The buyer already pays `total + fee` on top, and Paystack deducts its
    fee once from the admin pot (bearer_type='account'). So sellers carry
    zero fee slice and admin keeps the full commission + delivery.
    Returns admin_net_before_fee unchanged for the response payload;
    true admin bank credit = charged - sellers_net - fee_actual (finance view).
    """
    admin_net_before_fee = _q(admin_net_before_fee)
    for e in per_seller.values():
        e['fee_slice'] = Decimal('0.00')
        e['net'] = _q(e['gross'] - e['commission'])
    return _q(admin_net_before_fee)


def _headers():
    secret = (settings.PAYSTACK_SECRET_KEY or '').strip()
    return {'Authorization': f'Bearer {secret}', 'Content-Type': 'application/json'}


def _require_secret():
    if not (settings.PAYSTACK_SECRET_KEY or '').strip():
        raise RuntimeError('Paystack is not configured (PAYSTACK_SECRET_KEY missing)')


def create_subaccount(*, business_name, account_number, bank_code):
    """Create a Paystack subaccount that settlements pay into."""
    _require_secret()
    resp = requests.post(
        'https://api.paystack.co/subaccount',
        json={
            'business_name': business_name[:100],
            'settlement_bank': bank_code,
            'account_number': account_number,
            'percentage_charge': 0,
        },
        headers=_headers(), timeout=20,
    )
    body = resp.json()
    if not body.get('status') or 'data' not in body:
        raise RuntimeError(body.get('message', 'Paystack rejected the subaccount'))
    return body['data']  # contains subaccount_code, account_number, etc.


def list_ghana_banks():
    """Paystack bank list (includes Ghana settlement banks)."""
    _require_secret()
    resp = requests.get(
        'https://api.paystack.co/bank?currency=GHS',
        headers=_headers(), timeout=20,
    )
    body = resp.json()
    if not body.get('status'):
        raise RuntimeError(body.get('message', 'Could not fetch bank list'))
    return body.get('data', [])


def create_transaction_split(*, name, seller_shares):
    """Create a per-order flat split. seller_shares: [(subaccount_code, net Decimal)].

    Bearer stays on the platform account: the buyer-paid gross-up already
    covers the gateway fee, so every subaccount receives its exact net share
    and the platform keeps the remainder.
    """
    _require_secret()
    subaccounts = [
        {'subaccount': code, 'share': int(_q(net) * 100)}
        for code, net in seller_shares
        if _q(net) > 0
    ]
    if not subaccounts:
        raise RuntimeError('No seller shares to split')
    resp = requests.post(
        'https://api.paystack.co/split',
        json={
            'name': name[:255],
            'type': 'flat',
            'currency': 'GHS',
            'bearer_type': 'account',
            'subaccounts': subaccounts,
        },
        headers=_headers(), timeout=20,
    )
    body = resp.json()
    if not body.get('status') or 'data' not in body:
        raise RuntimeError(body.get('message', 'Paystack rejected the split'))
    return body['data']  # contains split_code, id, ...


def initialize_plain_transaction(*, email, gross_total, reference, order_id, callback_url=None):
    """Initialize a buyer charge with NO split (all-platform order)."""
    return initialize_split_transaction(
        email=email, gross_total=gross_total, reference=reference,
        split_code=None, order_id=order_id, callback_url=callback_url,
    )


def initialize_split_transaction(*, email, gross_total, reference, split_code, order_id, callback_url=None):
    """Initialize the single buyer charge carrying the split."""
    _require_secret()
    payload = {
        'email': email,
        'amount': int(_q(gross_total) * 100),
        'currency': 'GHS',
        'reference': reference,
        'metadata': {
            'order_id': str(order_id),
            'custom_fields': [
                {'display_name': 'Order ID', 'variable_name': 'order_id', 'value': str(order_id)},
            ],
        },
    }
    if split_code:
        payload['split_code'] = split_code
    if callback_url:
        payload['callback_url'] = callback_url
    resp = requests.post(
        'https://api.paystack.co/transaction/initialize',
        json=payload, headers=_headers(), timeout=20,
    )
    body = resp.json()
    if not body.get('status') or 'data' not in body:
        raise RuntimeError(body.get('message', 'Paystack rejected the transaction'))
    return body['data']


def notify_buyer_of_otp(order, otp_code, connection=None):
    """Email-only OTP notification (SMS via Hubtel plugs in here later).

    Returns True if at least email was sent. Never raises.
    """
    from .emails import send_delivery_otp
    try:
        sent = bool(send_delivery_otp(order, otp_code, connection=connection))
    except Exception as exc:  # pragma: no cover — defensive
        logger.warning('OTP email failed for order %s: %s', order.id, exc)
        sent = False
    # --- SMS (Hubtel) — deferred. Plug in here later: ---
    # from .sms import send_otp_sms
    # sms_sent = send_otp_sms(order.delivery_phone, order.id, otp_code)
    sms_sent = False
    try:
        log = getattr(order, 'otp_log', None)
        if log is not None:
            log.email_sent = sent
            if sent:
                log.email_sent_at = timezone.now()
            log.sms_sent = sms_sent
            if sms_sent:
                from django.utils import timezone as tz
                log.sms_sent_at = tz.now()
            log.buyer_notified = sent or sms_sent
            if log.buyer_notified:
                log.buyer_notified_at = timezone.now()
                log.buyer_notification_method = 'email' if sent and not sms_sent else 'sms+email'
            log.save(update_fields=[
                'email_sent', 'email_sent_at', 'sms_sent',
                'buyer_notified', 'buyer_notified_at', 'buyer_notification_method',
            ])
    except Exception as exc:
        logger.warning('Could not update OTP log for order %s: %s', order.id, exc)
    return sent
