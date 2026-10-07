from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import ContactMessage, NewsletterSubscriber

User = get_user_model()


# ============================================================
# CUSTOM JWT
# ============================================================

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['full_name'] = user.full_name
        token['is_verified'] = user.is_verified
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if user.role in ('driver', 'seller') and not user.is_verified:
            if user.verification_status == 'pending':
                raise serializers.ValidationError(
                    'Your account is under review. Please wait for admin approval.'
                )
            if user.verification_status == 'rejected':
                raise serializers.ValidationError(
                    f'Your application was rejected. Reason: {user.verification_note or "Does not meet requirements."}'
                )
        # Link guest orders placed with this email before they had an account.
        # Runs AFTER the verification gate so a blocked login never mutates data.
        try:
            from apps.orders.models import Order
            Order.objects.filter(
                buyer__isnull=True, guest_email__iexact=user.email).update(buyer=user)
        except Exception:
            pass
        return data


# ============================================================
# REGISTRATION
# ============================================================

class BuyerRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name',
            'phone_number', 'delivery_address',
            'password', 'confirm_password',
        ]

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        return User.objects.create_user(role=User.Role.BUYER, **validated_data)


class SellerRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name',
            'phone_number', 'store_name', 'store_description',
            'store_logo', 'store_banner',
            'ghana_card_image', 'selfie_image',
            'password', 'confirm_password',
        ]

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        if not data.get('store_name'):
            raise serializers.ValidationError({'store_name': 'Store name is required'})
        if not data.get('store_logo'):
            raise serializers.ValidationError({'store_logo': 'Store profile picture is required'})
        if not data.get('store_banner'):
            raise serializers.ValidationError({'store_banner': 'Store banner image is required'})
        if not data.get('ghana_card_image'):
            raise serializers.ValidationError({'ghana_card_image': 'Ghana card image is required for verification'})
        if not data.get('selfie_image'):
            raise serializers.ValidationError({'selfie_image': 'Selfie image is required for verification'})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        return User.objects.create_user(
            role=User.Role.SELLER,
            verification_status='pending',
            **validated_data
        )


class DriverRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name',
            'phone_number', 'vehicle_type',
            'ghana_card_image', 'selfie_image',
            'password', 'confirm_password',
        ]

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        if not data.get('ghana_card_image'):
            raise serializers.ValidationError({'ghana_card_image': 'Ghana card image is required'})
        if not data.get('selfie_image'):
            raise serializers.ValidationError({'selfie_image': 'Selfie image is required'})
        if not data.get('vehicle_type'):
            raise serializers.ValidationError({'vehicle_type': 'Vehicle type is required'})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        return User.objects.create_user(
            role=User.Role.DRIVER,
            verification_status='pending',
            **validated_data
        )


# ============================================================
# PASSWORD RESET / CHANGE
# ============================================================

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        return data


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        return data


# ============================================================
# PROFILE SERIALIZERS
# ============================================================

class BuyerProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone_number', 'avatar', 'delivery_address',
            'total_orders', 'completed_orders',
            'cancelled_orders', 'total_spent',
            'date_joined', 'last_active',
        ]
        read_only_fields = [
            'id', 'email', 'role', 'total_orders', 'completed_orders',
            'cancelled_orders', 'total_spent', 'date_joined', 'last_active',
        ]


class SellerProfileSerializer(serializers.ModelSerializer):
    """Owner view — includes payout fields (never expose publicly)."""
    full_name = serializers.ReadOnlyField()
    # CharFields (not URLFields) so pasted links without a scheme can be
    # normalized in validate() instead of hard-failing field validation.
    tiktok_url = serializers.CharField(max_length=300, allow_blank=True, default='')
    facebook_url = serializers.CharField(max_length=300, allow_blank=True, default='')
    instagram_url = serializers.CharField(max_length=300, allow_blank=True, default='')
    youtube_url = serializers.CharField(max_length=300, allow_blank=True, default='')
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone_number', 'avatar', 'is_verified',
            'store_name', 'store_description', 'store_logo',
            'store_banner', 'store_slug', 'store_address',
            'pickup_location',
            'whatsapp_number', 'tiktok_url', 'facebook_url',
            'instagram_url', 'youtube_url',
            'delivery_mode', 'custom_delivery_fee',
            'payout_account_number', 'payout_bank_code', 'payout_account_name',
            'paystack_subaccount_code', 'subaccount_status', 'subaccount_note',
            'seller_total_sales', 'seller_total_revenue',
            'seller_total_products', 'seller_average_rating',
            'seller_total_ratings',
            'date_joined', 'last_active',
        ]
        read_only_fields = [
            'id', 'email', 'role', 'store_slug', 'is_verified',
            'paystack_subaccount_code', 'subaccount_status', 'subaccount_note',
            'seller_total_sales', 'seller_total_revenue',
            'seller_total_products', 'seller_average_rating',
            'seller_total_ratings', 'date_joined', 'last_active',
        ]

    def validate(self, data):
        from django.core.validators import URLValidator
        from django.core.exceptions import ValidationError as DjangoValidationError
        # Forgive pasted links without a scheme ("tiktok.com/@shop").
        for field in ('tiktok_url', 'facebook_url', 'instagram_url', 'youtube_url'):
            value = (data.get(field) or '').strip()
            if value:
                if '://' not in value:
                    value = 'https://' + value
                try:
                    URLValidator()(value)
                except DjangoValidationError:
                    raise serializers.ValidationError({field: 'Enter a valid URL.'})
                data[field] = value
        if 'whatsapp_number' in data and data['whatsapp_number']:
            data['whatsapp_number'] = data['whatsapp_number'].strip()
        return data


class SellerPublicSerializer(serializers.ModelSerializer):
    """Public storefront — no payout/bank internals, ever.
    WhatsApp + social links are seller-chosen public contact channels."""
    full_name = serializers.ReadOnlyField()
    logo_url = serializers.SerializerMethodField()
    banner_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'store_name', 'store_slug', 'store_description',
            'store_address', 'pickup_location', 'is_verified',
            'logo_url', 'banner_url',
            'whatsapp_number', 'tiktok_url', 'facebook_url',
            'instagram_url', 'youtube_url',
            'seller_total_sales', 'seller_average_rating', 'seller_total_ratings',
        ]

    def _abs(self, f):
        request = self.context.get('request')
        if f and request:
            try:
                return request.build_absolute_uri(f.url)
            except Exception:
                return None
        if f:
            try:
                return f.url
            except Exception:
                return None
        return None

    def get_logo_url(self, obj):
        return self._abs(obj.store_logo)

    def get_banner_url(self, obj):
        return self._abs(obj.store_banner)


class PayoutAccountSerializer(serializers.ModelSerializer):
    """Seller connects the account that instant settlements pay into."""
    class Meta:
        model = User
        fields = [
            'payout_account_number', 'payout_bank_code', 'payout_account_name',
            'paystack_subaccount_code', 'subaccount_status', 'subaccount_note',
        ]
        read_only_fields = ['paystack_subaccount_code', 'subaccount_status', 'subaccount_note']

    def validate(self, data):
        if not data.get('payout_account_number'):
            raise serializers.ValidationError({'payout_account_number': 'Account / MoMo number is required'})
        if not data.get('payout_bank_code'):
            raise serializers.ValidationError({'payout_bank_code': 'Select your bank / network'})
        if not data.get('payout_account_name'):
            raise serializers.ValidationError({'payout_account_name': 'Account name is required'})
        return data


class DriverProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    delivery_success_rate = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone_number', 'avatar', 'vehicle_type',
            'verification_status', 'verification_note',
            'total_deliveries', 'successful_deliveries',
            'failed_deliveries', 'delivery_success_rate',
            'total_earnings', 'average_rating', 'total_ratings',
            'is_available', 'currently_delivering',
            'date_joined', 'last_active',
        ]
        read_only_fields = [
            'id', 'email', 'role', 'verification_status', 'verification_note',
            'total_deliveries', 'successful_deliveries', 'failed_deliveries',
            'delivery_success_rate', 'total_earnings', 'average_rating',
            'total_ratings', 'currently_delivering', 'date_joined', 'last_active',
        ]


# ============================================================
# ADMIN SERIALIZERS
# ============================================================

class AdminUserListSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'role',
            'phone_number', 'is_active',
            'verification_status', 'average_rating',
            'total_deliveries', 'vehicle_type',
            'date_joined', 'last_active',
        ]


class AdminDriverDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    delivery_success_rate = serializers.ReadOnlyField()
    ghana_card_image_url = serializers.SerializerMethodField()
    selfie_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'phone_number',
            'vehicle_type', 'ghana_card_image', 'selfie_image',
            'ghana_card_image_url', 'selfie_image_url',
            'verification_status', 'verification_note',
            'total_deliveries', 'successful_deliveries',
            'failed_deliveries', 'delivery_success_rate',
            'total_earnings', 'average_rating', 'total_ratings',
            'is_available', 'currently_delivering',
            'is_active', 'date_joined', 'last_active',
        ]

    def get_ghana_card_image_url(self, obj):
        request = self.context.get('request')
        if obj.ghana_card_image and request:
            return request.build_absolute_uri(obj.ghana_card_image.url)
        return None

    def get_selfie_image_url(self, obj):
        request = self.context.get('request')
        if obj.selfie_image and request:
            return request.build_absolute_uri(obj.selfie_image.url)
        return None 


class AdminVerifyDriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['verification_status', 'verification_note']

    def validate_verification_status(self, value):
        if value not in ['approved', 'rejected']:
            raise serializers.ValidationError('Status must be approved or rejected')
        return value


class AdminSellerDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    ghana_card_image_url = serializers.SerializerMethodField()
    selfie_image_url = serializers.SerializerMethodField()
    store_logo_url = serializers.SerializerMethodField()
    store_banner_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'phone_number',
            'store_name', 'store_slug', 'store_description',
            'store_address', 'pickup_location',
            'store_logo', 'store_banner',
            'ghana_card_image', 'selfie_image',
            'store_logo_url', 'store_banner_url',
            'ghana_card_image_url', 'selfie_image_url',
            'whatsapp_number', 'tiktok_url', 'facebook_url',
            'instagram_url', 'youtube_url',
            'verification_status', 'verification_note',
            'is_active', 'date_joined', 'last_active',
        ]

    def _abs_url(self, f):
        request = self.context.get('request')
        if f and request:
            try:
                return request.build_absolute_uri(f.url)
            except Exception:
                return None
        if f:
            try:
                return f.url
            except Exception:
                return None
        return None

    def get_ghana_card_image_url(self, obj):
        return self._abs_url(obj.ghana_card_image)

    def get_selfie_image_url(self, obj):
        return self._abs_url(obj.selfie_image)

    def get_store_logo_url(self, obj):
        return self._abs_url(obj.store_logo)

    def get_store_banner_url(self, obj):
        return self._abs_url(obj.store_banner)


class AdminDashboardSerializer(serializers.Serializer):
    total_buyers = serializers.IntegerField()
    total_drivers = serializers.IntegerField()
    total_sellers = serializers.IntegerField()
    active_today = serializers.IntegerField()
    active_this_week = serializers.IntegerField()
    active_this_month = serializers.IntegerField()
    active_this_year = serializers.IntegerField()
    verified_drivers = serializers.IntegerField()
    pending_drivers = serializers.IntegerField()
    verified_sellers = serializers.IntegerField()
    pending_sellers = serializers.IntegerField()
    drivers_currently_delivering = serializers.IntegerField()
    total_orders = serializers.IntegerField()
    pending_orders = serializers.IntegerField()
    completed_orders = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'subject', 'message', 'role', 'is_read', 'created_at']
        read_only_fields = ['id', 'is_read', 'created_at']


class NewsletterSubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscriber
        fields = ['id', 'email', 'is_active', 'created_at']
        read_only_fields = ['id', 'is_active', 'created_at']


class VendorListSerializer(serializers.ModelSerializer):
    """Public vendor directory card — searchable by store name / description."""
    full_name = serializers.ReadOnlyField()
    product_count = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    banner_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'store_name', 'store_slug', 'store_description',
            'store_address', 'pickup_location',
            'logo_url', 'banner_url', 'is_verified',
            'seller_total_sales', 'seller_average_rating', 'seller_total_ratings',
            'product_count',
        ]

    def get_product_count(self, obj):
        return obj.store_products.filter(is_active=True).count()

    def _abs(self, f):
        request = self.context.get('request')
        if f and request:
            try:
                return request.build_absolute_uri(f.url)
            except Exception:
                return None
        if f:
            try:
                return f.url
            except Exception:
                return None
        return None

    def get_logo_url(self, obj):
        return self._abs(obj.store_logo)

    def get_banner_url(self, obj):
        return self._abs(obj.store_banner)