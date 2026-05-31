from django.db import models
from django.conf import settings


class Category(models.Model):
    """
    Top level categories e.g. Men, Women, Kids
    """
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    # ↑ slug is a URL-friendly version of the name e.g. "mens-clothing"
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


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
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # ↑ If set, this is the sale price shown to buyers

    # Status
    is_active = models.BooleanField(default=True)
    # ↑ Admin can deactivate a product without deleting it

    is_featured = models.BooleanField(default=False)
    # ↑ Featured products appear on the homepage

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
        """Returns discount price if set, otherwise regular price."""
        return self.discount_price if self.discount_price else self.price

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
    stock = models.PositiveIntegerField(default=0)
    # ↑ How many of this exact variant are in stock

    class Meta:
        db_table = 'product_variants'
        unique_together = ['product', 'size', 'color']
        # ↑ Can't have two identical size+color combos for the same product

    def __str__(self):
        return f'{self.product.name} | {self.size} | {self.color}'

    @property
    def is_in_stock(self):
        return self.stock > 0


class ProductImage(models.Model):
    """
    A product can have multiple images.
    One is marked as the primary/cover image.
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(upload_to='products/')
    is_primary = models.BooleanField(default=False)
    # ↑ The primary image is shown in product listings/cards
    alt_text = models.CharField(max_length=200, blank=True)
    # ↑ Descriptive text for accessibility and SEO
    order = models.PositiveIntegerField(default=0)
    # ↑ Controls the display order of images in the gallery

    class Meta:
        db_table = 'product_images'
        ordering = ['order']

    def __str__(self):
        return f'{self.product.name} | Image {self.order}'