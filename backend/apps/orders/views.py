import hashlib
import hmac
import random
import uuid

import requests
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db import transaction
from django.conf import settings
from .models import Order, OrderItem, Cart, CartItem, DeliveryRating, Coupon, Payout, Settlement, PLATFORM_COMMISSION_RATE, DeliveryOTPLog, calculate_delivery_fee
from .otp_utils import generate_otp, hash_otp, verify_otp, get_otp_expiry
from .emails import (
    send_payment_confirmation,
    send_delivery_otp,
    send_seller_sale_alert,
    send_delivered_email,
    send_admin_payment_alert,
)
from .payments import (
    compute_processing_fee,
    compute_order_split,
    allocate_fee,
    create_transaction_split,
    initialize_split_transaction,
    initialize_plain_transaction,
    notify_buyer_of_otp,
)
from .serializers import (
    CartSerializer,
    AddToCartSerializer,
    OrderSerializer,
    OrderListSerializer,
    PlaceOrderSerializer,
    DriverOrderListSerializer,
    DriverAcceptOrderSerializer,
    DriverHistorySerializer,
    UpdateOrderStatusSerializer,
    DeliveryRatingSerializer,
    CouponSerializer,
    ValidateCouponSerializer,
    PayoutSerializer,
    SellerWalletSerializer,
    SellerOrderListSerializer,
    SettlementSerializer,
    EmailLogSerializer,
)
from apps.core.permissions import IsBuyer, IsDriver, IsAdmin, IsAdminOrSeller, IsSeller
from decimal import Decimal
from django.db.models import Sum


def get_seller_wallet(seller):
    gross = Decimal('0.00')
    # Seller credited immediately when buyer pays (not after delivery)
    for item in OrderItem.objects.filter(seller=seller, order__payment_status='paid').select_related('order'):
        gross += Decimal(str(item.unit_price)) * item.quantity
    # Platform commission = 10% of product price (captured at payment)
    commission = gross * Decimal(str(PLATFORM_COMMISSION_RATE))
    net = gross - commission
    agg = Payout.objects.filter(seller=seller, status__in=['approved', 'paid']).aggregate(total=Sum('amount'))
    paid_out = agg['total'] or Decimal('0.00')
    agg2 = Payout.objects.filter(seller=seller, status='pending').aggregate(total=Sum('amount'))
    pending = agg2['total'] or Decimal('0.00')
    # Available = what's in seller balance (credited at payment) minus withdrawals
    available = Decimal(str(seller.seller_balance)) - Decimal(str(paid_out)) - Decimal(str(pending))
    return {
        'gross_revenue': gross,
        'commission_rate': PLATFORM_COMMISSION_RATE,
        'commission_paid': commission,
        'net_earnings': net,
        'paid_out': paid_out,
        'pending_payouts': pending,
        'available_balance': max(Decimal('0.00'), available),
        'seller_balance': seller.seller_balance,
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
    Paystack-only checkout with instant split settlement.

    Creates the order UNPAID, builds a per-order Paystack transaction split
    (each seller's net share settles straight to their subaccount), then
    initializes the single buyer charge. The buyer is redirected to Paystack;
    nothing is emailed until payment confirms (verify endpoint / webhook).
    """
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    @transaction.atomic
    def post(self, request):
        serializer = PlaceOrderSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        cart = serializer.validated_data['cart']
        
        # VALIDATE ALL SELLERS HAVE ACTIVE SUBACCOUNTS
        invalid_sellers = []
        for cart_item in cart.cart_items.select_related('product__seller', 'product__created_by'):
            seller = cart_item.product.seller or cart_item.product.created_by
            if seller and seller.role == 'seller':
                if not seller.paystack_subaccount_code or seller.subaccount_status != 'active':
                    invalid_sellers.append({
                        'name': seller.store_name or seller.email,
                        'product': cart_item.product.name
                    })
        
        if invalid_sellers:
            return Response({
                'error': 'Some sellers in your cart have incomplete payment setup.',
                'invalid_sellers': invalid_sellers
            }, status=status.HTTP_400_BAD_REQUEST)
        total_items = sum(ci.quantity for ci in cart.cart_items.all())
        delivery_fee = calculate_delivery_fee(total_items)
        subtotal = cart.total

        # No promo codes — removed from checkout
        discount_amount = Decimal('0.00')

        total = max(Decimal('0.00'), subtotal + delivery_fee)
        # Gateway fee passed on to buyer + sellers (pro-rata, see payments.py)
        processing_fee = compute_processing_fee(total)

        commission_rate = Decimal('0.10')

        # Generate OTP (4-digit, cryptographically secure) now; it is EMAILED only after payment
        # confirms, and NOT returned in any API response for security
        otp_code = generate_otp()
        otp_hash = hash_otp(otp_code)
        otp_expires_at = get_otp_expiry()

        # Calculate commission collected from buyers BEFORE creating order
        # This is the markup collected: (buyer paid - seller net) for all items
        commission_collected_total = Decimal('0.00')
        for cart_item in cart.cart_items.select_related('product'):
            buyer_line_total = cart_item.product.display_price * cart_item.quantity
            seller_line_total = cart_item.product.effective_price * cart_item.quantity
            commission_collected_total += (buyer_line_total - seller_line_total)

        order = Order.objects.create(
            buyer=request.user,
            delivery_address=serializer.validated_data['delivery_address'],
            delivery_phone=serializer.validated_data['delivery_phone'],
            delivery_note=serializer.validated_data.get('delivery_note', ''),
            delivery_landmark=serializer.validated_data.get('delivery_landmark', ''),
            subtotal=subtotal,
            discount_amount=Decimal('0.00'),
            delivery_fee=delivery_fee,
            total=total,
            processing_fee=processing_fee,
            payment_method='paystack',
            payment_status='unpaid',
            driver_earnings=Decimal('0.00'),  # drivers paid physically, out-of-system
            commission_rate=commission_rate,
            commission_collected=commission_collected_total,  # NEW: Store calculated commission
        )

        seller_lines = {}  # seller_id -> [seller, line_total]
        platform_direct = Decimal('0.00')  # items with no vendor → platform keeps all
        for cart_item in cart.cart_items.select_related('product', 'variant'):
            primary_image = cart_item.product.images.filter(is_primary=True).first()
            image_url = ''
            if primary_image:
                image_url = primary_image.url or ''

            commission_rate_at_purchase = cart_item.product.commission_rate_effective
            seller = cart_item.product.seller or cart_item.product.created_by
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                variant=cart_item.variant,
                seller=seller,
                product_name=cart_item.product.name,
                product_image=image_url,
                size=cart_item.variant.size,
                color=cart_item.variant.color,
                unit_price=cart_item.product.display_price,  # What buyer pays (includes commission)
                seller_net_price=cart_item.product.effective_price,  # What seller receives
                quantity=cart_item.quantity,
                commission_rate=commission_rate_at_purchase,
            )

            # NOTE: no seller_balance crediting — sellers settle instantly via
            # Paystack split, funds never touch the platform.
            # Use seller_net_price (what they receive), not display_price
            line_total = Decimal(str(cart_item.product.effective_price)) * cart_item.quantity
            if seller and seller.role == 'seller':
                line = seller_lines.setdefault(seller.id, [seller, Decimal('0.00')])
                line[1] += line_total
            else:
                platform_direct += line_total
            
            # STOCK DEDUCTION REMOVED - happens after payment confirms in _confirm_payment()

        # Per-seller shares: net amounts (commission already collected from buyer in order total)
        # Platform-listed items (no vendor) go entirely to the admin share.
        per_seller, _ = compute_order_split(
            [(s, t) for s, t in seller_lines.values()]
        )
        # FIX: Use actual commission collected from buyers, not zero-value from per_seller
        # Platform receives: commission markup + delivery fee + platform-owned items
        admin_gross = commission_collected_total + delivery_fee + platform_direct
        admin_net = allocate_fee(per_seller, admin_gross, processing_fee)
        
        # Log split breakdown for debugging and verification
        import logging
        logger = logging.getLogger(__name__)
        sellers_total_net = sum(e['net'] for e in per_seller.values())
        logger.info(
            f'Order {order.id} Paystack split | '
            f'Buyer charged: {total + processing_fee:.2f} GHS | '
            f'Sellers net: {sellers_total_net:.2f} GHS | '
            f'Commission: {commission_collected_total:.2f} GHS | '
            f'Delivery: {delivery_fee:.2f} GHS | '
            f'Platform items: {platform_direct:.2f} GHS | '
            f'Admin gross: {admin_gross:.2f} GHS | '
            f'Processing fee: {processing_fee:.2f} GHS'
        )

        # SETTLEMENT CREATION REMOVED - happens after payment confirms in _confirm_payment()

        # OTP log created now; emailed only after payment confirms.
        # Stored as hash with 15-minute expiry and 3-attempt lockout
        DeliveryOTPLog.objects.create(
            order=order,
            otp_hash=otp_hash,
            otp_expires_at=otp_expires_at,
            buyer_notified=False,
            buyer_notification_method='email',
            is_locked=False,
        )

        request.user.total_orders += 1
        request.user.save()

        # CART CLEARING MOVED - happens after successful payment init (below)

        # VALIDATION: Verify split math before creating Paystack split
        # Since Paystack gives platform the "remainder", we must ensure
        # our calculation matches what Paystack will actually do
        buyer_total_charged = total + processing_fee  # What buyer pays
        sellers_total = sum(e['net'] for e in per_seller.values())  # What sellers receive
        expected_platform_share = admin_gross  # commission + delivery + platform_items

        # Calculate what platform WILL receive using Paystack's remainder logic
        actual_platform_share = buyer_total_charged - sellers_total - processing_fee

        # Check if our calculation matches what Paystack will do
        calculation_diff = abs(expected_platform_share - actual_platform_share)

        if calculation_diff > Decimal('0.10'):  # Tolerance: 10 pesewas
            logger.error(
                f'Order {order.id} SPLIT VALIDATION FAILED | '
                f'Expected platform: {expected_platform_share:.2f} GHS | '
                f'Actual platform (Paystack remainder): {actual_platform_share:.2f} GHS | '
                f'Difference: {calculation_diff:.2f} GHS | '
                f'Buyer charged: {buyer_total_charged:.2f} | '
                f'Sellers total: {sellers_total:.2f} | '
                f'Processing fee: {processing_fee:.2f}'
            )
            # STRICT MODE: Fail order creation to prevent incorrect split
            raise ValueError(
                f'Payment split validation failed: Platform share mismatch. '
                f'Expected {expected_platform_share:.2f} GHS but Paystack will give '
                f'{actual_platform_share:.2f} GHS. Difference: {calculation_diff:.2f} GHS. '
                f'This indicates a calculation error. Please contact support.'
            )

        # Log successful validation
        logger.info(
            f'Order {order.id} split validation PASSED | '
            f'Platform will receive: {actual_platform_share:.2f} GHS '
            f'(Commission: {commission_collected_total:.2f}, '
            f'Delivery: {delivery_fee:.2f}, '
            f'Platform items: {platform_direct:.2f}) | '
            f'Sellers receive: {sellers_total:.2f} GHS'
        )

        # Create the Paystack split + initialize the buyer charge.
        # (No vendor shares → plain charge, platform keeps everything.)
        try:
            seller_shares = [
                (e['seller'].paystack_subaccount_code, e['net'])
                for e in per_seller.values()
            ]
            if seller_shares:
                split = create_transaction_split(
                    name=f'Jays Store order {order.id}',
                    seller_shares=seller_shares,
                    bearer_share=admin_gross,  # Expected platform share (for logging/validation)
                    metadata={
                        'order_id': order.id,
                        'commission': float(commission_collected_total),
                        'delivery_fee': float(delivery_fee),
                        'platform_items': float(platform_direct),
                        'expected_platform_total': float(admin_gross),
                    }
                )
                order.paystack_split_code = split.get('split_code', '')
                order.save(update_fields=['paystack_split_code'])

            reference = f'JAYS-{order.id}-{uuid.uuid4().hex}'
            callback_base = (getattr(settings, 'FRONTEND_URL', '') or '').strip()
            callback_url = callback_base.rstrip('/') + f'/orders/{order.id}/track' if callback_base else None
            if order.paystack_split_code:
                init = initialize_split_transaction(
                    email=request.user.email,
                    gross_total=total + processing_fee,
                    reference=reference,
                    split_code=order.paystack_split_code,
                    order_id=order.id,
                    callback_url=callback_url,
                )
            else:
                init = initialize_plain_transaction(
                    email=request.user.email,
                    gross_total=total + processing_fee,
                    reference=reference,
                    order_id=order.id,
                    callback_url=callback_url,
                )
            order.paystack_reference = init.get('reference', reference)
            order.save(update_fields=['paystack_reference'])
            
            # CART CLEARED ONLY AFTER SUCCESSFUL PAYMENT INIT
            cart.cart_items.all().delete()
            
        except Exception as exc:
            # Order stays UNPAID — buyer retries from My Orders → Pay Now.
            # Cart is PRESERVED on failure so buyer can retry
            response_data = OrderSerializer(order, context={'request': request}).data
            response_data['payment_init_failed'] = str(exc)
            response_data['message'] = 'Order created but payment failed to start. Cart preserved - retry from My Orders.'
            return Response(response_data, status=status.HTTP_502_BAD_GATEWAY)

        response_data = OrderSerializer(order, context={'request': request}).data
        response_data['authorization_url'] = init.get('authorization_url')
        response_data['access_code'] = init.get('access_code')
        response_data['reference'] = order.paystack_reference
        response_data['processing_fee'] = str(processing_fee)
        response_data['charged_total'] = str(total + processing_fee)
        response_data['admin_net'] = str(admin_net)

        return Response(response_data, status=status.HTTP_201_CREATED)


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
    """Buyer cancels an UNPAID order. Paid orders cannot be cancelled —
    instant settlement has already paid the sellers."""
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

        if order.payment_status == 'paid':
            return Response(
                {'error': 'This order is already paid and cannot be cancelled. '
                          'Your sellers have been settled instantly — please contact support.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Restore stock only if payment was confirmed (stock was deducted)
        # Unpaid orders never deducted stock in the new flow
        if order.payment_status == 'paid':
            for item in order.items.select_related('variant'):
                if item.variant:
                    item.variant.stock += item.quantity
                    item.variant.save(update_fields=['stock'])

        order.status = 'cancelled'
        order.save()
        # No settlements exist for unpaid orders in new flow
        # (settlements created only after payment confirms)

        request.user.cancelled_orders += 1
        request.user.save()

        return Response({'message': 'Order cancelled successfully'})


# ============================================================
# ORDER VIEWS — DRIVER
# ============================================================

class DriverAvailableOrdersView(generics.ListAPIView):
    """
    Driver sees all PAID pending orders available to accept.
    Unpaid orders are invisible until the buyer completes Paystack payment.
    Only shows general area — not full address yet.
    """
    serializer_class = DriverOrderListSerializer
    permission_classes = [permissions.IsAuthenticated, IsDriver]

    def get_queryset(self):
        return Order.objects.filter(
            status='pending', payment_status='paid'
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
            order = Order.objects.select_for_update().get(
                pk=pk, status='pending', payment_status='paid')
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not available (it may be unpaid or already taken)'},
                status=status.HTTP_404_NOT_FOUND
            )

        order.driver = request.user
        order.status = 'accepted'
        order.accepted_at = timezone.now()
        order.save()

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

        if new_status == 'delivered':
            # OTP verification required before marking delivered
            otp_log = getattr(order, 'otp_log', None)
            if not otp_log or not otp_log.is_verified:
                return Response(
                    {'error': 'Delivery OTP verification required before marking as delivered'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        order.status = new_status
        order.save()

        if order.status == 'picked_up':
            order.save()

        # When order is delivered, update stats.
        # Driver money is out-of-system (admin pays physically) — no crediting.
        if order.status == 'delivered':
            order.delivered_at = timezone.now()
            order.save()

            send_delivered_email(order)

            driver = request.user
            driver.total_deliveries += 1
            driver.successful_deliveries += 1
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
    serializer_class = DriverHistorySerializer
    permission_classes = [permissions.IsAuthenticated, IsDriver]

    def get_queryset(self):
        return Order.objects.filter(
            driver=self.request.user
        ).prefetch_related('items').order_by('-created_at')


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

class StorePageView(APIView):
    """Dedicated vendor storefront — shows vendor profile + their products only."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, store_slug):
        from apps.accounts.models import CustomUser
        try:
            vendor = CustomUser.objects.get(store_slug=store_slug, role='seller')
        except CustomUser.DoesNotExist:
            return Response({'error': 'Store not found'}, status=status.HTTP_404_NOT_FOUND)

        # Vendor's products only
        from apps.products.serializers import ProductListSerializer
        products = vendor.store_products.filter(is_active=True)

        wallet = get_seller_wallet(vendor)
        data = {
            'vendor_id': vendor.id,
            'store_name': vendor.store_name,
            'store_slug': vendor.store_slug,
            'store_description': vendor.store_description,
            'store_address': vendor.store_address,
            'store_logo': vendor.store_logo.url if vendor.store_logo else None,
            'store_banner': vendor.store_banner.url if vendor.store_banner else None,
            'verified': vendor.verification_status == 'approved',
            'social_links': {
                'facebook': getattr(vendor, 'facebook_url', None) or None,
                'instagram': getattr(vendor, 'instagram_url', None) or None,
                'twitter': getattr(vendor, 'twitter_url', None) or None,
            },
            'wallet': SellerWalletSerializer(wallet).data,
            'products': ProductListSerializer(products, many=True, context={'request': request}).data,
        }
        return Response(data)


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


class VerifyDeliveryOTPView(APIView):
    """Driver submits the 4-digit OTP the buyer received via email.

    Security:
    - OTP is hashed in database, never stored plaintext
    - Expires after 15 minutes
    - Hard lockout after 3 failed attempts
    - Rate limited per order
    """
    permission_classes = [permissions.IsAuthenticated, IsDriver]
    throttle_scope = 'otp'

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, driver=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        code = request.data.get('code', '').strip()
        if not code or len(code) != 4 or not code.isdigit():
            return Response({'error': 'OTP must be a 4-digit code'}, status=status.HTTP_400_BAD_REQUEST)

        otp_log = getattr(order, 'otp_log', None)
        if not otp_log:
            return Response({'error': 'OTP log not found'}, status=status.HTTP_404_NOT_FOUND)

        if otp_log.is_verified:
            return Response({'message': 'OTP already verified', 'verified': True})

        if otp_log.is_locked:
            return Response(
                {'error': 'OTP verification locked. Too many failed attempts. Contact support.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if timezone.now() > otp_log.otp_expires_at:
            return Response(
                {'error': 'OTP expired. Request a new one.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if verify_otp(code, otp_log.otp_hash):
            otp_log.is_verified = True
            otp_log.verified_at = timezone.now()
            otp_log.save()
            order.pin_verified = True
            order.save()
            return Response({'message': 'OTP verified successfully', 'verified': True})
        else:
            otp_log.attempts += 1
            if otp_log.attempts >= 3:
                otp_log.is_locked = True
            otp_log.save()
            
            if otp_log.is_locked:
                return Response(
                    {'error': 'OTP verification locked after 3 failed attempts. Contact support.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            remaining = max(0, 3 - otp_log.attempts)
            return Response(
                {'error': f'Invalid OTP. {remaining} attempts remaining.'},
                status=status.HTTP_400_BAD_REQUEST
            )


def _confirm_payment(order):
    """First-paid actions: deduct stock, create settlements, send emails.

    Order matters: 
    1. Deduct stock (payment confirmed, inventory committed)
    2. Create settlement records (for reporting/audit)
    3. Send emails (admin → sellers → buyer)
    
    Each send never raises (see emails.py). Shared SMTP connection prevents
    Gmail from dropping rapid back-to-back sends.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # STEP 1: DEDUCT STOCK (payment confirmed)
    for item in order.items.select_related('variant'):
        if item.variant:
            variant = item.variant
            if variant.stock >= item.quantity:
                variant.stock -= item.quantity
                variant.save(update_fields=['stock'])
            else:
                # Edge case: stock sold out between order placement and payment
                logger.warning(
                    f'Stock shortage for variant {variant.id} in order {order.id}: '
                    f'needed {item.quantity}, available {variant.stock}'
                )
                # Still process payment (money already collected)
                # Admin handles fulfillment manually
    
    # STEP 2: CREATE SETTLEMENT RECORDS (for paid orders only)
    # Recalculate seller shares from order items
    seller_shares = {}
    for item in order.items.select_related('seller'):
        seller = item.seller
        if seller and seller.role == 'seller':
            if seller.id not in seller_shares:
                seller_shares[seller.id] = {
                    'seller': seller,
                    'gross': Decimal('0.00'),
                }
            # Use seller_net_price (what they receive), not unit_price (what buyer paid)
            seller_shares[seller.id]['gross'] += item.seller_net_price * item.quantity
    
    # Create settlement records
    for entry in seller_shares.values():
        seller = entry['seller']
        gross = entry['gross']
        commission = Decimal('0.00')  # No commission deducted in buyer-pays model
        fee_slice = Decimal('0.00')  # Buyer covers gateway fee (bearer_type='account')
        net = gross
        
        Settlement.objects.create(
            order=order,
            seller=seller,
            subaccount_code=seller.paystack_subaccount_code,
            gross_share=gross,
            commission=commission,
            fee_slice=fee_slice,
            net_share=net,
            status='settled',  # Immediately settled (Paystack split executed)
            settled_at=timezone.now(),
            paystack_reference=order.paystack_reference,
        )
    
    # Log expected vs actual platform share for verification
    expected_platform = order.commission_collected + order.delivery_fee
    logger.info(
        f'Order {order.id} payment confirmed | '
        f'Platform should receive: {expected_platform:.2f} GHS | '
        f'(Commission: {order.commission_collected:.2f}, Delivery: {order.delivery_fee:.2f}) | '
        f'Verify in Paystack: https://dashboard.paystack.com/#/settlements | '
        f'Split code: {order.paystack_split_code}'
    )
    
    # STEP 3: SEND EMAILS (admin → sellers → buyer)
    from django.core.mail import get_connection
    try:
        connection = get_connection()
        connection.open()
    except Exception:
        connection = None
    
    try:
        send_admin_payment_alert(order, connection=connection)
        send_seller_sale_alert(order, connection=connection)

        # OTP is stored hashed — generate a fresh code here, persist hash+expiry,
        # and email the plaintext once. Never persist or return plaintext.
        from .otp_utils import generate_otp as _gen_otp, hash_otp as _hash_otp, get_otp_expiry as _otp_expiry
        otp_log = getattr(order, 'otp_log', None)
        otp = _gen_otp()
        if otp_log:
            otp_log.otp_hash = _hash_otp(otp)
            otp_log.otp_expires_at = _otp_expiry()
            otp_log.attempts = 0
            otp_log.is_locked = False
            otp_log.is_verified = False
            otp_log.verified_at = None
            otp_log.save(update_fields=['otp_hash', 'otp_expires_at', 'attempts', 'is_locked', 'is_verified', 'verified_at'])

        # Send payment confirmation with OTP included
        buyer_ok = send_payment_confirmation(order, otp_code=otp, connection=connection)
        
        # Don't send separate OTP email - it's already in payment confirmation above
        # (Removed duplicate notify_buyer_of_otp call to avoid confusion)
        
        if not buyer_ok:
            logger.error(f'Payment confirmation email failed for order {order.id} buyer {order.buyer.email}')
            # Don't raise - payment already processed, just log the email failure
    finally:
        try:
            if connection is not None:
                connection.close()
        except Exception:
            pass


class PaystackWebhookView(APIView):
    """Receive Paystack webhook for payment verification with MANDATORY security checks."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        """Handle Paystack webhook events with signature verification and amount validation."""
        import logging
        logger = logging.getLogger(__name__)
        
        # SECURITY: Require secret configured
        secret = (settings.PAYSTACK_WEBHOOK_SECRET or settings.PAYSTACK_SECRET_KEY or '').strip()
        if not secret:
            logger.critical('Webhook received but PAYSTACK_WEBHOOK_SECRET not configured - SECURITY RISK')
            return Response(
                {'error': 'Webhook verification not configured on server'}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # SECURITY: Require signature header present
        signature = request.META.get('HTTP_X_PAYSTACK_SIGNATURE', '')
        if not signature:
            logger.warning(f'Webhook received without signature from IP {request.META.get("REMOTE_ADDR")}')
            return Response(
                {'error': 'Missing signature header'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # SECURITY: Verify HMAC-SHA512 signature
        computed = hmac.new(secret.encode(), request.body, hashlib.sha512).hexdigest()
        if not hmac.compare_digest(computed, signature):
            logger.warning(f'Invalid webhook signature from IP {request.META.get("REMOTE_ADDR")}')
            return Response(
                {'error': 'Invalid signature'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            data = request.data
            event = data.get('event', '')
            txn = data.get('data', {}) or {}
            reference = txn.get('reference', '')
            status_val = txn.get('status', '')
            metadata = txn.get('metadata', {}) or {}
            order_id = metadata.get('order_id') or None
            if not order_id:
                for field in metadata.get('custom_fields') or []:
                    if field.get('variable_name') == 'order_id':
                        order_id = field.get('value')
                        break

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
                
                # SECURITY: Validate payment amount matches order total
                paid_pesewas = int(txn.get('amount') or 0)
                expected_pesewas = int((Decimal(str(order.total)) + Decimal(str(order.processing_fee or 0))) * 100)
                
                # Allow 1 pesewa tolerance for rounding
                if paid_pesewas + 1 < expected_pesewas:
                    logger.warning(
                        f'Webhook amount mismatch for order {order.id}: '
                        f'expected {expected_pesewas} pesewas, received {paid_pesewas} pesewas'
                    )
                    return Response(
                        {'error': 'Payment amount does not match order total'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # RACE CONDITION FIX: Lock order during payment confirmation
                with transaction.atomic():
                    order = Order.objects.select_for_update().get(pk=order.id)
                    first_time_paid = order.payment_status != 'paid'
                    order.payment_status = 'paid'
                    order.paid_at = timezone.now()
                    order.paystack_reference = reference
                    try:
                        order.paystack_fee_actual = Decimal(str(int(txn.get('fees') or 0))) / 100
                    except Exception:
                        pass
                    order.save()
                
                # Email sending after transaction commits (outside lock)
                if first_time_paid:
                    _confirm_payment(order)
                
                return Response({'message': 'Payment verified and order marked as paid'})

            if event == 'charge.failed':
                if order is None:
                    return Response({'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
                order.payment_status = 'failed'
                order.save()
                return Response({'message': 'Payment marked as failed'})

            return Response({'message': 'Webhook received'}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception('Webhook processing error')
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


def _paystack_headers():
    secret = (settings.PAYSTACK_SECRET_KEY or '').strip()
    return {
        'Authorization': f'Bearer {secret}',
        'Content-Type': 'application/json',
    }


class PaystackInitializeView(APIView):
    """Start (or retry) the Paystack transaction for an order.

    Charges total + processing_fee in one go, carrying the order's
    transaction split so sellers settle instantly to their subaccounts.
    """
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def post(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({'error': 'order_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            order = Order.objects.prefetch_related('items', 'settlements').get(
                pk=order_id, buyer=request.user)
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

        try:
            # Reuse the placement-time split; recreate for legacy orders.
            if not order.paystack_split_code:
                split_entries = {}
                for item in order.items.select_related('seller').all():
                    seller = item.seller
                    if not seller or seller.role != 'seller':
                        continue
                    entry = split_entries.setdefault(
                        seller.id,
                        {'seller': seller, 'subaccount': seller.paystack_subaccount_code,
                         'gross': Decimal('0.00')})
                    entry['gross'] += Decimal(str(item.unit_price)) * item.quantity
                rate = Decimal(str(PLATFORM_COMMISSION_RATE))
                for e in split_entries.values():
                    e['commission'] = e['gross'] * rate
                admin_nb = (sum((e['commission'] for e in split_entries.values()), Decimal('0.00'))
                            + Decimal(str(order.delivery_fee)))
                allocate_fee(split_entries, admin_nb, Decimal(str(order.processing_fee or 0)))
                shares = [(v['subaccount'], v['net'])
                          for v in split_entries.values() if v.get('subaccount')]
                if shares:
                    split = create_transaction_split(
                        name=f'Jays Store order {order.id}',
                        seller_shares=shares,
                    )
                    order.paystack_split_code = split.get('split_code', '')
                    order.save(update_fields=['paystack_split_code'])

            gross_total = Decimal(str(order.total)) + Decimal(str(order.processing_fee or 0))
            # Always mint a brand-new UUID reference. Reusing a previous
            # reference makes Paystack reject retries with
            # "Duplicate Transaction Reference". Verify looks up by
            # metadata.order_id, so old pending inits are harmless.
            reference = f'JAYS-{order.id}-{uuid.uuid4().hex}'
            callback_base = (getattr(settings, 'FRONTEND_URL', '') or '').strip()
            callback_url = callback_base.rstrip('/') + f'/orders/{order.id}/track' if callback_base else None
            init_kwargs = dict(
                email=request.user.email,
                gross_total=gross_total,
                reference=reference,
                order_id=order.id,
                callback_url=callback_url,
            )
            if order.paystack_split_code:
                init = initialize_split_transaction(split_code=order.paystack_split_code, **init_kwargs)
            else:
                init = initialize_plain_transaction(**init_kwargs)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        order.payment_method = 'paystack'
        order.paystack_reference = init.get('reference', reference)
        order.save(update_fields=['payment_method', 'paystack_reference'])

        return Response({
            'authorization_url': init.get('authorization_url'),
            'access_code': init.get('access_code'),
            'reference': order.paystack_reference,
            'amount': str(order.total),
            'processing_fee': str(order.processing_fee),
            'charged_total': str(gross_total),
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
        
        # RACE CONDITION FIX: Lock order during confirmation
        with transaction.atomic():
            # Lookup order with lock
            order = None
            order_id = metadata.get('order_id')
            if not order_id:
                for field in metadata.get('custom_fields') or []:
                    if field.get('variable_name') == 'order_id':
                        order_id = field.get('value')
                        break
            
            if order_id:
                order = Order.objects.select_for_update().filter(
                    pk=order_id, buyer=request.user
                ).first()
            if order is None:
                order = Order.objects.select_for_update().filter(
                    paystack_reference=reference, buyer=request.user
                ).first()
            if order is None:
                order = Order.objects.select_for_update().filter(
                    payment_reference=reference, buyer=request.user
                ).first()
            
            if order is None:
                return Response(
                    {'error': 'Order not found for this reference'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # SECURITY: Validate amount
            paid_pesewas = int(txn.get('amount') or 0)
            expected = int((Decimal(str(order.total)) + Decimal(str(order.processing_fee or 0))) * 100)
            if paid_pesewas + 1 < expected:
                return Response(
                    {'paid': False, 'message': 'Amount paid does not match order total'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            first_time_paid = order.payment_status != 'paid'
            order.payment_method = 'paystack'
            order.payment_status = 'paid'
            order.paid_at = timezone.now()
            order.paystack_reference = reference
            try:
                order.paystack_fee_actual = Decimal(str(int(txn.get('amount_fees') or txn.get('fees') or 0))) / 100
            except Exception:
                pass
            order.save()
        
        # Email sending after transaction commits (outside lock)
        if first_time_paid:
            _confirm_payment(order)

        return Response({'paid': True, 'order_id': order.id, 'message': 'Payment confirmed'})


class BuyerOrderReceiptView(APIView):
    """Buyer receipt for a paid order — printable, doubles as confirmation."""
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get(self, request, pk):
        try:
            order = Order.objects.prefetch_related('items').get(pk=pk, buyer=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        data = OrderSerializer(order).data
        otp_log = getattr(order, 'otp_log', None)
        data['receipt'] = {
            'order_id': order.id,
            'paid': order.payment_status == 'paid',
            'payment_method': order.payment_method,
            'payment_status': order.payment_status,
            'paid_at': order.paid_at,
            'paystack_reference': order.paystack_reference,
            'subtotal': str(order.subtotal),
            'delivery_fee': str(order.delivery_fee),
            'discount_amount': str(order.discount_amount),
            'processing_fee': str(order.processing_fee or '0.00'),
            'total': str(order.total),
            'charged_total': str(order.charged_total),
            'buyer_name': order.buyer.full_name if order.buyer else '',
            'buyer_email': order.buyer.email if order.buyer else '',
            'delivery_address': order.delivery_address,
            'delivery_phone': order.delivery_phone,
            'delivery_landmark': getattr(order, 'delivery_landmark', ''),
            'delivery_note': order.delivery_note,
            'otp_verified': bool(otp_log and otp_log.is_verified),
            'items': [
                {
                    'name': i.product_name,
                    'size': i.size,
                    'color': i.color,
                    'quantity': i.quantity,
                    'unit_price': str(i.unit_price),
                    'total': str(i.total_price),
                }
                for i in order.items.all()
            ],
        }
        return Response(data)


class ResendConfirmationView(APIView):
    """Re-send payment confirmation + receipt email to the buyer."""
    permission_classes = [permissions.IsAuthenticated, IsBuyer]
    throttle_scope = 'otp'

    def post(self, request, pk):
        try:
            order = Order.objects.prefetch_related('items').get(pk=pk, buyer=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        # Never re-send the old code (stored hashed). Rotate a fresh OTP instead.
        from .otp_utils import generate_otp as _gen_otp, hash_otp as _hash_otp, get_otp_expiry as _otp_expiry
        otp_log = getattr(order, 'otp_log', None)
        otp = None
        if otp_log and not otp_log.is_verified and order.payment_status == 'paid':
            otp = _gen_otp()
            otp_log.otp_hash = _hash_otp(otp)
            otp_log.otp_expires_at = _otp_expiry()
            otp_log.attempts = 0
            otp_log.is_locked = False
            otp_log.save(update_fields=['otp_hash', 'otp_expires_at', 'attempts', 'is_locked'])
        ok = send_payment_confirmation(order, otp_code=otp)
        if otp:
            notify_buyer_of_otp(order, otp)
        return Response({'sent': ok})


class SellerSettlementListView(generics.ListAPIView):
    """Seller's instant-settlement earnings history (Paystack pays direct)."""
    serializer_class = SettlementSerializer
    permission_classes = [permissions.IsAuthenticated, IsSeller]

    def get_queryset(self):
        from .models import Settlement as SettlementModel
        return SettlementModel.objects.filter(
            seller=self.request.user
        ).select_related('order', 'seller').order_by('-created_at')


class AdminSettlementListView(generics.ListAPIView):
    """Admin monitors every instant settlement across the platform."""
    serializer_class = SettlementSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        from .models import Settlement as SettlementModel
        qs = SettlementModel.objects.all().select_related('order', 'seller').order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class AdminEmailLogListView(generics.ListAPIView):
    """Every system email + its outcome. ?failed=1 shows failures only —
    so 'no email arrived' is always diagnosable, never a mystery."""
    serializer_class = EmailLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        from .models import EmailLog as EmailLogModel
        qs = EmailLogModel.objects.all().order_by('-created_at')
        if self.request.query_params.get('failed') == '1':
            qs = qs.filter(ok=False)
        kind = self.request.query_params.get('kind')
        if kind:
            qs = qs.filter(kind=kind)
        return qs


class AdminFinanceView(APIView):
    """Per paid order: what the buyer paid, what sellers got, and the
    platform's true net (charged − seller nets − ACTUAL Paystack fee)."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        rows = []
        totals = {'charged': Decimal('0.00'), 'sellers': Decimal('0.00'),
                  'fees': Decimal('0.00'), 'platform': Decimal('0.00')}
        orders = Order.objects.filter(payment_status='paid').prefetch_related(
            'settlements').order_by('-paid_at')[:100]
        for order in orders:
            charged = (order.total or Decimal('0.00')) + (order.processing_fee or Decimal('0.00'))
            sellers_net = sum((s.net_share for s in order.settlements.all()), Decimal('0.00'))
            fee = (order.paystack_fee_actual
                   if order.paystack_fee_actual is not None
                   else (order.processing_fee or Decimal('0.00')))
            commission = sum((s.commission for s in order.settlements.all()), Decimal('0.00'))
            platform_net = charged - sellers_net - fee
            totals['charged'] += charged
            totals['sellers'] += sellers_net
            totals['fees'] += fee
            totals['platform'] += platform_net
            rows.append({
                'order_id': order.id,
                'paid_at': order.paid_at,
                'paystack_reference': order.paystack_reference,
                'charged': str(charged),
                'sellers_net': str(sellers_net),
                'commission': str(commission),
                'delivery_fee': str(order.delivery_fee),
                'paystack_fee': str(fee),
                'fee_estimated': order.paystack_fee_actual is None,
                'platform_net': str(platform_net),
            })
        return Response({
            'rows': rows,
            'totals': {k: str(v) for k, v in totals.items()},
        })