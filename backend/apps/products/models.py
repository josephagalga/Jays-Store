from django.db import models
from django.conf import settings


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    external_url = models.URLField(blank=True)
    # ↑ Store external image URLs like Unsplash directly
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def image_url(self):
        if self.external_url:
            return self.external_url
        if self.image:
            return self.image.url
        return None


class SubCategory(models.Model):
    """
    Sub categories e.g. Shirts, Trousers, Dresses, Sneakers
    Each belongs to a parent Category
    """
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='subcategories'
    )
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subcategories'
        verbose_name_plural = 'SubCategories'
        ordering = ['name']

    def __str__(self):
        return f'{self.category.name} → {self.name}'


class Product(models.Model):
    """
    A product is a clothing item listed by the admin.
    e.g. "Nike Air Force 1" or "Slim Fit Chinos"
    """

    class Gender(models.TextChoices):
        MEN = 'men', 'Men'
        WOMEN = 'women', 'Women'
        KIDS = 'kids', 'Kids'
        UNISEX = 'unisex', 'Unisex'

    # Core info
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField()
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name='products'
    )
    subcategory = models.ForeignKey(
        SubCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products'
    )
    gender = models.CharField(max_length=10, choices=Gender.choices, default=Gender.UNISEX)
    brand = models.CharField(max_length=100, blank=True)

    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2)
    # ↑ Seller's net price (what they want to receive per sale)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # ↑ If set, this is the discounted net price (commission still added on top for buyers)
    
    # Commission rate snapshot — captured at product creation/update time
    commission_rate_snapshot = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Commission rate locked at listing time. Null = use seller's current rate."
    )
    # ↑ If null, product follows seller's current commission rate (allows retroactive updates)
    # ↑ If set, this specific rate is locked for this product

    # Status
    is_active = models.BooleanField(default=True)
    # ↑ Admin can deactivate a product without deleting it

    is_featured = models.BooleanField(default=False)
    # ↑ Featured products appear on the homepage

    is_demo = models.BooleanField(default=False, db_index=True)
    # ↑ Demo/showcase catalog (seeded): visible everywhere but NEVER buyable.
    #   Real vendor uploads always have is_demo=False.

    # Analytics
    total_sold = models.PositiveIntegerField(default=0)
    # ↑ Incremented each time an order for this product completes

    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_ratings = models.PositiveIntegerField(default=0)

    # AI helpers — these fields help Gemini understand and recommend products
    tags = models.CharField(max_length=500, blank=True)
    # ↑ Comma separated keywords e.g. "casual, summer, lightweight, cotton"
    #   Gemini uses these to match products to user queries

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='products'
    )
    # ↑ This can be either an admin or a seller
    #   If the user is deleted, we keep the product but set this to null

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='store_products'
    )
    # ↑ If a seller listed this product, this points to them
    #   Admin-listed products will have this as null
    #   This is what powers each seller's individual store page

    class Meta:
        db_table = 'products'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def effective_price(self):
        """Returns seller's net price (discount if set, otherwise regular price).
        
        This is the amount the seller receives per sale.
        For buyer-facing prices, use display_price instead.
        """
        return self.discount_price if self.discount_price else self.price
    
    @property
    def commission_rate_effective(self):
        """Fixed two-tier commission (based on seller's net price).

        - Net < 100.00 GHS: 10% commission
        - Net >= 100.00 GHS: 5% commission
        - Platform-owned products: 0% (no commission)

        The old per-seller rate and snapshot overrides are retired:
        commission_rate_snapshot is ignored (kept in DB for history only).
        """
        from decimal import Decimal

        # Get seller to check if this is a seller product
        seller = self.seller or self.created_by

        if seller and seller.role == 'seller':
            base_price = self.effective_price  # Seller's net price (includes discount if applicable)
            if base_price >= Decimal('100.00'):
                return Decimal('5.00')
            return Decimal('10.00')

        # Platform-listed products have no commission
        return Decimal('0.00')
    
    @property
    def display_price(self):
        """Price shown to buyers (includes commission markup).
        
        Calculation: seller's net price × (1 + commission_rate/100)
        This is what buyers see and pay.
        """
        from decimal import Decimal, ROUND_HALF_UP
        
        base_price = self.discount_price if self.discount_price else self.price
        rate = self.commission_rate_effective
        
        if rate > 0:
            multiplier = Decimal('1.00') + (rate / Decimal('100.00'))
            return (base_price * multiplier).quantize(Decimal('0.01'), ROUND_HALF_UP)
        
        return base_price
    
    @property
    def display_discount_price(self):
        """Discounted price shown to buyers (if discount active, includes commission)."""
        from decimal import Decimal, ROUND_HALF_UP
        
        if not self.discount_price:
            return None
        
        rate = self.commission_rate_effective
        
        if rate > 0:
            multiplier = Decimal('1.00') + (rate / Decimal('100.00'))
            return (self.discount_price * multiplier).quantize(Decimal('0.01'), ROUND_HALF_UP)
        
        return self.discount_price
    
    @property
    def commission_amount(self):
        """Commission per unit (what buyer pays on top of seller's price)."""
        base_price = self.discount_price if self.discount_price else self.price
        return self.display_price - base_price

    @property
    def discount_percentage(self):
        """Returns the discount percentage if a discount price is set."""
        if self.discount_price and self.price > 0:
            return round(((self.price - self.discount_price) / self.price) * 100)
        return 0

    def update_rating(self, new_rating):
        self.total_ratings += 1
        self.average_rating = (
            (self.average_rating * (self.total_ratings - 1)) + new_rating
        ) / self.total_ratings
        self.save(update_fields=['average_rating', 'total_ratings'])

    def recalc_rating(self):
        """Recompute stats from visible reviews (use after hide/show/delete)."""
        from django.db.models import Avg, Count
        agg = self.reviews.filter(is_visible=True).aggregate(
            avg=Avg('rating'), count=Count('id'))
        self.average_rating = agg['avg'] or 0
        self.total_ratings = agg['count'] or 0
        self.save(update_fields=['average_rating', 'total_ratings'])


class ProductVariant(models.Model):
    """
    A variant is a specific size/color combination of a product.
    e.g. Nike Air Force 1 → Size 42, Color White → stock: 5
    This is what actually gets ordered, not the product itself.
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='variants'
    )
    size = models.CharField(max_length=20)
    # ↑ e.g. "S", "M", "L", "XL" or "40", "41", "42" for shoes
    color = models.CharField(max_length=50)
    color_hex = models.CharField(max_length=7, blank=True)
    # ↑ e.g. "#FFFFFF" — used to render a color swatch on the frontend
    image = models.ImageField(upload_to='variants/', blank=True, null=True)
    # ↑ Optional per-variant image (e.g. photo of the Red colourway).
    #   Falls back to the product's primary image when empty.
    stock = models.PositiveIntegerField(default=0)
    # ↑ How many of this exact variant are in stock

    class Meta:
        db_table = 'product_variants'
        unique_together = ['product', 'size', 'color']
        # ↑ Can't have two identical size+color combos for the same product

    def __str__(self):
        return f'{self.product.name} | {self.size} | {self.color}'

    @property
    def image_url(self):
        if self.image:
            try:
                return self.image.url
            except Exception:
                return None
        return None

    @property
    def is_in_stock(self):
        return self.stock > 0


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    external_url = models.URLField(blank=True)
    # ↑ Store external image URLs like Unsplash directly
    is_primary = models.BooleanField(default=False)
    alt_text = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'product_images'
        ordering = ['order']

    def __str__(self):
        return f'{self.product.name} | Image {self.order}'

    @property
    def url(self):
        if self.external_url:
            return self.external_url
        if self.image:
            return self.image.url
        return None


class Wishlist(models.Model):
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wishlist_items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='wishlisted_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'wishlists'
        unique_together = ['buyer', 'product']
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.buyer.email} -> {self.product.name}'


# Signal to capture commission rate snapshot on product creation

