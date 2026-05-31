from django.db import models
from django.conf import settings
from apps.products.models import Product, ProductVariant


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

    # Pricing
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    # ↑ Sum of all order items before delivery fee

    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    # ↑ subtotal + delivery_fee

    # Driver earnings for this order
    driver_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    # ↑ How much the driver earns from this delivery

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
    def is_active(self):
        """Returns True if the order is still in progress."""
        return self.status in [self.Status.PENDING, self.Status.ACCEPTED, self.Status.PICKED_UP]


class OrderItem(models.Model):
    """
    Each item inside an order.
    An order can have multiple items from multiple sellers.
    """
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
    quantity = models.PositiveIntegerField(default=1)

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
        return self.product.effective_price * self.quantity


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