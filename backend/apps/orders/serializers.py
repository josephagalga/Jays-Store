from rest_framework import serializers
from decimal import Decimal
from .models import Order, OrderItem, Cart, CartItem, DeliveryRating, Coupon, Payout, Settlement, EmailLog, PLATFORM_COMMISSION_RATE
from apps.products.serializers import ProductListSerializer


ACTIVE_OTP_STATUSES = {'pending', 'accepted', 'picked_up'}


def get_buyer_otp(order, request):
    """The buyer's delivery OTP — NEVER returned to client for security.
    
    OTP is sent only via email. This function returns None to ensure
    OTP is not exposed through API responses.
    """
    return None


# ============================================================
# CART SERIALIZERS
# ============================================================

class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()
    size = serializers.CharField(source='variant.size', read_only=True)
    color = serializers.CharField(source='variant.color', read_only=True)
    unit_price = serializers.DecimalField(
        source='product.effective_price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    total_price = serializers.ReadOnlyField()
    stock_available = serializers.IntegerField(source='variant.stock', read_only=True)

    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'variant', 'product_name',
            'product_image', 'size', 'color',
            'unit_price', 'quantity', 'total_price', 'stock_available',
        ]
        read_only_fields = ['id']

    def get_product_image(self, obj):
        primary = obj.product.images.filter(is_primary=True).first()
        if primary and primary.image:
            try:
                return primary.image.url
            except Exception:
                return None
        return None

    def validate(self, data):
        variant = data.get('variant')
        quantity = data.get('quantity', 1)
        if variant and variant.stock < quantity:
            raise serializers.ValidationError({
                'quantity': f'Only {variant.stock} units available in stock'
            })
        return data


class CartSerializer(serializers.ModelSerializer):
    cart_items = CartItemSerializer(many=True, read_only=True)
    total = serializers.ReadOnlyField()
    item_count = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ['id', 'cart_items', 'total', 'item_count', 'updated_at']


class AddToCartSerializer(serializers.Serializer):
    """
    Handles adding an item to the cart.
    Not a ModelSerializer because the logic is more complex
    than a simple create — we need to check if the item
    already exists and update quantity instead of creating a duplicate.
    """
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)

    def validate(self, data):
        from apps.products.models import Product, ProductVariant

        # Make sure product exists and is active
        try:
            product = Product.objects.get(id=data['product_id'], is_active=True)
        except Product.DoesNotExist:
            raise serializers.ValidationError({'product_id': 'Product not found'})

        # Make sure variant exists and belongs to this product
        try:
            variant = ProductVariant.objects.get(id=data['variant_id'], product=product)
        except ProductVariant.DoesNotExist:
            raise serializers.ValidationError({'variant_id': 'Variant not found'})

        # Make sure there is enough stock
        if variant.stock < data['quantity']:
            raise serializers.ValidationError({
                'quantity': f'Only {variant.stock} units available in stock'
            })

        data['product'] = product
        data['variant'] = variant
        return data


# ============================================================
# ORDER SERIALIZERS
# ============================================================

class OrderItemSerializer(serializers.ModelSerializer):
    total_price = serializers.ReadOnlyField()
    product_slug = serializers.CharField(source='product.slug', read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_image',
            'product_slug', 'size', 'color', 'unit_price', 'quantity', 'total_price',
        ]


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'discount_type', 'discount_value',
            'min_order_amount', 'max_discount_amount',
            'is_active', 'valid_from', 'valid_until',
        ]


class ValidateCouponSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, default=0.00)


class OrderSerializer(serializers.ModelSerializer):
    """
    Full order detail — used by buyers to see their order,
    and by drivers after they accept a delivery.
    """
    items = OrderItemSerializer(many=True, read_only=True)
    is_active = serializers.ReadOnlyField()
    buyer_name = serializers.CharField(source='buyer.full_name', read_only=True)
    buyer_email = serializers.CharField(source='buyer.email', read_only=True)
    driver_name = serializers.CharField(source='driver.full_name', read_only=True)
    driver_phone = serializers.CharField(source='driver.phone_number', read_only=True)
    coupon_code = serializers.CharField(source='coupon.code', read_only=True)
    paystack_reference = serializers.CharField(read_only=True)
    delivery_otp = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'buyer_name', 'buyer_email', 'driver_name', 'driver_phone',
            'delivery_address', 'delivery_phone', 'delivery_note', 'delivery_landmark',
            'subtotal', 'discount_amount', 'delivery_fee', 'processing_fee', 'total', 'driver_earnings',
            'coupon_code', 'payment_method', 'payment_status', 'payment_reference',
            'paystack_reference', 'paid_at',
            'delivery_pin', 'pin_verified', 'delivery_otp',
            'items', 'is_active',
            'created_at', 'accepted_at', 'delivered_at',
        ]

    def get_delivery_otp(self, obj):
        return get_buyer_otp(obj, self.context.get('request'))


class OrderListSerializer(serializers.ModelSerializer):
    """
    Order list for buyers — includes items so the UI can show line items
    and a Pay Now button for unpaid Paystack orders.
    """
    buyer_name = serializers.CharField(source='buyer.full_name', read_only=True)
    driver_name = serializers.CharField(source='driver.full_name', read_only=True)
    item_count = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    delivery_otp = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'buyer_name', 'driver_name',
            'total', 'processing_fee', 'payment_status', 'payment_method', 'paystack_reference',
            'delivery_otp', 'item_count', 'created_at', 'items',
        ]

    def get_item_count(self, obj):
        return obj.items.count()

    def get_delivery_otp(self, obj):
        return get_buyer_otp(obj, self.context.get('request'))


class PlaceOrderSerializer(serializers.Serializer):
    """
    Called when buyer checks out. Paystack only: creates the order UNPAID,
    then the view creates the Paystack split + transaction for the single
    buyer charge. Sellers settle instantly via their subaccounts.
    """
    delivery_address = serializers.CharField()
    delivery_phone = serializers.CharField()
    delivery_note = serializers.CharField(required=False, allow_blank=True)
    delivery_landmark = serializers.CharField(required=False, allow_blank=True, max_length=255)
    payment_method = serializers.ChoiceField(
        choices=['paystack'],
        default='paystack'
    )

    def validate(self, data):
        buyer = self.context['request'].user
        try:
            cart = Cart.objects.get(buyer=buyer)
            if not cart.cart_items.exists():
                raise serializers.ValidationError('Your cart is empty')
        except Cart.DoesNotExist:
            raise serializers.ValidationError('Your cart is empty')
        # No coupon processing — removed from checkout
        # Every VENDOR item in the cart must have an active Paystack subaccount,
        # otherwise their share cannot settle instantly. Items with no seller
        # (platform-listed) settle to the platform and need no subaccount.
        missing = set()
        for ci in cart.cart_items.select_related('product', 'product__seller').all():
            seller = ci.product.seller or ci.product.created_by
            if seller and seller.role == 'seller' and (
                    not seller.paystack_subaccount_code or seller.subaccount_status != 'active'):
                missing.add(seller.store_name or 'A vendor')
        if missing:
            names = ', '.join(sorted(missing))
            raise serializers.ValidationError(
                f'Checkout unavailable: {names} has not connected a payout account yet. '
                'Remove their items or try again later.'
            )
        data['cart'] = cart
        return data


class SellerOrderListSerializer(serializers.ModelSerializer):
    """
    Serializer for sellers to view their orders.
    Includes buyer info and driver info.
    """
    buyer_name = serializers.CharField(source='buyer.full_name', read_only=True)
    buyer_phone = serializers.CharField(source='buyer.phone_number', read_only=True)
    driver_name = serializers.CharField(source='driver.full_name', read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'buyer_name', 'buyer_phone',
            'driver_name', 'total', 'payment_status',
            'payment_method', 'item_count', 'created_at',
            'delivery_address', 'delivery_phone', 'delivery_note', 'delivery_landmark',
            'delivery_fee', 'delivery_pin', 'pin_verified',
        ]
        read_only_fields = ['id', 'created_at']

    def get_item_count(self, obj):
        return obj.items.count()


class DriverOrderListSerializer(serializers.ModelSerializer):
    """
    What drivers see when browsing available orders to accept.
    Deliberately excludes buyer personal info until they accept.
    Now includes vendor (seller) info per item.
    """
    item_count = serializers.SerializerMethodField()
    area = serializers.SerializerMethodField()
    vendors = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'total', 'delivery_fee',
            'driver_earnings', 'item_count', 'area', 'created_at', 'vendors',
        ]

    def get_item_count(self, obj):
        return obj.items.count()

    def get_area(self, obj):
        parts = obj.delivery_address.split(',')
        if len(parts) >= 2:
            return ','.join(parts[-2:]).strip()
        return obj.delivery_address

    def get_vendors(self, obj):
        vendors = []
        for item in obj.items.select_related('seller').all():
            if item.seller and item.seller.role == 'seller':
                vendors.append({
                    'seller_id': item.seller.id,
                    'store_name': item.seller.store_name,
                    'store_slug': item.seller.store_slug,
                    'store_address': item.seller.store_address,
                    'pickup_location': item.seller.pickup_location,
                    'phone_number': item.seller.phone_number,
                    'product': item.product.name,
                })
        return vendors


class DriverAcceptOrderSerializer(serializers.ModelSerializer):
    """
    Full order detail shown to a driver AFTER they accept.
    Now includes buyer's full address and phone number.
    """
    items = OrderItemSerializer(many=True, read_only=True)
    buyer_phone = serializers.CharField(source='delivery_phone', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'items',
            'delivery_address', 'buyer_phone', 'delivery_note', 'delivery_landmark',
            'total', 'driver_earnings', 'accepted_at',
        ]


class DriverHistorySerializer(serializers.ModelSerializer):
    """Driver's own deliveries — full drop-off details + OTP state."""
    items = OrderItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()
    buyer_phone = serializers.CharField(source='delivery_phone', read_only=True)
    otp_verified = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'items', 'item_count',
            'delivery_address', 'buyer_phone', 'delivery_note', 'delivery_landmark',
            'total', 'driver_earnings', 'payment_method', 'payment_status',
            'otp_verified', 'created_at', 'accepted_at', 'delivered_at',
        ]

    def get_item_count(self, obj):
        return obj.items.count()

    def get_otp_verified(self, obj):
        otp_log = getattr(obj, 'otp_log', None)
        return bool(otp_log and otp_log.is_verified)


class UpdateOrderStatusSerializer(serializers.ModelSerializer):
    """
    Used by drivers to update the status of their delivery.
    e.g. mark as picked_up or delivered.
    """
    class Meta:
        model = Order
        fields = ['status']

    def validate_status(self, value):
        order = self.instance
        # Define valid status transitions for drivers
        valid_transitions = {
            'accepted': 'picked_up',
            'picked_up': 'delivered',
        }
        expected_next = valid_transitions.get(order.status)
        if value != expected_next:
            raise serializers.ValidationError(
                f'Cannot change status from {order.status} to {value}. '
                f'Expected: {expected_next}'
            )
        return value


class DeliveryRatingSerializer(serializers.ModelSerializer):
    """
    Buyer rates the driver after delivery.
    """
    class Meta:
        model = DeliveryRating
        fields = ['order', 'rating', 'comment']

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError('Rating must be between 1 and 5')
        return value

    def validate_order(self, value):
        buyer = self.context['request'].user
        # Make sure the order belongs to this buyer and is delivered
        if value.buyer != buyer:
            raise serializers.ValidationError('This is not your order')
        if value.status != 'delivered':
            raise serializers.ValidationError('You can only rate a delivered order')
        if hasattr(value, 'delivery_rating'):
            raise serializers.ValidationError('You have already rated this delivery')
        return value


class PayoutSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source='seller.full_name', read_only=True)
    seller_email = serializers.CharField(source='seller.email', read_only=True)

    class Meta:
        model = Payout
        fields = [
            'id', 'seller', 'seller_name', 'seller_email',
            'amount', 'momo_number', 'momo_network', 'account_name',
            'status', 'admin_note', 'requested_at', 'processed_at',
        ]
        read_only_fields = ['id', 'seller', 'status', 'admin_note', 'requested_at', 'processed_at']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero')
        request = self.context.get('request')
        if request:
            from django.db.models import Sum
            seller = request.user
            gross = OrderItem.objects.filter(
                seller=seller, order__status='delivered'
            ).aggregate(total=Sum('unit_price'))['total'] or Decimal('0.00')
            # unit_price * quantity — compute properly
            gross = Decimal('0.00')
            for item in OrderItem.objects.filter(seller=seller, order__status='delivered').select_related('order'):
                gross += Decimal(str(item.unit_price)) * item.quantity
            net_earnings = gross * (Decimal('1.00') - Decimal(str(PLATFORM_COMMISSION_RATE)))
            paid_out = Payout.objects.filter(
                seller=seller, status__in=['pending', 'approved', 'paid']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            available = net_earnings - Decimal(str(paid_out))
            if Decimal(str(value)) > available:
                raise serializers.ValidationError(
                    f'Insufficient balance. Available: GHS {available:.2f}'
                )
        return value


class SellerWalletSerializer(serializers.Serializer):
    gross_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    commission_rate = serializers.FloatField()
    commission_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_out = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_payouts = serializers.DecimalField(max_digits=12, decimal_places=2)
    available_balance = serializers.DecimalField(max_digits=12, decimal_places=2)


class SettlementSerializer(serializers.ModelSerializer):
    """Local record of an instant Paystack settlement to a seller."""
    seller_name = serializers.CharField(source='seller.store_name', read_only=True)
    seller_email = serializers.CharField(source='seller.email', read_only=True)

    class Meta:
        model = Settlement
        fields = [
            'id', 'order', 'seller', 'seller_name', 'seller_email',
            'subaccount_code', 'gross_share', 'commission', 'fee_slice',
            'net_share', 'status', 'paystack_reference',
            'created_at', 'settled_at',
        ]
        read_only_fields = ['id', 'created_at', 'settled_at']


class EmailLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailLog
        fields = ['id', 'to_email', 'subject', 'kind', 'order', 'ok', 'error', 'created_at']
        read_only_fields = ['id', 'created_at']