"""Email helpers: payment confirmations, delivery OTP and receipts.

All sends are wrapped so a mail failure never breaks checkout/delivery.
In local dev EMAIL_BACKEND defaults to console, so messages print to the
Django terminal instead of sending real mail.
"""
import logging
import time

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)


def _send(to_email, subject, message, html_message=None, kind='', order=None,
          connection=None, _retried=False):
    """Send one email and RECORD the outcome in EmailLog.

    Failures never raise (checkout/delivery must not break), but they are
    now impossible to miss: full stack trace in server logs + a row the
    admin can inspect at GET /admin/email-logs/.

    Gmail's SMTP intermittently drops rapid back-to-back sends
    ("Connection unexpectedly closed"), so on a first failure we retry
    once with a fresh connection after a short pause.
    """
    if not to_email:
        _log_email(to_email or '', subject, kind, order, False, 'no recipient address')
        return False
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@jaysstore.com'),
            recipient_list=[to_email],
            html_message=html_message,
            fail_silently=False,
            connection=connection,
        )
        _log_email(to_email, subject, kind, order, True, '')
        return True
    except Exception as exc:  # never break checkout because of mail
        if not _retried:
            logger.warning('Email "%s" to %s failed (%s) — retrying once',
                           subject, to_email, exc)
            try:
                if connection is not None:
                    try:
                        connection.close()
                    except Exception:
                        pass
                time.sleep(2)
                return _send(to_email, subject, message, html_message,
                             kind, order, connection=None, _retried=True)
            except Exception:
                pass
        logger.exception('Email "%s" to %s failed', subject, to_email)
        _log_email(to_email, subject, kind, order, False, str(exc)[:500])
        return False


def _log_email(to_email, subject, kind, order, ok, error):
    try:
        from .models import EmailLog
        EmailLog.objects.create(
            to_email=to_email or '',
            subject=(subject or '')[:200],
            kind=kind or '',
            order=order,
            ok=ok,
            error=error or '',
        )
    except Exception as exc:
        logger.warning('Could not write EmailLog: %s', exc)


def order_lines(order):
    lines = []
    for item in order.items.all():
        lines.append(
            f'- {item.product_name} ({item.size} / {item.color}) x{item.quantity} — '
            f'GHS {float(item.unit_price) * item.quantity:.2f}'
        )
    return '\n'.join(lines)


def _buyer_email(order):
    return (getattr(order, 'buyer_email', '') or '').strip()


def send_payment_confirmation(order, otp_code=None, connection=None):
    """Buyer receipt + payment confirmation. Called on every successful payment."""
    buyer_email = _buyer_email(order)
    if not buyer_email:
        return False
    subject = f"My Jay's Store — Payment confirmed for Order #{order.id}"
    fee = float(getattr(order, 'processing_fee', 0) or 0)
    charged = float(order.total) + fee
    # Guests track via public reference link (no account needed).
    track_path = (
        f"/track/{order.paystack_reference}"
        if order.is_guest_order and order.paystack_reference
        else f"/orders/{order.id}/track"
    )
    track_url = f"{getattr(settings, 'FRONTEND_URL', '').rstrip('/')}{track_path}"
    body = (
        f"Hi {order.buyer_first_name},\n\n"
        f"Your payment of GHS {charged:.2f} for Order #{order.id} was confirmed.\n\n"
        f"{order_lines(order)}\n\n"
        f"Subtotal: GHS {float(order.subtotal):.2f}\n"
        f"Delivery fee: GHS {float(order.delivery_fee):.2f}\n"
        + (f"Processing fee: GHS {fee:.2f}\n" if fee > 0 else '')
        + f"Total charged: GHS {charged:.2f} via {order.payment_method}\n\n"
        f"Deliver to: {order.delivery_address}\n"
        f"Phone: {order.delivery_phone}\n"
        + (f"Nearest landmark: {order.delivery_landmark}\n" if getattr(order, 'delivery_landmark', '') else '')
        + (f"Note: {order.delivery_note}\n" if order.delivery_note else '')
        + (f"\nYour delivery OTP is {otp_code}. Give it to the driver on arrival.\n" if otp_code else '')
        + f"\nTrack your order: {track_url}\n\n"
        f"Thank you for shopping with My Jay's Store!"
    )
    html = (
        f"<h2>Payment confirmed — Order #{order.id}</h2>"
        f"<p>Hi {order.buyer_first_name}, your payment of "
        f"<strong>GHS {charged:.2f}</strong> was confirmed.</p>"
        + (f"<p style='font-size:20px'>Delivery OTP: <strong>{otp_code}</strong></p>"
           f"<p>Give this 4-digit code to your driver on arrival.</p>" if otp_code else '')
        + f"<p><a href='{track_url}'>"
        f"View receipt & track order</a></p>"
    )
    return _send(buyer_email, subject, body, html, kind='payment_confirmation', order=order,
                connection=connection)


def send_delivery_otp(order, otp_code, connection=None):
    """OTP email to the buyer (SMS is simulated — email is the real channel)."""
    buyer_email = _buyer_email(order)
    if not buyer_email:
        return False
    subject = f"My Jay's Store — Your delivery OTP for Order #{order.id}"
    body = (
        f"Hi {order.buyer_first_name},\n\n"
        f"Your delivery OTP for Order #{order.id} is: {otp_code}\n\n"
        f"Give this 4-digit code to the driver when they arrive. "
        f"They cannot mark your order as delivered without it.\n\n"
        f"Deliver to: {order.delivery_address}\n"
        f"Track: {getattr(settings, 'FRONTEND_URL', '').rstrip('/')}/orders/{order.id}/track"
    )
    return _send(buyer_email, subject, body, kind='delivery_otp', order=order,
                connection=connection)


def send_seller_sale_alert(order, connection=None):
    """Notify each vendor of their sale — payout only, no platform money details.

    Flow: buyer pays -> admin gets the payment alert -> system informs
    the seller of THEIR expected payout. Seller never sees buyer totals,
    commission breakdown, gateway fees, or other sellers.
    """
    # Expected payout per seller from the split settlements (fallback: recompute).
    nets = {}
    try:
        for s in order.settlements.all():
            if s.seller_id:
                nets[s.seller_id] = s
    except Exception:
        nets = {}
    sent = 0
    seller_items = {}
    for item in order.items.select_related('seller').all():
        seller = item.seller
        if not seller or not seller.email or seller.role != 'seller':
            continue
        seller_items.setdefault(seller.id, {'seller': seller, 'items': []})
        seller_items[seller.id]['items'].append(item)

    breakdown = getattr(order, 'delivery_breakdown', None) or {}
    for entry in seller_items.values():
        seller = entry['seller']
        items = entry['items']
        s = nets.get(seller.id)
        if s is not None:
            # Use settlement record (most accurate, includes self-delivery fee)
            net = float(s.net_share)
            delivery_fee = float(getattr(s, 'delivery_share', 0) or 0)
        else:
            # Fallback: calculate from seller_net_price (correct for buyer-pays model)
            net = sum(float(i.seller_net_price) * i.quantity for i in items)
            delivery_fee = 0.0
        self_delivers = ((breakdown.get(str(seller.id)) or {}).get('mode')) == 'self'
        subject = f"My Jay's Store — New sale! Order #{order.id}"
        lines = '\n'.join(
            f'- {i.product_name} ({i.size} / {i.color}) x{i.quantity}'
            for i in items
        )
        if self_delivers and delivery_fee > 0:
            payout_note = (
                f"Your expected payout: GHS {net:.2f} "
                f"(includes your GHS {delivery_fee:.2f} delivery fee).\n"
            )
            handoff_note = (
                "You deliver these items YOURSELF — please deliver to the buyer "
                "and confirm the handoff in your Seller Dashboard with the buyer's "
                "delivery OTP.\n\n"
            )
        else:
            payout_note = f"Your expected payout: GHS {net:.2f}\n"
            handoff_note = (
                "A driver will pick up from your store — please have the items ready.\n\n"
            )
        body = (
            f"Hi {seller.store_name or seller.first_name},\n\n"
            f"You have a new sale in Order #{order.id}:\n{lines}\n\n"
            + payout_note +
            f"Payment has been received by My Jay's Store and your share "
            f"settles to your payout account. Track it in Seller Dashboard "
            f"under Settlements.\n\n"
            + handoff_note +
            f"My Jay's Store"
        )
        if _send(seller.email, subject, body, kind='seller_alert', order=order,
                 connection=connection):
            sent += 1
    return sent


def send_admin_payment_alert(order, connection=None):
    """Notify the store owner of THEIR money: commission + delivery fee.
    
    Shows complete breakdown of the payment split so admin knows exactly
    what they received from Paystack.
    """
    from decimal import Decimal
    
    admin_email = (getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', '') or '').strip()
    if not admin_email:
        return False
    
    # Calculate actual commission from order (use stored value or calculate from items)
    if hasattr(order, 'commission_collected') and order.commission_collected > 0:
        commission_collected = order.commission_collected
    else:
        # Fallback: calculate from order items
        commission_collected = sum(
            (item.unit_price - item.seller_net_price) * item.quantity 
            for item in order.items.all()
        )
    
    settlements = list(order.settlements.select_related('seller').all())
    lines = []
    sellers_total = Decimal('0.00')
    
    for s in settlements:
        name = (s.seller.store_name if s.seller and s.seller.store_name
                else (s.seller.email if s.seller else 'platform item'))
        lines.append(
            f'  - {name}: GHS {float(s.net_share):.2f} '
            f'(subaccount: {s.subaccount_code[:20]}...) [{s.status}]'
        )
        sellers_total += s.net_share
    
    fee = float(getattr(order, 'processing_fee', 0) or 0)
    charged = float(order.total) + fee
    self_delivery = float(getattr(order, 'self_delivery_total', 0) or 0)
    platform_delivery = float(order.delivery_fee) - self_delivery

    # Calculate what platform receives: commission + PLATFORM delivery only.
    # Self-delivery fees bypass the platform and settle straight to sellers.
    # In bearer_type='account', platform keeps full commission + platform delivery.
    platform_receives = float(commission_collected) + platform_delivery
    
    subject = f"💰 My Jay's Store — Payment Received! Order #{order.id}"
    body = (
        f"Payment confirmed for Order #{order.id}\n\n"
        f"{'='*60}\n"
        f"MONEY BREAKDOWN\n"
        f"{'='*60}\n\n"
        
        f"Buyer charged total: GHS {charged:.2f}\n"
        f"  • Items + delivery: GHS {float(order.total):.2f}\n"
        f"  • Processing fee: GHS {fee:.2f}\n\n"
        
        f"Payment split:\n"
        f"  • To sellers (products): GHS {float(sellers_total):.2f}\n"
        f"  • Commission (yours): GHS {float(commission_collected):.2f}\n"
        f"  • Platform delivery (yours): GHS {platform_delivery:.2f}\n"
        f"  • Self-delivery to sellers: GHS {self_delivery:.2f}\n"
        f"  • Processing fee (Paystack): GHS {fee:.2f}\n\n"

        f"{'='*60}\n"
        f"💵 YOU RECEIVE: GHS {platform_receives:.2f}\n"
        f"{'='*60}\n"
        f"   (Commission + Platform delivery)\n\n"
        
        f"Paystack will deposit this to your main account within 24 hours.\n"
        f"Check settlements: https://dashboard.paystack.com/#/settlements\n\n"
        
        f"{'-'*60}\n"
        f"Verification Instructions\n"
        f"{'-'*60}\n"
        f"Within 24 hours, check your Paystack settlements at the link above.\n"
        f"Expected deposit to main account: GHS {platform_receives:.2f}\n"
        f"If amount differs, contact support with split code below.\n\n"
        f"Note: Paystack automatically sends the platform share (commission + delivery)\n"
        f"to your main account as the 'remainder' after paying seller subaccounts.\n\n"
        
        f"{'-'*60}\n"
        f"Seller Settlement Details\n"
        f"{'-'*60}\n"
        + ('\n'.join(lines) if lines else '  (No vendor items - all platform products)\n') + '\n\n'
        
        f"{'-'*60}\n"
        f"Order Details\n"
        f"{'-'*60}\n"
        f"Buyer: {order.buyer_display_name} ({order.buyer_email or 'no email'})\n"
        f"Phone: {order.delivery_phone}\n"
        f"Address: {order.delivery_address}\n"
        + (f"Landmark: {order.delivery_landmark}\n" if getattr(order, 'delivery_landmark', '') else '')
        + (f"Note: {order.delivery_note}\n" if order.delivery_note else '')
        + f"\nPaystack reference: {order.paystack_reference}\n"
        f"Split code: {order.paystack_split_code or 'N/A (all platform items)'}\n"
    )
    return _send(admin_email, subject, body, kind='admin_alert', order=order,
                connection=connection)


def send_stale_escalation(order, waiting_hours, connection=None):
    """Alert the admin that a paid driverless order has waited too long.

    Never raises — the caller logs failures via EmailLog rows.
    """
    admin_email = (getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', '') or '').strip()
    if not admin_email:
        return False
    from .models import SellerHandoff
    pending = SellerHandoff.objects.filter(
        order=order, confirmed_at__isnull=True).select_related('seller')
    if pending.exists():
        sellers_state = '\n'.join(
            f"  - {(h.seller.store_name if h.seller and h.seller.store_name else 'A seller')}: "
            f"self-delivery handoff PENDING"
            for h in pending
        )
    else:
        sellers_state = '  (no self-delivery sellers waiting — driver simply never accepted)'
    charged = float(order.total or 0) + float(order.processing_fee or 0)
    subject = f"My Jay's Store — Order #{order.id} needs a driver ({waiting_hours:.0f}h waiting)"
    body = (
        f"A paid order has been waiting for a driver for {waiting_hours:.0f} hours.\n\n"
        f"Order #{order.id} — {order.buyer_display_name} ({order.buyer_email or 'no email'})\n"
        f"Buyer charged: GHS {charged:.2f}\n"
        f"Deliver to: {order.delivery_address}\n"
        f"Phone: {order.delivery_phone}\n"
        + (f"Landmark: {order.delivery_landmark}\n" if getattr(order, 'delivery_landmark', '') else '')
        + f"\nSeller handoffs:\n{sellers_state}\n\n"
        f"Action: assign a driver manually or contact the buyer. "
        f"This alert fires once per order.\n\n"
        f"My Jay's Store"
    )
    return _send(admin_email, subject, body, kind='stale_escalation', order=order,
                connection=connection)


def send_delivered_email(order, connection=None):
    buyer_email = _buyer_email(order)
    if not buyer_email:
        return False
    subject = f"My Jay's Store — Order #{order.id} delivered"
    body = (
        f"Hi {order.buyer_first_name},\n\n"
        f"Your Order #{order.id} was delivered at "
        f"{timezone.now().strftime('%d %b %Y, %H:%M')}.\n\n"
        f"Enjoy! Please leave a review for your items in My Orders.\n\n"
        f"My Jay's Store"
    )
    return _send(buyer_email, subject, body, kind='delivered', order=order,
                connection=connection)
