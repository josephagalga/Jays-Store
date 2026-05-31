from django.shortcuts import render

# Create your views here.
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db import transaction
from .models import Order, OrderItem, Cart, CartItem, DeliveryRating
from .serializers import (
    CartSerializer,
    AddToCartSerializer,
    OrderSerializer,
    OrderListSerializer,
    PlaceOrderSerializer,
    DriverOrderListSerializer,
    DriverAcceptOrderSerializer,
    UpdateOrderStatusSerializer,
    DeliveryRatingSerializer,
)
from apps.core.permissions import IsBuyer, IsDriver, IsAdmin
from decimal import Decimal


# ============================================================
# CART VIEWS
# ============================================================

class CartView(generics.RetrieveAPIView):
    """Buyer views their current cart."""
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get_object(self):
        cart, created = Cart.objects.get_or_create(buyer=self.request.user)
        return cart


class AddToCartView(APIView):
    """Buyer adds an item to their cart."""
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def post(self, request):
        serializer = AddToCartSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        product = serializer.validated_data['product']
        variant = serializer.validated_data['variant']
        quantity = serializer.validated_data['quantity']

        cart, _ = Cart.objects.get_or_create(buyer=request.user)

        # If item already in cart, increase quantity
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            variant=variant,
            defaults={'product': product, 'quantity': quantity}
        )
        if not created:
            cart_item.quantity += quantity
            # Make sure updated quantity doesn't exceed stock
            if cart_item.quantity > variant.stock:
                cart_item.quantity = variant.stock
            cart_item.save()

        return Response(
            CartSerializer(cart, context={'request': request}).data,
            status=status.HTTP_200_OK
        )


class RemoveFromCartView(APIView):
    """Buyer removes an item from their cart."""
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def delete(self, request, item_id):
        try:
            cart_item = CartItem.objects.get(
                id=item_id,
                cart__buyer=request.user
            )
            cart_item.delete()
            return Response({'message': 'Item removed from cart'})
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Item not found in cart'},
                status=status.HTTP_404_NOT_FOUND
            )


class UpdateCartItemView(APIView):
    """Buyer updates the quantity of an item in their cart."""
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def patch(self, request, item_id):
        quantity = request.data.get('quantity')
        if not quantity or int(quantity) < 1:
            return Response(
                {'error': 'Quantity must be at least 1'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            cart_item = CartItem.objects.get(id=item_id, cart__buyer=request.user)
            if int(quantity) > cart_item.variant.stock:
                return Response(
                    {'error': f'Only {cart_item.variant.stock} units available'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            cart_item.quantity = int(quantity)
            cart_item.save()
            return Response(CartSerializer(cart_item.cart, context={'request': request}).data)
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)


# ============================================================
# ORDER VIEWS — BUYER
# ============================================================

class PlaceOrderView(APIView):
    """
    Buyer checks out — converts their cart into an order.
    Uses a database transaction so if anything fails,
    nothing is saved — prevents partial orders.
    """
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    @transaction.atomic
    def post(self, request):
        serializer = PlaceOrderSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        cart = serializer.validated_data['cart']
        # Convert delivery_fee to Decimal to avoid type errors
        delivery_fee = Decimal(str(serializer.validated_data['delivery_fee']))

        subtotal = cart.total
        total = subtotal + delivery_fee

        order = Order.objects.create(
            buyer=request.user,
            delivery_address=serializer.validated_data['delivery_address'],
            delivery_phone=serializer.validated_data['delivery_phone'],
            delivery_note=serializer.validated_data.get('delivery_note', ''),
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            total=total,
            driver_earnings=Decimal('10.00'),
        )

        for cart_item in cart.cart_items.select_related('product', 'variant'):
            primary_image = cart_item.product.images.filter(is_primary=True).first()
            image_url = ''
            if primary_image and primary_image.image:
                try:
                    image_url = request.build_absolute_uri(primary_image.image.url)
                except Exception:
                    image_url = ''

            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                variant=cart_item.variant,
                seller=cart_item.product.seller or cart_item.product.created_by,
                product_name=cart_item.product.name,
                product_image=image_url,
                size=cart_item.variant.size,
                color=cart_item.variant.color,
                unit_price=cart_item.product.effective_price,
                quantity=cart_item.quantity,
            )

            cart_item.variant.stock -= cart_item.quantity
            cart_item.variant.save()

        request.user.total_orders += 1
        request.user.save()

        cart.cart_items.all().delete()

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED
        )


class BuyerOrderListView(generics.ListAPIView):
    """Buyer sees all their orders."""
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get_queryset(self):
        return Order.objects.filter(
            buyer=self.request.user
        ).prefetch_related('items').order_by('-created_at')


class BuyerOrderDetailView(generics.RetrieveAPIView):
    """Buyer sees a single order's full detail."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get_queryset(self):
        return Order.objects.filter(buyer=self.request.user)


class CancelOrderView(APIView):
    """Buyer cancels a pending order."""
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, buyer=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'pending':
            return Response(
                {'error': 'Only pending orders can be cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Restore stock for each item
        for item in order.items.select_related('variant'):
            if item.variant:
                item.variant.stock += item.quantity
                item.variant.save()

        order.status = 'cancelled'
        order.save()

        # Update buyer stats
        request.user.cancelled_orders += 1
        request.user.save()

        return Response({'message': 'Order cancelled successfully'})


# ============================================================
# ORDER VIEWS — DRIVER
# ============================================================

class DriverAvailableOrdersView(generics.ListAPIView):
    """
    Driver sees all pending orders available to accept.
    Only shows general area — not full address yet.
    """
    serializer_class = DriverOrderListSerializer
    permission_classes = [permissions.IsAuthenticated, IsDriver]

    def get_queryset(self):
        return Order.objects.filter(
            status='pending'
        ).prefetch_related('items').order_by('created_at')


class DriverAcceptOrderView(APIView):
    """
    Driver accepts a pending order.
    After this, they get the buyer's full address and phone.
    """
    permission_classes = [permissions.IsAuthenticated, IsDriver]

    @transaction.atomic
    def post(self, request, pk):
        try:
            order = Order.objects.select_for_update().get(pk=pk, status='pending')
            # ↑ select_for_update locks the row so two drivers
            #   can't accept the same order at the same time
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not available'},
                status=status.HTTP_404_NOT_FOUND
            )

        order.driver = request.user
        order.status = 'accepted'
        order.accepted_at = timezone.now()
        order.save()

        # Mark driver as currently delivering
        request.user.currently_delivering = True
        request.user.save()

        return Response(
            DriverAcceptOrderSerializer(order).data,
            status=status.HTTP_200_OK
        )


class DriverUpdateOrderStatusView(APIView):
    """Driver updates order to picked_up or delivered."""
    permission_classes = [permissions.IsAuthenticated, IsDriver]

    @transaction.atomic
    def patch(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, driver=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateOrderStatusSerializer(order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        # When order is delivered, update all relevant stats
        if order.status == 'delivered':
            order.delivered_at = timezone.now()
            order.save()

            # Update driver stats
            driver = request.user
            driver.total_deliveries += 1
            driver.successful_deliveries += 1
            driver.total_earnings += order.driver_earnings
            driver.currently_delivering = False
            driver.save()

            # Update buyer stats
            order.buyer.completed_orders += 1
            order.buyer.total_spent += order.total
            order.buyer.save()

            # Update product and seller stats per item
            for item in order.items.select_related('product', 'seller'):
                if item.product:
                    item.product.total_sold += item.quantity
                    item.product.save()
                if item.seller:
                    item.seller.seller_total_sales += item.quantity
                    item.seller.seller_total_revenue += item.total_price
                    item.seller.save()

        return Response(OrderSerializer(order).data)


class DriverOrderHistoryView(generics.ListAPIView):
    """Driver sees all their past deliveries."""
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated, IsDriver]

    def get_queryset(self):
        return Order.objects.filter(
            driver=self.request.user
        ).order_by('-created_at')


# ============================================================
# RATING VIEW
# ============================================================

class DeliveryRatingView(generics.CreateAPIView):
    """Buyer rates a driver after delivery."""
    serializer_class = DeliveryRatingSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def perform_create(self, serializer):
        serializer.save(
            buyer=self.request.user,
            driver=serializer.validated_data['order'].driver
        )


# ============================================================
# ADMIN ORDER VIEWS
# ============================================================

class AdminOrderListView(generics.ListAPIView):
    """Admin sees all orders across the platform."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        status_filter = self.request.query_params.get('status')
        queryset = Order.objects.all().prefetch_related(
            'items'
        ).select_related('buyer', 'driver')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset.order_by('-created_at')


class AdminOrderDetailView(generics.RetrieveAPIView):
    """Admin sees any single order's full detail."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = Order.objects.all().prefetch_related('items').select_related('buyer', 'driver')