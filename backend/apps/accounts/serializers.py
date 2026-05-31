from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

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
        if user.role == 'driver' and not user.is_verified:
            if user.verification_status == 'pending':
                raise serializers.ValidationError(
                    'Your account is under review. Please wait for admin approval.'
                )
            if user.verification_status == 'rejected':
                raise serializers.ValidationError(
                    f'Your application was rejected. Reason: {user.verification_note or "Does not meet requirements."}'
                )
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
            'store_logo', 'password', 'confirm_password',
        ]

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        if not data.get('store_name'):
            raise serializers.ValidationError({'store_name': 'Store name is required'})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        return User.objects.create_user(role=User.Role.SELLER, **validated_data)


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
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone_number', 'avatar',
            'store_name', 'store_description', 'store_logo',
            'store_banner', 'store_slug',
            'seller_total_sales', 'seller_total_revenue',
            'seller_total_products', 'seller_average_rating',
            'seller_total_ratings',
            'date_joined', 'last_active',
        ]
        read_only_fields = [
            'id', 'email', 'role', 'store_slug',
            'seller_total_sales', 'seller_total_revenue',
            'seller_total_products', 'seller_average_rating',
            'seller_total_ratings', 'date_joined', 'last_active',
        ]


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


class AdminDashboardSerializer(serializers.Serializer):
    total_buyers = serializers.IntegerField()
    total_drivers = serializers.IntegerField()
    active_today = serializers.IntegerField()
    active_this_week = serializers.IntegerField()
    active_this_month = serializers.IntegerField()
    active_this_year = serializers.IntegerField()
    verified_drivers = serializers.IntegerField()
    pending_drivers = serializers.IntegerField()
    drivers_currently_delivering = serializers.IntegerField()
    total_orders = serializers.IntegerField()
    pending_orders = serializers.IntegerField()
    completed_orders = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)