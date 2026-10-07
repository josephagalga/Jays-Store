from django.urls import path
from . import views

urlpatterns = [
    # Registration
    path('register/buyer/', views.BuyerRegistrationView.as_view(), name='buyer-register'),
    path('register/seller/', views.SellerRegistrationView.as_view(), name='seller-register'),
    path('register/driver/', views.DriverRegistrationView.as_view(), name='driver-register'),
    path('guest-claim/', views.GuestClaimView.as_view(), name='guest-claim'),

    # Profiles
    path('profile/buyer/', views.BuyerProfileView.as_view(), name='buyer-profile'),
    path('profile/seller/', views.SellerProfileView.as_view(), name='seller-profile'),
    path('profile/driver/', views.DriverProfileView.as_view(), name='driver-profile'),

    # Seller payout account (instant Paystack settlement target)
    path('seller/payout-account/', views.SellerPayoutAccountView.as_view(), name='seller-payout-account'),
    path('seller/banks/', views.SellerBankListView.as_view(), name='seller-banks'),
    path('seller/commission-info/', views.SellerCommissionInfoView.as_view(), name='seller-commission-info'),

    # Public store — list MUST come before slug detail
    path('stores/', views.VendorListView.as_view(), name='vendor-list'),
    path('stores/<slug:store_slug>/', views.SellerStoreView.as_view(), name='seller-store'),

    # Admin
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/users/', views.AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/drivers/<int:pk>/', views.AdminDriverDetailView.as_view(), name='admin-driver-detail'),
    path('admin/drivers/<int:pk>/verify/', views.AdminVerifyDriverView.as_view(), name='admin-verify-driver'),
    path('admin/sellers/<int:pk>/', views.AdminSellerDetailView.as_view(), name='admin-seller-detail'),
    path('admin/sellers/<int:pk>/verify/', views.AdminVerifySellerView.as_view(), name='admin-verify-seller'),
    path('admin/users/<int:pk>/delete/', views.AdminDeleteUserView.as_view(), name='admin-delete-user'),
    path('admin/commission-audit-logs/', views.AdminCommissionAuditLogView.as_view(), name='admin-commission-logs'),
    path('admin/contact-messages/', views.ContactMessageListView.as_view(), name='admin-contact-list'),
    path('admin/contact-messages/<int:pk>/', views.ContactMessageDetailView.as_view(), name='admin-contact-detail'),
    path('admin/newsletter/', views.NewsletterListView.as_view(), name='admin-newsletter-list'),
    path('admin/newsletter/<int:pk>/', views.NewsletterDeleteView.as_view(), name='admin-newsletter-delete'),

    # Public support
    path('contact/', views.ContactMessageCreateView.as_view(), name='contact-create'),
    path('newsletter/subscribe/', views.NewsletterSubscribeView.as_view(), name='newsletter-subscribe'),
]