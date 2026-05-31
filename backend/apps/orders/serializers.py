from rest_framework import serializers
from .models import Order, OrderItem, Cart, CartItem, DeliveryRating
from apps.products.serializers import ProductListSerializer


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
        if primary:
            request = self.context.get('request')
            return request.build_absolute_uri(primary.image.url) if request else primary.image.url
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

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_image',
            'size', 'color', 'unit_price', 'quantity', 'total_price',
        ]


class OrderSerializer(serializers.ModelSerializer):
    """
    Full order detail — used by buyers to see their order,
    and by drivers after they accept a delivery.
    """
    items = OrderItemSerializer(many=True, read_only=True)
    is_active = serializers.ReadOnlyField()
    buyer_name = serializers.CharField(source='buyer.full_name', read_only=True)
    driver_name = serializers.CharField(source='driver.full_name', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'buyer_name', 'driver_name',
            'delivery_address', 'delivery_phone', 'delivery_note',
            'subtotal', 'delivery_fee', 'total', 'driver_earnings',
            'items', 'is_active',
            'created_at', 'accepted_at', 'delivered_at',
        ]


class OrderListSerializer(serializers.ModelSerializer):
    """
    Lightweight order serializer for lists — no items included.
    """
    buyer_name = serializers.CharField(source='buyer.full_name', read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'buyer_name',
            'total', 'item_count', 'created_at',
        ]

    def get_item_count(self, obj):
        return obj.items.count()


class PlaceOrderSerializer(serializers.Serializer):
    """
    Called when buyer checks out.
    Takes delivery details and converts their cart into an order.
    """
    delivery_address = serializers.CharField()
    delivery_phone = serializers.CharField()
    delivery_note = serializers.CharField(required=False, allow_blank=True)
    delivery_fee = serializers.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def validate(self, data):
        buyer = self.context['request'].user
        # Make sure the buyer has a cart with items
        try:
            cart = Cart.objects.get(buyer=buyer)
            if not cart.cart_items.exists():
                raise serializers.ValidationError('Your cart is empty')
        except Cart.DoesNotExist:
            raise serializers.ValidationError('Your cart is empty')
        data['cart'] = cart
        return data


class DriverOrderListSerializer(serializers.ModelSerializer):
    """
    What drivers see when browsing available orders to accept.
    Deliberately excludes buyer personal info until they accept.
    """
    item_count = serializers.SerializerMethodField()
    area = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'total', 'delivery_fee',
            'driver_earnings', 'item_count', 'area', 'created_at',
        ]
        # ↑ Notice delivery_address is NOT here — drivers only get
        #   the full address after they accept the order

    def get_item_count(self, obj):
        return obj.items.count()

    def get_area(self, obj):
        """
        Returns only the general area from the address, not the full address.
        e.g. "East Legon, Accra" instead of "House 5, Boundary Road, East Legon"
        This gives drivers enough info to decide without exposing full details.
        """
        parts = obj.delivery_address.split(',')
        if len(parts) >= 2:
            return ','.join(parts[-2:]).strip()
        return obj.delivery_address


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
            'delivery_address', 'buyer_phone', 'delivery_note',
            'total', 'driver_earnings', 'accepted_at',
        ]


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