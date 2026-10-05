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


def seller_delivery_mode(seller):
    """'self' if this seller delivers their own items, else 'platform'."""
    if not seller or getattr(seller, 'role', '') != 'seller':
        return 'platform'
    return 'self' if getattr(seller, 'delivery_mode', 'platform') == 'self' else 'platform'


def seller_delivery_fee(seller):
    """Flat per-order self-delivery fee, clamped to 0–50 GHS."""
    try:
        fee = _q(getattr(seller, 'custom_delivery_fee', 0) or 0)
    except Exception:
        return Decimal('0.00')
    if fee < 0:
        return Decimal('0.00')
    return min(fee, Decimal('50.00'))


def price_checkout_lines(lines):
    """Price an order's lines with per-seller delivery.

    lines: iterable of (product, quantity). Prices come from the DB objects.
    Returns a dict with subtotal, commission_collected, platform item count,
    platform_delivery, self_groups {seller_id: {seller, fee, store}},
    delivery_fee (total charged), total, breakdown (JSON snapshot),
    needs_driver, and seller_nets {seller_id: [seller, net]} for splitting.

    Pure-platform carts produce EXACTLY the legacy numbers.
    """
    from .models import calculate_delivery_fee

    subtotal = Decimal('0.00')
    commission_collected = Decimal('0.00')
    platform_count = 0
    platform_direct = Decimal('0.00')
    seller_nets = {}  # seller_id -> [seller, product-net total]
    self_groups = {}  # seller_id -> {seller, fee, store}

    for product, qty in lines:
        qty = int(qty)
        buyer_line = Decimal(str(product.display_price)) * qty
        seller_line = Decimal(str(product.effective_price)) * qty
        subtotal += buyer_line
        commission_collected += buyer_line - seller_line
        seller = getattr(product, 'seller', None) or getattr(product, 'created_by', None)
        if seller_delivery_mode(seller) == 'self':
            entry = self_groups.setdefault(seller.id, {
                'seller': seller, 'fee': seller_delivery_fee(seller),
                'store': seller.store_name or seller.email,
            })
            net = seller_nets.setdefault(seller.id, [seller, Decimal('0.00')])
            net[1] += seller_line
        else:
            platform_count += qty
            if seller and getattr(seller, 'role', '') == 'seller':
                net = seller_nets.setdefault(seller.id, [seller, Decimal('0.00')])
                net[1] += seller_line
            else:
                platform_direct += seller_line

    platform_delivery = calculate_delivery_fee(platform_count) if platform_count else Decimal('0.00')
    self_delivery_total = sum((g['fee'] for g in self_groups.values()), Decimal('0.00'))
    delivery_fee = platform_delivery + self_delivery_total
    total = max(Decimal('0.00'), subtotal + delivery_fee)

    breakdown = {
        str(sid): {'mode': 'self', 'fee': str(g['fee']), 'store': g['store']}
        for sid, g in self_groups.items()
    }
    breakdown['platform'] = {'items': platform_count, 'fee': str(platform_delivery)}

    return {
        'subtotal': _q(subtotal),
        'commission_collected': _q(commission_collected),
        'platform_count': platform_count,
        'platform_direct': _q(platform_direct),
        'platform_delivery': _q(platform_delivery),
        'self_groups': self_groups,
        'self_delivery_total': _q(self_delivery_total),
        'delivery_fee': _q(delivery_fee),
        'total': _q(total),
        'breakdown': breakdown,
        'needs_driver': platform_count > 0,
        'seller_nets': seller_nets,
    }


def compute_order_split(items):
    """Per-seller shares for an order's items. NO commission deducted (buyer already paid it).
    
    IMPORTANT: items should contain seller net amounts (not buyer-paid amounts).
    The commission has already been collected from the buyer in the order total.
    We distribute the seller's net shares to them, platform keeps commission + delivery.
    
    `items`: iterable of (seller, seller_net_total Decimal).
    Returns (per_seller dict, sellers_total_net Decimal) where each
    seller entry is {seller, gross, commission, fee_slice, net}.
    
    Note: In the new buyer-pays model, 'commission' is zero because buyer already paid it.
    We keep the field for consistency with the split structure.
    """
    per_seller = {}
    sellers_total_net = Decimal('0.00')
    
    for seller, seller_net_total in items:
        seller_net_total = _q(seller_net_total)
        entry = per_seller.setdefault(seller.id, {
            'seller': seller,
            'gross': Decimal('0.00'),  # Seller's net (what they receive)
            'commission': Decimal('0.00'),  # No commission deducted anymore
        })
        entry['gross'] += seller_net_total
        sellers_total_net += seller_net_total
    
    for entry in per_seller.values():
        entry['gross'] = _q(entry['gross'])
        # Commission is zero in new model - buyer already paid it separately
        entry['commission'] = Decimal('0.00')
    
    return per_seller, sellers_total_net


def allocate_fee(per_seller, admin_gross, processing_fee):
    """Distribute Paystack gateway fee. Sellers pay nothing (buyer covers all).
    
    admin_gross: commission collected + delivery fee + platform items
    processing_fee: Paystack fee (buyer paid on top)
    
    Since buyer covers gateway fee (bearer_type='account'), sellers receive
    their full net share. Platform keeps admin_gross minus actual Paystack fee.
    """
    admin_gross = _q(admin_gross)
    
    for e in per_seller.values():
        e['fee_slice'] = Decimal('0.00')  # Sellers pay no gateway fee
        e['net'] = _q(e['gross'])  # Sellers receive full gross amount
    
    # Platform net before Paystack fee deduction
    return _q(admin_gross)


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


def create_transaction_split(*, name, seller_shares, bearer_share=None, metadata=None):
    """Create a per-order flat split with validation metadata.
    
    Args:
        name: Split name (e.g., "Jays Store order 123")
        seller_shares: [(subaccount_code, net_amount_decimal), ...]
        bearer_share: Expected platform share in GHS (for validation/logging only)
        metadata: Optional dict with split details for audit trail
    
    Returns:
        Paystack split response data (contains split_code, id, etc.)
    
    Note: Platform (bearer/main account) automatically receives the REMAINDER
    after subaccounts are paid. bearer_share parameter is for validation only;
    it doesn't affect Paystack's split logic (which always uses remainder).
    
    With bearer_type='account', platform receives:
        charged_total - sum(subaccount_shares) - paystack_processing_fee
    """
    _require_secret()
    subaccounts = [
        {'subaccount': code, 'share': int(_q(net) * 100)}
        for code, net in seller_shares
        if _q(net) > 0
    ]
    if not subaccounts:
        raise RuntimeError('No seller shares to split')
    
    # Log split details for debugging/verification
    total_to_sellers = sum(s['share'] for s in subaccounts) / 100.0
    logger.info(
        f'Creating Paystack split: {name} | '
        f'Sellers: {len(subaccounts)} subaccounts, {total_to_sellers:.2f} GHS | '
        f'Expected platform: {float(bearer_share) if bearer_share else "N/A":.2f} GHS | '
        f'Bearer type: account (platform pays fees, receives remainder)'
    )
    
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
        logger.error(f'Paystack split creation failed: {body.get("message", "Unknown error")}')
        raise RuntimeError(body.get('message', 'Paystack rejected the split'))
    
    logger.info(f'Split created successfully: {body["data"].get("split_code")}')
    return body['data']  # contains split_code, id, ...


# Paystack charge channels the storefront may offer (Ghana-first).
PAYSTACK_CHANNELS = ('card', 'mobile_money', 'bank_transfer', 'ussd', 'bank')


def initialize_plain_transaction(*, email, gross_total, reference, order_id, callback_url=None, channels=None):
    """Initialize a buyer charge with NO split (all-platform order)."""
    return initialize_split_transaction(
        email=email, gross_total=gross_total, reference=reference,
        split_code=None, order_id=order_id, callback_url=callback_url,
        channels=channels,
    )


def initialize_split_transaction(*, email, gross_total, reference, split_code, order_id, callback_url=None, channels=None):
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
    if channels:
        valid = [c for c in channels if c in PAYSTACK_CHANNELS]
        if valid:
            payload['channels'] = valid
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
