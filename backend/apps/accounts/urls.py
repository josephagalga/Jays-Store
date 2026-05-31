from django.urls import path
from . import views

urlpatterns = [
    # Registration
    path('register/buyer/', views.BuyerRegistrationView.as_view(), name='buyer-register'),
    path('register/seller/', views.SellerRegistrationView.as_view(), name='seller-register'),
    path('register/driver/', views.DriverRegistrationView.as_view(), name='driver-register'),

    # Profiles
    path('profile/buyer/', views.BuyerProfileView.as_view(), name='buyer-profile'),
    path('profile/seller/', views.SellerProfileView.as_view(), name='seller-profile'),
    path('profile/driver/', views.DriverProfileView.as_view(), name='driver-profile'),

    # Public store
    path('stores/<slug:store_slug>/', views.SellerStoreView.as_view(), name='seller-store'),

    # Admin
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/users/', views.AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/drivers/<int:pk>/', views.AdminDriverDetailView.as_view(), name='admin-driver-detail'),
    path('admin/drivers/<int:pk>/verify/', views.AdminVerifyDriverView.as_view(), name='admin-verify-driver'),
    path('admin/users/<int:pk>/delete/', views.AdminDeleteUserView.as_view(), name='admin-delete-user'),
]