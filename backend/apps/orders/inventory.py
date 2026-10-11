"""Unpaid stock holds: reserve at placement, convert at payment, release
on cancel/fail/expiry. All writes are guarded F() updates; row locks make
check-then-write atomic. Demo and made-to-order lines never hold (demo is
unbuyable, MTO has no stock concept)."""
from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.utils import timezone

HOLD_TTL = timedelta(minutes=30)


class OutOfStock(Exception):
    """Raised when reserved/available stock can't cover an order."""

    def __init__(self, names):
        self.names = names
        super().__init__('Out of stock: ' + ', '.join(names))


def _tracked(item):
    """Lines that consume physical stock (skip demo + made-to-order)."""
    product = getattr(item, 'product', None)
    variant = getattr(item, 'variant', None)
    if not variant or not product:
        return False
    if getattr(product, 'is_demo', False):
        return False
    if getattr(product, 'fulfillment', 'stock') == 'made_to_order':
        return False
    return True


def available_of(variant):
    return max(0, (variant.stock or 0) - (variant.held_stock or 0))


@transaction.atomic
def reserve_lines(order):
    """Hold stock for every tracked line. All-or-nothing: on any shortfall,
    holds taken in this call are released and OutOfStock is raised."""
    from apps.products.models import ProductVariant

    items = list(order.items.select_related('variant', 'product').all())
    held = []
    try:
        for item in items:
            if not _tracked(item):
                continue
            vid = item.variant.pk
            # Lock the row so concurrent placements serialize here.
            variant = ProductVariant.objects.select_for_update().get(pk=vid)
            if available_of(variant) < item.quantity:
                raise OutOfStock([item.product_name])
            ProductVariant.objects.filter(pk=vid).update(
                held_stock=F('held_stock') + item.quantity)
            held.append((vid, item.quantity))
    except OutOfStock:
        for vid, qty in held:
            ProductVariant.objects.filter(pk=vid, held_stock__gte=qty).update(
                held_stock=F('held_stock') - qty)
        raise
    order.hold_expires_at = timezone.now() + HOLD_TTL
    order.save(update_fields=['hold_expires_at'])


@transaction.atomic
def release_order_holds(order):
    """Give back every hold this order owns. Idempotent via hold_expires_at:
    releasing clears the marker, so a second run is a no-op."""
    from apps.products.models import ProductVariant

    order = type(order).objects.select_for_update().get(pk=order.pk)
    if order.hold_expires_at is None:
        # Never held (MTO/demo-only, reserve shortfall, or already
        # released/converted). Returning early keeps a second run from
        # subtracting another order's holds and clamping to 0.
        return
    for item in order.items.select_related('variant', 'product').all():
        if not _tracked(item):
            continue
        ProductVariant.objects.filter(pk=item.variant.pk).update(
            held_stock=F('held_stock') - item.quantity)
        ProductVariant.objects.filter(
            pk=item.variant.pk, held_stock__lt=0).update(held_stock=0)
    order.hold_expires_at = None
    order.save(update_fields=['hold_expires_at'])


@transaction.atomic
def convert_order_holds(order):
    """Turn holds into real deductions at payment confirmation.

    Locks every touched variant, verifies cover, then moves held→sold.
    Raises OutOfStock (data-repair edge only — placement already reserved)
    instead of charging for missing goods.
    """
    from apps.products.models import ProductVariant

    items = [i for i in order.items.select_related('variant', 'product').all()
             if _tracked(i)]
    if not items:
        order.hold_expires_at = None
        order.save(update_fields=['hold_expires_at'])
        return
    locked = {
        v.pk: v for v in ProductVariant.objects.select_for_update().filter(
            pk__in=[i.variant.pk for i in items])
    }
    short = [i.product_name for i in items
             if available_of(locked[i.variant.pk]) < i.quantity]
    if short:
        raise OutOfStock(short)
    for item in items:
        ProductVariant.objects.filter(pk=item.variant.pk).update(
            stock=F('stock') - item.quantity,
            held_stock=F('held_stock') - item.quantity,
        )
        ProductVariant.objects.filter(
            pk=item.variant.pk, held_stock__lt=0).update(held_stock=0)
    order.hold_expires_at = None
    order.save(update_fields=['hold_expires_at'])


def release_expired_holds(now=None):
    """Sweeper: release holds on unpaid orders past their hold expiry."""
    from apps.orders.models import Order

    now = now or timezone.now()
    count = 0
    for order in Order.objects.filter(
            payment_status='unpaid', hold_expires_at__lt=now):
        release_order_holds(order)
        count += 1
    return count


@transaction.atomic
def ensure_holds(order, now=None):
    """Re-reserve if this unpaid order's holds lapsed (expired + swept, or
    never held). Active holds are left alone so retry never double-holds.

    Raises OutOfStock when stock no longer covers the order — callers turn
    that into a clean 400 (cancel + reorder) instead of charging then
    auto-refunding at confirm time. No-op for MTO/demo-only orders."""
    from apps.orders.models import Order as _Order

    now = now or timezone.now()
    order = _Order.objects.select_for_update().get(pk=order.pk)
    if order.hold_expires_at is not None and order.hold_expires_at > now:
        return
    if order.hold_expires_at is not None:
        release_order_holds(order)
    reserve_lines(order)
