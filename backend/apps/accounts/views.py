from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .serializers import (
    BuyerRegistrationSerializer,
    DriverRegistrationSerializer,
    SellerRegistrationSerializer,
    BuyerProfileSerializer,
    DriverProfileSerializer,
    SellerProfileSerializer,
    AdminUserListSerializer,
    AdminDriverDetailSerializer,
    AdminVerifyDriverSerializer,
    AdminDashboardSerializer,
    CustomTokenObtainPairSerializer,
)
from apps.core.permissions import IsAdmin, IsDriver, IsBuyer, IsSeller

User = get_user_model()


# ============================================================
# CUSTOM LOGIN
# ============================================================

class CustomLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = get_tokens_for_user(user)
        return Response({
            'message': 'Account created successfully',
            'user': BuyerProfileSerializer(user).data,
            'tokens': tokens,
        }, status=status.HTTP_201_CREATED)


class SellerRegistrationView(generics.CreateAPIView):
    serializer_class = SellerRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = get_tokens_for_user(user)
        return Response({
            'message': 'Store created successfully',
            'user': SellerProfileSerializer(user).data,
            'tokens': tokens,
        }, status=status.HTTP_201_CREATED)


class DriverRegistrationView(generics.CreateAPIView):
    serializer_class = DriverRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'message': 'Registration submitted. Your account is under review.',
            'verification_status': user.verification_status,
        }, status=status.HTTP_201_CREATED)


# ============================================================
# PROFILES
# ============================================================

class BuyerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = BuyerProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get_object(self):
        return self.request.user


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
        all_users = User.objects.exclude(role=User.Role.ADMIN)

        stats = {
            'total_buyers': buyers.count(),
            'total_drivers': drivers.count(),
            'active_today': all_users.filter(last_active__date=today).count(),
            'active_this_week': all_users.filter(last_active__gte=week_ago).count(),
            'active_this_month': all_users.filter(last_active__gte=month_ago).count(),
            'active_this_year': all_users.filter(last_active__gte=year_ago).count(),
            'verified_drivers': drivers.filter(verification_status='approved').count(),
            'pending_drivers': drivers.filter(verification_status='pending').count(),
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
    serializer_class = SellerProfileSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'store_slug'
    queryset = User.objects.filter(role='seller', is_active=True)