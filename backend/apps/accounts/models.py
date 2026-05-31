from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class CustomUserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        BUYER = 'buyer', 'Buyer'
        DRIVER = 'driver', 'Driver'
        SELLER = 'seller', 'Seller'

    # ============================================================
    # CORE FIELDS
    # ============================================================
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.BUYER)
    phone_number = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    # ============================================================
    # ACCOUNT STATUS
    # ============================================================
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    # ============================================================
    # DRIVER SPECIFIC FIELDS
    # ============================================================
    vehicle_type = models.CharField(max_length=50, blank=True)
    # ↑ e.g. "Motorcycle", "Car"

    ghana_card_image = models.ImageField(upload_to='ghana_cards/', blank=True, null=True)
    # ↑ Photo of physical Ghana card uploaded during registration

    selfie_image = models.ImageField(upload_to='selfies/', blank=True, null=True)
    # ↑ Admin compares this with Ghana card to verify identity

    verification_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
        ],
        default='pending'
    )
    verification_note = models.TextField(blank=True)
    # ↑ Admin writes reason here when rejecting e.g. "Selfie does not match card"

    # Driver performance stats
    total_deliveries = models.PositiveIntegerField(default=0)
    # ↑ Total number of deliveries ever completed

    successful_deliveries = models.PositiveIntegerField(default=0)
    # ↑ Deliveries completed without issues

    failed_deliveries = models.PositiveIntegerField(default=0)
    # ↑ Deliveries that were cancelled or failed after acceptance

    total_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    # ↑ Cumulative earnings from all completed deliveries

    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    # ↑ Calculated from buyer reviews after each delivery (0.00 - 5.00)

    total_ratings = models.PositiveIntegerField(default=0)
    # ↑ How many ratings the driver has received, used to compute average correctly

    currently_delivering = models.BooleanField(default=False)
    # ↑ True when driver has accepted an order and is on the way
    #   Allows admin to see who is currently busy

    is_available = models.BooleanField(default=True)
    # ↑ Driver can toggle this on/off to show they are open to new deliveries

    # ============================================================
    # BUYER SPECIFIC FIELDS
    # ============================================================
    delivery_address = models.TextField(blank=True)
    # ↑ Default address, only shared with driver after they accept the order

    total_orders = models.PositiveIntegerField(default=0)
    # ↑ Total number of orders the buyer has placed

    completed_orders = models.PositiveIntegerField(default=0)
    # ↑ Orders successfully delivered

    cancelled_orders = models.PositiveIntegerField(default=0)
    # ↑ Orders the buyer cancelled

    total_spent = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    # ↑ Cumulative amount spent across all completed orders

    # ============================================================
    # SHARED ANALYTICS FIELDS (used across all roles)
    # ============================================================
    last_active = models.DateTimeField(null=True, blank=True)
    # ↑ Updated on every authenticated request
    #   Used by admin to calculate activity stats (today/week/month/year)

    login_count = models.PositiveIntegerField(default=0)
    # ↑ Total number of times this user has logged in

    # ============================================================
    # TIMESTAMPS
    # ============================================================
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ============================================================
    # SELLER SPECIFIC FIELDS
    # ============================================================
    store_name = models.CharField(max_length=100, blank=True)
    # ↑ The name of the seller's store e.g. "Jay's Streetwear"

    store_description = models.TextField(blank=True)
    # ↑ A short bio/description shown on their store page

    store_logo = models.ImageField(upload_to='store_logos/', blank=True, null=True)
    # ↑ The store's logo image

    store_banner = models.ImageField(upload_to='store_banners/', blank=True, null=True)
    # ↑ A wide banner image shown at the top of their store page

    store_slug = models.SlugField(max_length=100, unique=True, blank=True, null=True)
    # ↑ URL-friendly store name e.g. /stores/jays-streetwear/

    # Seller analytics
    seller_total_sales = models.PositiveIntegerField(default=0)
    # ↑ Total number of items sold across all their products

    seller_total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    # ↑ Total revenue earned from all completed orders

    seller_total_products = models.PositiveIntegerField(default=0)
    # ↑ How many active products the seller has listed

    seller_average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    # ↑ Average rating across all their products

    seller_total_ratings = models.PositiveIntegerField(default=0)
    # ↑ Total number of ratings received across all products

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f'{self.email} ({self.role})'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'

    @property
    def delivery_success_rate(self):
        """
        Returns the driver's success rate as a percentage.
        e.g. 45 successful out of 50 total = 90.0%
        Returns 0 if no deliveries yet to avoid division by zero.
        """
        if self.total_deliveries == 0:
            return 0.0
        return round((self.successful_deliveries / self.total_deliveries) * 100, 1)

    def update_driver_rating(self, new_rating):
        """
        Recalculates the driver's average rating when a new rating comes in.
        Uses a running average formula so we don't need to store every rating.
        e.g. current average is 4.5 from 10 ratings, new rating is 5.0:
             new average = ((4.5 * 10) + 5.0) / 11 = 4.59
        """
        self.total_ratings += 1
        self.average_rating = (
            (self.average_rating * (self.total_ratings - 1)) + new_rating
        ) / self.total_ratings
        self.save()

    def save(self, *args, **kwargs):
        if self.role == self.Role.BUYER:
            self.is_verified = True
            self.verification_status = 'approved'
        if self.role == self.Role.ADMIN:
            self.is_verified = True
            self.is_staff = True
            self.verification_status = 'approved'
        if self.role == self.Role.SELLER:
            self.is_verified = True
            self.verification_status = 'approved'
            # Auto generate store slug from store name if not set
            if self.store_name and not self.store_slug:
                from django.utils.text import slugify
                self.store_slug = slugify(self.store_name)
        if self.role == self.Role.DRIVER:
            self.is_verified = self.verification_status == 'approved'
        super().save(*args, **kwargs)