from decimal import Decimal

from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.products.models import Product, ProductVariant


class Coupon(models.Model):
    """
    Promo codes for discounts at checkout.
    """
    class DiscountType(models.TextChoices):
        PERCENTAGE = 'percentage', 'Percentage'
        FIXED = 'fixed', 'Fixed Amount'

    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(
        max_length=15,
        choices=DiscountType.choices,
        default=DiscountType.PERCENTAGE
    )
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    max_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'coupons'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.code} ({self.discount_value}{"%" if self.discount_type == self.DiscountType.PERCENTAGE else " GHS"})'

    def is_valid(self, subtotal=0):
        now = timezone.now()
        if not self.is_active:
            return False, "This coupon is no longer active"
        if self.valid_from and now < self.valid_from:
            return False, "This coupon is not yet valid"
        if self.valid_until and now > self.valid_until:
            return False, "This coupon has expired"
        if self.usage_limit and self.used_count >= self.usage_limit:
            return False, "This coupon usage limit has been reached"
        if subtotal < self.min_order_amount:
            return False, f"Minimum order amount of GHS {self.min_order_amount:.2f} required for this coupon"
        return True, "Valid"

    def calculate_discount(self, subtotal):
        valid, msg = self.is_valid(subtotal)
        if not valid:
            return 0.0
        if self.discount_type == self.DiscountType.PERCENTAGE:
            discount = float(subtotal) * (float(self.discount_value) / 100.0)
            if self.max_discount_amount:
                discount = min(discount, float(self.max_discount_amount))
            return round(discount, 2)
        else:
            discount = float(self.discount_value)
            return round(min(discount, float(subtotal)), 2)


class Order(models.Model):
    """
    An order is created when a buyer checks out their cart.
    It tracks the full lifecycle from placed to delivered.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        # ↑ Order placed, waiting for a driver to accept

        ACCEPTED = 'accepted', 'Accepted'
        # ↑ A driver has accepted the delivery

        PICKED_UP = 'picked_up', 'Picked Up'
        # ↑ Driver has picked up the order and is on the way

        DELIVERED = 'delivered', 'Delivered'
        # ↑ Order successfully delivered to buyer

        CANCELLED = 'cancelled', 'Cancelled'
        # ↑ Order cancelled by buyer or admin

        FAILED = 'failed', 'Failed'
        # ↑ Driver accepted but could not complete the delivery

    # Relations
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='orders'
    )
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deliveries'
    )
    # ↑ Null until a driver accepts the order

    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    # Delivery info — copied from buyer at time of order
    # We copy instead of referencing so it stays accurate even
    # if the buyer updates their address later
    delivery_address = models.TextField()
    delivery_phone = models.CharField(max_length=20)
    delivery_note = models.TextField(blank=True)
    # ↑ Optional note from buyer e.g. "Call when you arrive"
    delivery_landmark = models.CharField(max_length=255, blank=True, default='')
    # ↑ Nearest landmark to help the driver locate the buyer e.g. "Opposite Palace Mall"

    # Pricing & Discounts
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    # ↑ Sum of all order items before delivery fee and discounts

    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    # ↑ subtotal - discount_amount + delivery_fee (goods + delivery only)

    processing_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    # ↑ Paystack gateway fee, passed on to buyer + sellers (pro-rata).
    #   Buyer is charged total + processing_fee in a single Paystack charge.
    paystack_fee_actual = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # ↑ What Paystack REALLY deducted (pesewas→GHS from verify/webhook).
    #   Usually == processing_fee ±1 pesewa rounding; stored so the admin
    #   finance view shows the true platform net, not an estimate.

    # Payment info
    payment_method = models.CharField(
        max_length=30,
        choices=[
            ('paystack', 'Paystack (MoMo / Card)'),
            ('cash_on_delivery', 'Cash on Delivery'),
            ('momo', 'Mobile Money (MTN/Telecel/AT) — legacy'),
            ('card', 'Debit / Credit Card — legacy'),
        ],
        default='paystack'
    )
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('unpaid', 'Unpaid'),
            ('paid', 'Paid'),
            ('failed', 'Failed'),
            ('refunded', 'Refunded'),
        ],
        default='unpaid'
    )
    payment_reference = models.CharField(max_length=100, blank=True)
    paystack_reference = models.CharField(max_length=100, blank=True)
    paystack_split_code = models.CharField(max_length=100, blank=True, default='')
    # ↑ Paystack transaction-split code created per order (SPL_...) so each
    #   seller's net share settles straight to their subaccount instantly.
    paid_at = models.DateTimeField(null=True, blank=True)

    # Code on Delivery PIN
    delivery_pin = models.CharField(max_length=4, blank=True, null=True)
    pin_verified = models.BooleanField(default=False)

    # Driver earnings — NOT in the system for now. Drivers are paid physically
    # by the admin out-of-band. Always stored as 0; delivery fee goes to admin.
    driver_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # Commission rate applied at time of purchase
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.10)
    # ↑ How much the driver earns from this delivery
    
    # Commission collected from buyer (buyer-pays-commission model)
    commission_collected = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    # ↑ Total commission markup collected from buyer (difference between buyer-paid
    #   and seller-net prices). Calculated at order creation for accurate reporting
    #   and payment split calculations. Platform receives this + delivery fee.

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    # ↑ When the driver accepted
    delivered_at = models.DateTimeField(null=True, blank=True)
    # ↑ When the order was marked as delivered

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']

    def __str__(self):
        return f'Order #{self.id} — {self.buyer} — {self.status}'

    @property
    def charged_total(self):
        """What the buyer actually pays on Paystack: goods + delivery + gateway fee."""
        return (self.total or Decimal('0.00')) + (self.processing_fee or Decimal('0.00'))

    @property
    def is_active(self):
        """Returns True if the order is still in progress."""
        return self.status in [self.Status.PENDING, self.Status.ACCEPTED, self.Status.PICKED_UP]


class OrderItem(models.Model):
    """
    Each item inside an order.
    An order can have multiple items from multiple sellers.
    """
    # Commission rate at time of purchase (for audit / claw-back)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        related_name='order_items'
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        null=True,
        related_name='order_items'
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='order_items'
    )
    # ↑ We store the seller directly on the item so we can track
    #   seller revenue even if the product is later deleted

    # We snapshot price at time of order so historical data stays accurate
    # even if the product price changes later
    product_name = models.CharField(max_length=200)
    product_image = models.URLField(blank=True)
    size = models.CharField(max_length=20)
    color = models.CharField(max_length=50)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    # ↑ What buyer paid per unit (includes commission markup)
    seller_net_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    # ↑ What seller receives per unit (their listed net price)
    quantity = models.PositiveIntegerField(default=1)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.10)
    # ↑ Commission rate at time of purchase (for historical accuracy)

    class Meta:
        db_table = 'order_items'

    def __str__(self):
        return f'{self.product_name} x{self.quantity}'

    @property
    def total_price(self):
        return self.unit_price * self.quantity


class Cart(models.Model):
    """
    A buyer's active shopping cart.
    One cart per buyer at a time.
    """
    buyer = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart'
    )
    # ↑ OneToOneField means each buyer has exactly one cart

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'carts'

    def __str__(self):
        return f'Cart — {self.buyer.email}'

    @property
    def total(self):
        """Total cart value (includes commission markup - buyer-facing amount)."""
        return sum(item.total_price for item in self.cart_items.all())

    @property
    def item_count(self):
        """Total number of individual items in the cart."""
        return sum(item.quantity for item in self.cart_items.all())


class CartItem(models.Model):
    """
    A single product variant inside a cart.
    """
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='cart_items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='cart_items'
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name='cart_items'
    )
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cart_items'
        unique_together = ['cart', 'variant']
        # ↑ Can't add the same variant twice — we update quantity instead

    def __str__(self):
        return f'{self.product.name} x{self.quantity}'

    @property
    def total_price(self):
        """Buyer pays display price (includes commission markup)."""
        return self.product.display_price * self.quantity


class DeliveryRating(models.Model):
    """
    Buyer rates the driver after a successful delivery.
    Scale of 1 to 5.
    """
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name='delivery_rating'
    )
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ratings_received'
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ratings_given'
    )
    rating = models.PositiveSmallIntegerField()
    # ↑ 1 to 5 stars
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'delivery_ratings'

    def __str__(self):
        return f'Rating for Order #{self.order.id} — {self.rating}★'

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            self.driver.update_driver_rating(self.rating)


class Payout(models.Model):
    """
    Seller withdrawal requests. Platform takes 10% commission;
    sellers withdraw the remaining 90% to MoMo / bank.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        PAID = 'paid', 'Paid'
        REJECTED = 'rejected', 'Rejected'

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payouts'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    momo_number = models.CharField(max_length=20)
    momo_network = models.CharField(
        max_length=20,
        choices=[
            ('mtn', 'MTN MoMo'),
            ('telecel', 'Telecel Cash'),
            ('at', 'AirtelTigo Money'),
            ('bank', 'Bank Transfer'),
        ],
        default='mtn'
    )
    account_name = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    admin_note = models.TextField(blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payouts'
        ordering = ['-requested_at']

    def __str__(self):
        return f'Payout #{self.id} — {self.seller.email} — GHS {self.amount} ({self.status})'


class DeliveryOTPLog(models.Model):
    """
    OTP sent to buyer for delivery confirmation.
    Driver verifies with buyer before marking delivered.
    OTP is hashed and expires after 15 minutes.
    """
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name='otp_log'
    )
    otp_hash = models.CharField(max_length=128)
    otp_created_at = models.DateTimeField(auto_now_add=True)
    otp_expires_at = models.DateTimeField()
    buyer_notified = models.BooleanField(default=False)
    buyer_notified_at = models.DateTimeField(null=True, blank=True)
    buyer_notification_method = models.CharField(max_length=20, blank=True, default='email')
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    sms_sent = models.BooleanField(default=False)
    sms_sent_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveIntegerField(default=0)
    is_locked = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'delivery_otp_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f'OTP for Order #{self.order.id} — {"Verified" if self.is_verified else "Pending"}'


class EmailLog(models.Model):
    """Every system email, with its outcome.

    Silent email failures caused real confusion ("no email arrived, did
    payment work?"). Now each send leaves a row the admin can inspect.
    """
    KIND_CHOICES = [
        ('payment_confirmation', 'Payment confirmation'),
        ('delivery_otp', 'Delivery OTP'),
        ('seller_alert', 'Seller sale alert'),
        ('admin_alert', 'Admin payment alert'),
        ('delivered', 'Delivered notice'),
    ]

    to_email = models.EmailField(max_length=254, blank=True, default='')
    subject = models.CharField(max_length=200, blank=True, default='')
    kind = models.CharField(max_length=30, blank=True, default='')
    order = models.ForeignKey(
        Order, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='email_logs',
    )
    ok = models.BooleanField(default=False)
    error = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'email_logs'
        ordering = ['-created_at']

    def __str__(self):
        status = 'OK' if self.ok else f'FAILED: {self.error[:60]}'
        return f'Email {self.kind} → {self.to_email} ({status})'


PLATFORM_COMMISSION_RATE = 0.10


class Settlement(models.Model):
    """
    Per-seller share of a Paystack split payment.
    Paystack settles net_share straight to the seller's subaccount at charge
    time — the platform never holds the seller's money. This table is the
    local record of what was settled (powers seller earnings history).
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SETTLED = 'settled', 'Settled'
        FAILED = 'failed', 'Failed'

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='settlements'
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='settlements'
    )
    subaccount_code = models.CharField(max_length=50, blank=True, default='')
    gross_share = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    # ↑ Seller's item total in this order, before commission and gateway fee
    commission = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    # ↑ 10% platform cut taken off the seller's share
    fee_slice = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    # ↑ Seller's pro-rata slice of the Paystack gateway fee
    net_share = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    # ↑ What Paystack settles to the seller: gross - commission - fee_slice
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    paystack_reference = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    settled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'settlements'
        ordering = ['-created_at']

    def __str__(self):
        return f'Settlement order #{self.order_id} → {self.seller} GHS {self.net_share} ({self.status})'


def calculate_delivery_fee(total_items):
    """
    Tiered delivery fee in GHS based on number of items ordered:
      1-5 items  ->  5 GHS
      6-10 items -> 10 GHS
      11+ items  -> 20 GHS
    """
    if total_items <= 5:
        return Decimal('5.00')
    elif total_items <= 10:
        return Decimal('10.00')
    return Decimal('20.00')