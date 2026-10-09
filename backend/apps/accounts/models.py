from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from apps.core.validators import validate_image_file_size
from django.core.validators import MinValueValidator, MaxValueValidator


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
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True,
                                 validators=[validate_image_file_size])

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

    ghana_card_image = models.ImageField(upload_to='ghana_cards/', blank=True, null=True,
                                           validators=[validate_image_file_size])
    # ↑ Photo of physical Ghana card uploaded during registration

    selfie_image = models.ImageField(upload_to='selfies/', blank=True, null=True,
                                       validators=[validate_image_file_size])
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

    store_logo = models.ImageField(upload_to='store_logos/', blank=True, null=True,
                                     validators=[validate_image_file_size])
    # ↑ The store's logo image

    store_banner = models.ImageField(upload_to='store_banners/', blank=True, null=True,
                                       validators=[validate_image_file_size])
    # ↑ A wide banner image shown at the top of their store page

    store_slug = models.SlugField(max_length=100, unique=True, blank=True, null=True)
    # ↑ URL-friendly store name e.g. /stores/jays-streetwear/

    store_address = models.TextField(blank=True, null=True)
    # ↑ Seller's store/pickup address for delivery handoff

    pickup_location = models.CharField(max_length=200, blank=True, null=True)
    # ↑ Human-readable pickup location e.g. "Shop 5, Mallam"

    # Store social & contact links — shown on the public store page so
    # buyers can watch product videos and chat with the seller.
    whatsapp_number = models.CharField(max_length=20, blank=True, default='')
    # ↑ Chat number, e.g. "0244123456" — storefront links it as wa.me/233244123456
    tiktok_url = models.URLField(max_length=300, blank=True, default='')
    facebook_url = models.URLField(max_length=300, blank=True, default='')
    instagram_url = models.URLField(max_length=300, blank=True, default='')
    youtube_url = models.URLField(max_length=300, blank=True, default='')

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

    # Instant settlement — Paystack Split subaccount. Buyer payments settle
    # each seller's share straight to their own account; funds never sit
    # with the platform.
    # SELF-DELIVERY — seller delivers their own items and keeps a delivery fee.
    # 'platform': My Jay's Store drivers deliver (tiered fee goes to platform).
    # 'self': seller delivers; their flat fee is added at checkout and settled to them.
    delivery_mode = models.CharField(
        max_length=20,
        choices=[('platform', 'Platform delivery'), ('self', 'Self delivery')],
        default='platform',
    )
    custom_delivery_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0.00), MaxValueValidator(50.00)],
        help_text="Flat delivery fee per order when self-delivering (0.00-50.00 GHS).",
    )

    payout_account_number = models.CharField(max_length=30, blank=True, default='')
    # ↑ MoMo number or bank account number that receives settlements
    payout_bank_code = models.CharField(max_length=20, blank=True, default='')
    # ↑ Paystack settlement bank code (see /seller/banks/ for the Ghana list)
    payout_account_name = models.CharField(max_length=100, blank=True, default='')
    paystack_subaccount_code = models.CharField(max_length=50, blank=True, default='')
    # ↑ e.g. "ACCT_..." — created via Paystack once payout details are saved
    #   (split era; retained for historic orders)
    transfer_recipient_code = models.CharField(max_length=60, blank=True, default='')
    # ↑ e.g. "RCP_..." — Paystack transfer recipient for instant MoMo payouts
    auto_transfer_enabled = models.BooleanField(default=False)
    # ↑ Pilot gate: instant transfers fire only for enabled sellers
    subaccount_status = models.CharField(
        max_length=20,
        choices=[('none', 'None'), ('pending', 'Pending'), ('active', 'Active'), ('failed', 'Failed')],
        default='none',
    )
    subaccount_note = models.TextField(blank=True, default='')

    # LEGAL ACCEPTANCE — Terms version + timestamp (null = accepted before
    # versioning began; enforced at registration going forward)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    terms_version = models.CharField(max_length=20, blank=True, default='')

    # COMMISSION SYSTEM — Buyer-pays model
    # Commission is added on top of seller's listed price; seller receives full amount
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=10.00,
        validators=[MinValueValidator(0.00), MaxValueValidator(30.00)],
        help_text="Commission percentage (0.00-30.00%). Buyers pay this on top of seller's listed price."
    )
    commission_rate_updated_at = models.DateTimeField(null=True, blank=True)
    # ↑ Timestamp of last commission rate change (for audit purposes)

    # Sales record flag — admin notified when buyer places order
    sales_record_sent = models.BooleanField(default=False)

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
            self.is_verified = self.verification_status == 'approved'
            # Auto generate store slug from store name if not set.
            # Dedup loop mirrors product slugs — a second "Kente Co." must
            # not 500 on the unique constraint.
            if self.store_name and not self.store_slug:
                from django.utils.text import slugify
                base = slugify(self.store_name) or f'store-{self.pk or "new"}'
                slug = base
                counter = 1
                Model = type(self)
                while Model.objects.filter(store_slug=slug).exclude(pk=self.pk).exists():
                    slug = f'{base}-{counter}'
                    counter += 1
                self.store_slug = slug
        if self.role == self.Role.DRIVER:
            self.is_verified = self.verification_status == 'approved'
        super().save(*args, **kwargs)


class ContactMessage(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    role = models.CharField(max_length=20, default='buyer')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'contact_messages'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} <{self.email}> — {self.subject or "No subject"}'


class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'newsletter_subscribers'
        ordering = ['-created_at']

    def __str__(self):
        return self.email


class CommissionRateAuditLog(models.Model):
    """Complete audit trail for commission rate changes.
    
    Tracks every commission rate modification for transparency,
    dispute resolution, and compliance.
    """
    seller = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='commission_rate_history'
    )
    old_rate = models.DecimalField(max_digits=5, decimal_places=2)
    new_rate = models.DecimalField(max_digits=5, decimal_places=2)
    changed_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='commission_rate_changes_made'
    )
    # ↑ The admin user who made the change
    reason = models.TextField(blank=True)
    # ↑ Optional explanation for the change
    affected_products_count = models.IntegerField(default=0)
    # ↑ How many products were updated (if retroactive)
    apply_to_existing = models.BooleanField(default=False)
    # ↑ Whether this change was applied retroactively to existing products
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'commission_rate_audit_logs'
        ordering = ['-created_at']

    def __str__(self):
        seller_email = self.seller.email if self.seller else 'Unknown'
        return f'{seller_email}: {self.old_rate}% → {self.new_rate}% on {self.created_at.date()}'