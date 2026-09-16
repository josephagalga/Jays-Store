import hashlib
import hmac
import random

import requests
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db import transaction
from django.conf import settings
from .models import Order, OrderItem, Cart, CartItem, DeliveryRating, Coupon, Payout, PLATFORM_COMMISSION_RATE, DeliveryPinLog, calculate_delivery_fee
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
    CouponSerializer,
    ValidateCouponSerializer,
    PayoutSerializer,
    SellerWalletSerializer,
    SellerOrderListSerializer,
)
from apps.core.permissions import IsBuyer, IsDriver, IsAdmin, IsAdminOrSeller
from decimal import Decimal
from django.db.models import Sum


def get_seller_wallet(seller):
    gross = Decimal('0.00')
    for item in OrderItem.objects.filter(seller=seller, order__status='delivered').select_related('order'):
        gross += Decimal(str(item.unit_price)) * item.quantity
    commission = gross * Decimal(str(PLATFORM_COMMISSION_RATE))
    net = gross - commission
    agg = Payout.objects.filter(seller=seller, status__in=['approved', 'paid']).aggregate(total=Sum('amount'))
    paid_out = agg['total'] or Decimal('0.00')
    agg2 = Payout.objects.filter(seller=seller, status='pending').aggregate(total=Sum('amount'))
    pending = agg2['total'] or Decimal('0.00')
    available = net - Decimal(str(paid_out)) - Decimal(str(pending))
    return {
        'gross_revenue': gross,
        'commission_rate': PLATFORM_COMMISSION_RATE,
        'commission_paid': commission,
        'net_earnings': net,
        'paid_out': paid_out,
        'pending_payouts': pending,
        'available_balance': max(Decimal('0.00'), available),
    }


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

class ValidateCouponView(APIView):
    """Validates a coupon code and returns the discount amount."""
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def post(self, request):
        serializer = ValidateCouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data['code'].strip().upper()
        subtotal = Decimal(str(serializer.validated_data.get('subtotal', 0)))

        try:
            coupon = Coupon.objects.get(code=code)
        except Coupon.DoesNotExist:
            return Response({'valid': False, 'message': 'Invalid coupon code'}, status=status.HTTP_400_BAD_REQUEST)

        valid, msg = coupon.is_valid(subtotal)
        if not valid:
            return Response({'valid': False, 'message': msg}, status=status.HTTP_400_BAD_REQUEST)

        discount_amount = coupon.calculate_discount(subtotal)
        return Response({
            'valid': True,
            'code': coupon.code,
            'discount_type': coupon.discount_type,
            'discount_value': str(coupon.discount_value),
            'discount_amount': str(discount_amount),
            'message': f'Coupon applied! Saved GHS {discount_amount:.2f}',
        })


class PlaceOrderView(APIView):
    """
    Takes the buyer's cart and turns it into a real order.
    Delivery fee is calculated server-side from item count.
    For cash_on_delivery, a 4-digit PIN is generated.
    """
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    @transaction.atomic
    def post(self, request):
        serializer = PlaceOrderSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        cart = serializer.validated_data['cart']
        total_items = sum(ci.quantity for ci in cart.cart_items.all())
        delivery_fee = calculate_delivery_fee(total_items)
        subtotal = cart.total

        # Process coupon if provided
        coupon_code = serializer.validated_data.get('coupon_code', '')
        coupon = None
        discount_amount = Decimal('0.00')

        if coupon_code:
            try:
                coupon = Coupon.objects.get(code=coupon_code.strip().upper())
                valid, _ = coupon.is_valid(subtotal)
                if valid:
                    discount_amount = Decimal(str(coupon.calculate_discount(subtotal)))
                    coupon.used_count += 1
                    coupon.save()
            except Coupon.DoesNotExist:
                pass

        total = max(Decimal('0.00'), subtotal - discount_amount + delivery_fee)

        payment_method = serializer.validated_data.get('payment_method', 'paystack')
        payment_reference = serializer.validated_data.get('payment_reference', '') or f'PAY-{int(timezone.now().timestamp())}'
        # Only cash_on_delivery stays unpaid at placement; online methods
        # (paystack/momo/card) are marked paid only after verification.
        # Legacy momo/card orders keep old behaviour via verify endpoints.
        if payment_method == 'cash_on_delivery':
            payment_status = 'unpaid'
        elif payment_method == 'paystack':
            payment_status = 'unpaid'
        else:
            payment_status = 'paid'
        paid_at = timezone.now() if payment_status == 'paid' else None

        driver_earnings = total * PLATFORM_COMMISSION_RATE if delivery_fee > 0 else Decimal('0.00')

        order = Order.objects.create(
            buyer=request.user,
            delivery_address=serializer.validated_data['delivery_address'],
            delivery_phone=serializer.validated_data['delivery_phone'],
            delivery_note=serializer.validated_data.get('delivery_note', ''),
            subtotal=subtotal,
            coupon=coupon,
            discount_amount=discount_amount,
            delivery_fee=delivery_fee,
            total=total,
            payment_method=payment_method,
            payment_status=payment_status,
            payment_reference=payment_reference,
            paid_at=paid_at,
            driver_earnings=driver_earnings,
        )

        # Generate delivery PIN for cash on delivery
        pin_code = None
        if payment_method == 'cash_on_delivery':
            pin_code = f'{random.randint(0, 9999):04d}'
            order.delivery_pin = pin_code
            order.save(update_fields=['delivery_pin'])
            DeliveryPinLog.objects.create(
                order=order,
                driver=None,
                code=pin_code,
            )

        for cart_item in cart.cart_items.select_related('product', 'variant'):
            primary_image = cart_item.product.images.filter(is_primary=True).first()
            image_url = ''
            if primary_image:
                image_url = primary_image.url or ''

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

        response_data = OrderSerializer(order).data
        response_data['delivery_fee'] = str(delivery_fee)
        if pin_code:
            response_data['delivery_pin'] = pin_code
            response_data['pin_required'] = True
        else:
            response_data['pin_required'] = False

        return Response(
            response_data,
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
    After this, they get the buyer's full address, phone,
    AND the vendor (seller) info + store pickup location.
    """
    permission_classes = [permissions.IsAuthenticated, IsDriver]

    @transaction.atomic
    def post(self, request, pk):
        try:
            order = Order.objects.select_for_update().get(pk=pk, status='pending')
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not available'},
                status=status.HTTP_404_NOT_FOUND
            )

        order.driver = request.user
        order.status = 'accepted'
        order.accepted_at = timezone.now()
        order.save()

        # Attach driver to PIN log if COD order
        if order.payment_method == 'cash_on_delivery':
            try:
                pin_log = order.pin_log
                pin_log.driver = request.user
                pin_log.save(update_fields=['driver'])
            except DeliveryPinLog.DoesNotExist:
                pass

        request.user.currently_delivering = True
        request.user.save()

        # Build vendor info per item (each item has a seller)
        vendor_info = []
        for item in order.items.select_related('seller').all():
            if item.seller and item.seller.role == 'seller':
                vendor_info.append({
                    'seller_id': item.seller.id,
                    'store_name': item.seller.store_name,
                    'store_slug': item.seller.store_slug,
                    'store_address': item.seller.store_address,
                    'pickup_location': item.seller.pickup_location,
                    'phone_number': item.seller.phone_number,
                    'product': item.product.name,
                })

        response_data = DriverAcceptOrderSerializer(order).data
        response_data['vendors'] = vendor_info
        # Never expose the PIN to the driver — the buyer hands it over in person.
        response_data['delivery_pin_required'] = order.payment_method == 'cash_on_delivery'

        return Response(response_data, status=status.HTTP_200_OK)


class DriverUpdateOrderStatusView(APIView):
    """Driver updates order to picked_up or delivered.
    Delivered requires correct 4-digit PIN for cash_on_delivery orders.
    """
    permission_classes = [permissions.IsAuthenticated, IsDriver]

    @transaction.atomic
    def patch(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, driver=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateOrderStatusSerializer(order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data['status']

        if new_status == 'delivered' and order.payment_method == 'cash_on_delivery':
            # PIN verification required before marking delivered
            pin_log = getattr(order, 'pin_log', None)
            if not pin_log or not pin_log.is_verified:
                return Response(
                    {'error': 'Delivery PIN verification required before marking as delivered'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        order.status = new_status
        order.save()

        if order.status == 'picked_up':
            order.save()

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

        data = OrderSerializer(order).data
        # Never leak the COD PIN to the driver app.
        data.pop('delivery_pin', None)

        return Response(data)


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


# ============================================================
# SELLER WALLET & PAYOUT VIEWS
# ============================================================

class SellerWalletView(APIView):
    """Seller sees gross revenue, commission, net earnings and available balance."""
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSeller]

    def get(self, request):
        seller = request.user
        # Admins querying with ?seller_id= can inspect a seller wallet
        if seller.role == 'admin':
            from django.contrib.auth import get_user_model
            seller_id = request.query_params.get('seller_id')
            if seller_id:
                try:
                    seller = get_user_model().objects.get(pk=seller_id, role='seller')
                except Exception:
                    return Response({'error': 'Seller not found'}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({'error': 'seller_id query param required for admins'}, status=status.HTTP_400_BAD_REQUEST)
        wallet = get_seller_wallet(seller)
        return Response(SellerWalletSerializer(wallet).data)


class SellerPayoutListCreateView(generics.ListCreateAPIView):
    """Seller lists own payouts and requests new withdrawals."""
    serializer_class = PayoutSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSeller]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return Payout.objects.all().select_related('seller').order_by('-requested_at')
        return Payout.objects.filter(seller=self.request.user).order_by('-requested_at')

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)


class AdminPayoutActionView(APIView):
    """Admin approves / marks paid / rejects a payout request."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        try:
            payout = Payout.objects.get(pk=pk)
        except Payout.DoesNotExist:
            return Response({'error': 'Payout not found'}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get('action', '')
        note = request.data.get('admin_note', '')
        if action not in ['approve', 'pay', 'reject']:
            return Response({'error': 'action must be approve, pay or reject'}, status=status.HTTP_400_BAD_REQUEST)
        mapping = {'approve': 'approved', 'pay': 'paid', 'reject': 'rejected'}
        payout.status = mapping[action]
        payout.admin_note = note
        payout.processed_at = timezone.now()
        payout.save()
        return Response(PayoutSerializer(payout).data)


class SellerOrderListView(generics.ListAPIView):
    """Seller sees all their own orders (orders for their products)."""
    serializer_class = SellerOrderListSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSeller]

    def get_queryset(self):
        seller = self.request.user
        if seller.role == 'admin':
            return Order.objects.all().prefetch_related('items').select_related('buyer', 'driver').order_by('-created_at')
        return Order.objects.filter(items__seller=seller).distinct().prefetch_related('items').select_related('buyer', 'driver').order_by('-created_at')


class VerifyDeliveryPinView(APIView):
    """Verify the 4-digit delivery PIN for a cash_on_delivery order."""
    permission_classes = [permissions.IsAuthenticated, IsDriver]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, driver=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        if order.payment_method != 'cash_on_delivery':
            return Response({'error': 'PIN not required for this order'}, status=status.HTTP_400_BAD_REQUEST)

        code = request.data.get('code', '').strip()
        if not code or len(code) != 4 or not code.isdigit():
            return Response({'error': 'PIN must be a 4-digit code'}, status=status.HTTP_400_BAD_REQUEST)

        pin_log = getattr(order, 'pin_log', None)
        if not pin_log:
            return Response({'error': 'PIN log not found'}, status=status.HTTP_404_NOT_FOUND)

        if pin_log.is_verified:
            return Response({'message': 'PIN already verified', 'verified': True})

        if code == pin_log.code:
            pin_log.is_verified = True
            pin_log.verified_at = timezone.now()
            pin_log.save()
            order.pin_verified = True
            order.save()
            return Response({'message': 'PIN verified successfully', 'verified': True})
        else:
            pin_log.attempts += 1
            pin_log.save()
            remaining = max(0, 3 - pin_log.attempts)
            return Response({'error': f'Invalid PIN. {remaining} attempts remaining.'}, status=status.HTTP_400_BAD_REQUEST)


class PaystackWebhookView(APIView):
    """Receive Paystack webhook for payment verification."""
    permission_classes = []  # Allow webhook access without auth

    def post(self, request):
        """Handle Paystack webhook events."""
        secret = (settings.PAYSTACK_SECRET_KEY or settings.PAYSTACK_WEBHOOK_SECRET or '').strip()
        signature = request.META.get('HTTP_X_PAYSTACK_SIGNATURE', '')

        # Verify HMAC-SHA512 signature when a secret is configured.
        # Paystack signs the raw request body with the SECRET key.
        if secret and signature:
            computed = hmac.new(secret.encode(), request.body, hashlib.sha512).hexdigest()
            if not hmac.compare_digest(computed, signature):
                return Response({'error': 'Invalid signature'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            data = request.data
            event = data.get('event', '')
            txn = data.get('data', {}) or {}
            reference = txn.get('reference', '')
            status_val = txn.get('status', '')
            metadata = txn.get('metadata', {}) or {}
            order_id = metadata.get('order_id')

            order = None
            if order_id:
                try:
                    order = Order.objects.get(pk=order_id)
                except Order.DoesNotExist:
                    order = None
            if order is None and reference:
                try:
                    order = Order.objects.get(paystack_reference=reference)
                except Order.DoesNotExist:
                    try:
                        order = Order.objects.get(payment_reference=reference)
                    except Order.DoesNotExist:
                        order = None

            if event == 'charge.success' and status_val == 'success':
                if order is None:
                    return Response({'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
                order.payment_status = 'paid'
                order.paid_at = timezone.now()
                order.paystack_reference = reference
                order.save()
                return Response({'message': 'Payment verified and order marked as paid'})

            if event == 'charge.failed':
                if order is None:
                    return Response({'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
                order.payment_status = 'failed'
                order.save()
                return Response({'message': 'Payment marked as failed'})

            return Response({'message': 'Webhook received'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


def _paystack_headers():
    secret = (settings.PAYSTACK_SECRET_KEY or '').strip()
    return {
        'Authorization': f'Bearer {secret}',
        'Content-Type': 'application/json',
    }


class PaystackInitializeView(APIView):
    """Start a Paystack transaction for an order. Returns authorization_url + reference."""
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def post(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({'error': 'order_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            order = Order.objects.get(pk=order_id, buyer=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        if order.status == 'cancelled':
            return Response({'error': 'Order was cancelled'}, status=status.HTTP_400_BAD_REQUEST)
        if order.payment_status == 'paid':
            return Response({'message': 'Order already paid', 'paid': True})

        secret = (settings.PAYSTACK_SECRET_KEY or '').strip()
        if not secret:
            return Response(
                {'error': 'Paystack is not configured on the server (PAYSTACK_SECRET_KEY missing)'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        amount_pesewas = int(order.total * 100)
        reference = order.paystack_reference or f'JAYS-{order.id}-{int(timezone.now().timestamp())}'
        payload = {
            'email': request.user.email,
            'amount': amount_pesewas,
            'currency': 'GHS',
            'reference': reference,
            'metadata': {'order_id': order.id, 'buyer': request.user.email},
        }
        callback_url = (getattr(settings, 'FRONTEND_URL', '') or '').strip()
        if callback_url:
            payload['callback_url'] = callback_url.rstrip('/') + f'/orders/{order.id}/track'

        try:
            resp = requests.post(
                'https://api.paystack.co/transaction/initialize',
                json=payload, headers=_paystack_headers(), timeout=20,
            )
        except requests.RequestException:
            return Response({'error': 'Could not reach Paystack. Try again.'}, status=status.HTTP_502_BAD_GATEWAY)

        try:
            body = resp.json()
        except ValueError:
            return Response({'error': 'Invalid response from Paystack'}, status=status.HTTP_502_BAD_GATEWAY)

        if not body.get('status') or 'data' not in body:
            return Response(
                {'error': body.get('message', 'Paystack rejected the transaction')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.payment_method = 'paystack'
        order.paystack_reference = body['data'].get('reference', reference)
        order.save(update_fields=['payment_method', 'paystack_reference'])

        return Response({
            'authorization_url': body['data'].get('authorization_url'),
            'access_code': body['data'].get('access_code'),
            'reference': order.paystack_reference,
            'amount': str(order.total),
        })


class PaystackVerifyView(APIView):
    """Verify a Paystack reference after checkout. Marks the order paid on success."""
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def post(self, request):
        reference = (request.data.get('reference') or '').strip()
        if not reference:
            return Response({'error': 'reference is required'}, status=status.HTTP_400_BAD_REQUEST)

        secret = (settings.PAYSTACK_SECRET_KEY or '').strip()
        if not secret:
            return Response(
                {'error': 'Paystack is not configured on the server (PAYSTACK_SECRET_KEY missing)'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            resp = requests.get(
                f'https://api.paystack.co/transaction/verify/{reference}',
                headers=_paystack_headers(), timeout=20,
            )
        except requests.RequestException:
            return Response({'error': 'Could not reach Paystack. Try again.'}, status=status.HTTP_502_BAD_GATEWAY)

        try:
            body = resp.json()
        except ValueError:
            return Response({'error': 'Invalid response from Paystack'}, status=status.HTTP_502_BAD_GATEWAY)

        txn = (body.get('data') or {}) if body.get('status') else {}
        if not txn or txn.get('status') != 'success':
            return Response({'paid': False, 'message': 'Payment not successful'}, status=status.HTTP_400_BAD_REQUEST)

        metadata = txn.get('metadata') or {}
        order = None
        if metadata.get('order_id'):
            order = Order.objects.filter(pk=metadata['order_id'], buyer=request.user).first()
        if order is None:
            order = Order.objects.filter(paystack_reference=reference, buyer=request.user).first()
        if order is None:
            order = Order.objects.filter(payment_reference=reference, buyer=request.user).first()
        if order is None:
            return Response({'error': 'Order not found for this reference'}, status=status.HTTP_404_NOT_FOUND)

        # Confirm the paid amount covers the order total (tolerate 1 pesewa rounding).
        paid_pesewas = int(txn.get('amount') or 0)
        expected = int(order.total * 100)
        if paid_pesewas + 1 < expected:
            return Response({'paid': False, 'message': 'Amount paid does not match order total'}, status=status.HTTP_400_BAD_REQUEST)

        order.payment_method = 'paystack'
        order.payment_status = 'paid'
        order.paid_at = timezone.now()
        order.paystack_reference = reference
        order.save()

        return Response({'paid': True, 'order_id': order.id, 'message': 'Payment confirmed'})