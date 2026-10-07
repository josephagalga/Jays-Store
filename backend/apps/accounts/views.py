from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import ContactMessage, NewsletterSubscriber
from .serializers import (
    BuyerRegistrationSerializer,
    DriverRegistrationSerializer,
    SellerRegistrationSerializer,
    BuyerProfileSerializer,
    DriverProfileSerializer,
    SellerProfileSerializer,
    AdminUserListSerializer,
    AdminDriverDetailSerializer,
    AdminSellerDetailSerializer,
    AdminVerifyDriverSerializer,
    AdminDashboardSerializer,
    CustomTokenObtainPairSerializer,
    ContactMessageSerializer,
    NewsletterSubscriberSerializer,
    PayoutAccountSerializer,
)
from apps.core.permissions import IsAdmin, IsDriver, IsBuyer, IsSeller

User = get_user_model()


# ============================================================
# CUSTOM LOGIN
# ============================================================

class CustomLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = 'login'


# ============================================================
# HELPERS
# ============================================================

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


# ============================================================
# REGISTRATION
# ============================================================

class BuyerRegistrationView(generics.CreateAPIView):
    serializer_class = BuyerRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'register'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Link any guest orders placed with this email before registering.
        from apps.orders.models import Order
        linked = Order.objects.filter(
            buyer__isnull=True, guest_email__iexact=user.email).update(buyer=user)
        tokens = get_tokens_for_user(user)
        return Response({
            'message': 'Account created successfully' + (f' — {linked} guest order(s) linked.' if linked else ''),
            'user': BuyerProfileSerializer(user).data,
            'tokens': tokens,
            'orders_linked': linked,
        }, status=status.HTTP_201_CREATED)


class SellerRegistrationView(generics.CreateAPIView):
    serializer_class = SellerRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'register'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # KYC gate: do NOT issue tokens until admin approves (matches driver flow).
        return Response({
            'message': 'Store submitted. Your account is under review.',
            'verification_status': user.verification_status,
        }, status=status.HTTP_201_CREATED)


class DriverRegistrationView(generics.CreateAPIView):
    serializer_class = DriverRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'register'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'message': 'Registration submitted. Your account is under review.',
            'verification_status': user.verification_status,
        }, status=status.HTTP_201_CREATED)


class GuestClaimView(APIView):
    """Turn guest orders into account orders: guest supplies the email they
    checked out with plus a new password, we create their buyer account and
    attach every unclaimed guest order with that email.
    """
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'register'

    def post(self, request):
        from apps.orders.models import Order
        serializer = BuyerRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {'error': 'An account with this email already exists. Sign in instead — your guest orders with this email were linked automatically.'},
                status=status.HTTP_400_BAD_REQUEST)
        unclaimed = Order.objects.filter(buyer__isnull=True, guest_email__iexact=email)
        if not unclaimed.exists():
            return Response(
                {'error': 'No guest orders found for this email.'},
                status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        count = unclaimed.update(buyer=user)
        tokens = get_tokens_for_user(user)
        return Response({
            'message': f'Account created — {count} order(s) linked.',
            'user': BuyerProfileSerializer(user).data,
            'tokens': tokens,
            'orders_linked': count,
        }, status=status.HTTP_201_CREATED)


# ============================================================
# PROFILES
# ============================================================

class BuyerProfileView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BuyerProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get_object(self):
        return self.request.user

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: deactivate user, anonymize personal data, keep orders for legal records."""
        user = self.get_object()
        user.is_active = False
        user.email = f'deleted_{user.id}_{user.email}'
        user.first_name = 'Deleted'
        user.last_name = 'User'
        user.phone_number = ''
        user.delivery_address = ''
        user.save()
        # Tokens invalidated by next refresh attempt (token blacklist if used)
        return Response(
            {'message': 'Account deactivated. Your data has been anonymized.'},
            status=status.HTTP_200_OK
        )


class SellerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = SellerProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsSeller]

    def get_object(self):
        return self.request.user


class DriverProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = DriverProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsDriver]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        allowed = {'vehicle_type', 'phone_number', 'avatar', 'is_available'}
        for field in request.data:
            if field not in allowed:
                return Response(
                    {'error': f'Cannot update field: {field}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return super().update(request, *args, **kwargs)


# ============================================================
# ADMIN
# ============================================================

class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.orders.models import Order
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        year_ago = now - timedelta(days=365)

        buyers = User.objects.filter(role=User.Role.BUYER)
        drivers = User.objects.filter(role=User.Role.DRIVER)
        sellers = User.objects.filter(role=User.Role.SELLER)
        all_users = User.objects.exclude(role=User.Role.ADMIN)

        stats = {
            'total_buyers': buyers.count(),
            'total_drivers': drivers.count(),
            'total_sellers': sellers.count(),
            'active_today': all_users.filter(last_active__date=today).count(),
            'active_this_week': all_users.filter(last_active__gte=week_ago).count(),
            'active_this_month': all_users.filter(last_active__gte=month_ago).count(),
            'active_this_year': all_users.filter(last_active__gte=year_ago).count(),
            'verified_drivers': drivers.filter(verification_status='approved').count(),
            'pending_drivers': drivers.filter(verification_status='pending').count(),
            'verified_sellers': sellers.filter(verification_status='approved').count(),
            'pending_sellers': sellers.filter(verification_status='pending').count(),
            'drivers_currently_delivering': drivers.filter(currently_delivering=True).count(),
            'total_orders': Order.objects.count(),
            'pending_orders': Order.objects.filter(status='pending').count(),
            'completed_orders': Order.objects.filter(status='delivered').count(),
            'total_revenue': sum(
                o.total for o in Order.objects.filter(status='delivered')
            ),
        }
        return Response(AdminDashboardSerializer(stats).data)


class AdminUserListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        role = self.request.query_params.get('role')
        if role == 'driver':
            return AdminDriverDetailSerializer
        if role == 'seller':
            return AdminSellerDetailSerializer
        return AdminUserListSerializer

    def get_queryset(self):
        role = self.request.query_params.get('role')
        qs = User.objects.exclude(role=User.Role.ADMIN)
        if role:
            qs = qs.filter(role=role)
        return qs.order_by('-date_joined')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class AdminDriverDetailView(generics.RetrieveAPIView):
    serializer_class = AdminDriverDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = User.objects.filter(role=User.Role.DRIVER)


class AdminVerifyDriverView(generics.UpdateAPIView):
    serializer_class = AdminVerifyDriverSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = User.objects.filter(role=User.Role.DRIVER)
    http_method_names = ['patch']

    def update(self, request, *args, **kwargs):
        driver = self.get_object()
        serializer = self.get_serializer(driver, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        driver.refresh_from_db()

        # When approved, set the selfie as the driver's avatar
        if driver.verification_status == 'approved' and driver.selfie_image:
            driver.avatar = driver.selfie_image
            driver.save()

        return Response({
            'message': f'Driver has been {driver.verification_status}',
            'driver': AdminDriverDetailSerializer(driver, context={'request': request}).data,
        })


class AdminSellerDetailView(generics.RetrieveAPIView):
    serializer_class = AdminSellerDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = User.objects.filter(role=User.Role.SELLER)


class AdminVerifySellerView(generics.UpdateAPIView):
    serializer_class = AdminVerifyDriverSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = User.objects.filter(role=User.Role.SELLER)
    http_method_names = ['patch']

    def update(self, request, *args, **kwargs):
        seller = self.get_object()
        serializer = self.get_serializer(seller, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        seller.refresh_from_db()

        return Response({
            'message': f'Seller has been {seller.verification_status}',
            'seller': AdminSellerDetailSerializer(seller, context={'request': request}).data,
        })

class AdminCommissionAuditLogView(generics.ListAPIView):
    """Admin views commission rate change history."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    
    def get(self, request):
        from .models import CommissionRateAuditLog
        
        logs = CommissionRateAuditLog.objects.select_related(
            'seller', 'changed_by'
        ).order_by('-created_at')[:100]
        
        data = []
        for log in logs:
            data.append({
                'id': log.id,
                'seller_name': log.seller.store_name if log.seller else 'Unknown',
                'seller_email': log.seller.email if log.seller else 'Unknown',
                'old_rate': str(log.old_rate),
                'new_rate': str(log.new_rate),
                'changed_by': log.changed_by.email if log.changed_by else 'System',
                'reason': log.reason,
                'apply_to_existing': log.apply_to_existing,
                'affected_products_count': log.affected_products_count,
                'created_at': log.created_at,
            })
        
        return Response(data)


class AdminDeleteUserView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return User.objects.exclude(role=User.Role.ADMIN)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        name = user.full_name
        user.delete()
        return Response(
            {'message': f'{name} has been deleted'},
            status=status.HTTP_200_OK
        )

# ============================================================
# PUBLIC STORE
# ============================================================

class SellerStoreView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    lookup_field = 'store_slug'
    queryset = User.objects.filter(role='seller', is_active=True, is_verified=True)

    def get_serializer_class(self):
        from .serializers import SellerPublicSerializer
        return SellerPublicSerializer


class VendorListView(generics.ListAPIView):
    """Public browsable + searchable vendor directory."""
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        from .serializers import VendorListSerializer
        return VendorListSerializer

    def get_queryset(self):
        qs = User.objects.filter(
            role='seller', is_active=True, is_verified=True,
        ).prefetch_related('store_products')
        q = (self.request.query_params.get('search') or '').strip()
        if q:
            from django.db.models import Q
            qs = qs.filter(
                Q(store_name__icontains=q) | Q(store_description__icontains=q)
                | Q(first_name__icontains=q) | Q(last_name__icontains=q)
            )
        return qs.order_by('store_name')


# ============================================================
# SELLER PAYOUT ACCOUNT (instant Paystack settlement)
# ============================================================

class SellerBankListView(APIView):
    """Ghana settlement banks from Paystack (bank + mobile-money codes)."""
    permission_classes = [permissions.IsAuthenticated, IsSeller]

    def get(self, request):
        from apps.orders.payments import list_ghana_banks
        try:
            banks = list_ghana_banks()
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response([
            {'name': b.get('name'), 'code': b.get('code'), 'slug': b.get('slug')}
            for b in banks
        ])


class SellerPayoutAccountView(APIView):
    """Seller views + connects the account instant settlements pay into.

    PATCH saves the details, then creates the Paystack subaccount.
    Until status is `active`, checkout of this seller's items is blocked.
    """
    permission_classes = [permissions.IsAuthenticated, IsSeller]

    def get(self, request):
        return Response(PayoutAccountSerializer(request.user).data)

    def patch(self, request):
        serializer = PayoutAccountSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        seller = serializer.save()
        seller.subaccount_status = 'pending'
        seller.subaccount_note = ''
        seller.save(update_fields=[
            'payout_account_number', 'payout_bank_code', 'payout_account_name',
            'subaccount_status', 'subaccount_note',
        ])

        from apps.orders.payments import create_subaccount
        try:
            sub = create_subaccount(
                business_name=seller.store_name or seller.full_name,
                account_number=seller.payout_account_number,
                bank_code=seller.payout_bank_code,
            )
            seller.paystack_subaccount_code = sub.get('subaccount_code', '')
            seller.subaccount_status = 'active' if seller.paystack_subaccount_code else 'failed'
            if seller.subaccount_status == 'failed':
                seller.subaccount_note = 'Paystack returned no subaccount code.'
        except Exception as exc:
            seller.subaccount_status = 'failed'
            seller.subaccount_note = str(exc)
        seller.save(update_fields=[
            'paystack_subaccount_code', 'subaccount_status', 'subaccount_note'])
        return Response(PayoutAccountSerializer(seller).data)


# ============================================================
# CONTACT & NEWSLETTER
# ============================================================

class ContactMessageCreateView(generics.CreateAPIView):
    serializer_class = ContactMessageSerializer
    permission_classes = [permissions.AllowAny]
    queryset = ContactMessage.objects.all()
    throttle_scope = 'contact'


class ContactMessageListView(generics.ListAPIView):
    serializer_class = ContactMessageSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = ContactMessage.objects.all().order_by('-created_at')


class ContactMessageDetailView(APIView):
    """Admin reads (marks read) or deletes a contact message."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_object(self, pk):
        try:
            return ContactMessage.objects.get(pk=pk)
        except ContactMessage.DoesNotExist:
            return None

    def patch(self, request, pk):
        msg = self.get_object(pk)
        if not msg:
            return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
        msg.is_read = True
        msg.save(update_fields=['is_read'])
        return Response(ContactMessageSerializer(msg).data)

    def delete(self, request, pk):
        msg = self.get_object(pk)
        if not msg:
            return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
        msg.delete()
        return Response({'message': 'Message deleted'})


class NewsletterSubscribeView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'contact'

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email or '@' not in email:
            return Response({'error': 'Enter a valid email address'}, status=status.HTTP_400_BAD_REQUEST)
        obj, created = NewsletterSubscriber.objects.get_or_create(email=email)
        if not created and not obj.is_active:
            obj.is_active = True
            obj.save()
        return Response({
            'message': 'Subscribed! Welcome to the Jay\u2019s Store newsletter.' if created else 'You are already subscribed. Welcome back!',
            'email': obj.email,
        })


class NewsletterListView(generics.ListAPIView):
    serializer_class = NewsletterSubscriberSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = NewsletterSubscriber.objects.all().order_by('-created_at')


class NewsletterDeleteView(APIView):
    """Admin removes a newsletter subscriber."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def delete(self, request, pk):
        try:
            sub = NewsletterSubscriber.objects.get(pk=pk)
        except NewsletterSubscriber.DoesNotExist:
            return Response({'error': 'Subscriber not found'}, status=status.HTTP_404_NOT_FOUND)
        sub.delete()
        return Response({'message': 'Subscriber removed'})


# ============================================================
# SELLER COMMISSION INFO
# ============================================================

class SellerCommissionInfoView(APIView):
    """Seller views the fixed commission tiers and pricing examples."""
    permission_classes = [permissions.IsAuthenticated, IsSeller]

    def get(self, request):
        from decimal import Decimal, ROUND_HALF_UP

        def example_for(net, rate):
            net = Decimal(net)
            buyer_price = (net * (Decimal('1.00') + rate / Decimal('100.00'))).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP)
            return {
                'your_price': str(net),
                'buyer_pays': str(buyer_price),
                'commission': str(buyer_price - net),
            }

        return Response({
            'tiers': [
                {'label': 'Under GHS 100', 'rate': '10.00',
                 'example': example_for('50.00', Decimal('10.00'))},
                {'label': 'GHS 100 and above', 'rate': '5.00',
                 'example': example_for('150.00', Decimal('5.00'))},
            ],
            'explanation': (
                'Commission is fixed for everyone: 10% on products under GHS 100, '
                '5% on products of GHS 100 or more (based on your listed net price).'
            ),
            'note': 'The commission is added on top of your price and paid by the buyer. You always receive exactly what you list.'
        })