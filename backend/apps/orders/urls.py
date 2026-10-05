from django.urls import path
from . import views

urlpatterns = [
    # Cart
    path('cart/', views.CartView.as_view(), name='cart'),
    path('cart/add/', views.AddToCartView.as_view(), name='cart-add'),
    path('cart/items/<int:item_id>/', views.RemoveFromCartView.as_view(), name='cart-remove'),
    path('cart/items/<int:item_id>/update/', views.UpdateCartItemView.as_view(), name='cart-update'),

    # Buyer orders
    path('orders/', views.BuyerOrderListView.as_view(), name='buyer-orders'),
    path('orders/place/', views.PlaceOrderView.as_view(), name='place-order'),
    # Guest checkout (no account) + public tracking by reference
    path('orders/guest/', views.GuestPlaceOrderView.as_view(), name='guest-place-order'),
    path('orders/track/<str:reference>/', views.GuestOrderTrackView.as_view(), name='guest-order-track'),
    path('orders/<int:pk>/', views.BuyerOrderDetailView.as_view(), name='buyer-order-detail'),
    path('orders/<int:pk>/cancel/', views.CancelOrderView.as_view(), name='cancel-order'),
    path('orders/<int:pk>/rate/', views.DeliveryRatingView.as_view(), name='rate-delivery'),
    path('orders/<int:pk>/receipt/', views.BuyerOrderReceiptView.as_view(), name='order-receipt'),
    path('orders/<int:pk>/receipt/resend/', views.ResendConfirmationView.as_view(), name='order-receipt-resend'),
    path('coupons/validate/', views.ValidateCouponView.as_view(), name='validate-coupon'),

    # Paystack — hosted checkout paths expected by the frontend (/payments/...)
    path('payments/paystack/initialize/', views.PaystackInitializeView.as_view(), name='paystack-initialize'),
    path('payments/paystack/verify/', views.PaystackVerifyView.as_view(), name='paystack-verify'),
    path('payments/webhook/paystack/', views.PaystackWebhookView.as_view(), name='paystack-webhook'),
    # Legacy aliases (kept in case older clients use them)
    path('paystack/initialize/', views.PaystackInitializeView.as_view(), name='paystack-initialize-legacy'),
    path('paystack/verify/', views.PaystackVerifyView.as_view(), name='paystack-verify-legacy'),
    path('paystack/webhook/', views.PaystackWebhookView.as_view(), name='paystack-webhook-legacy'),

    # OTP delivery confirmation (replaces PIN)
    path('orders/<int:pk>/verify-otp/', views.VerifyDeliveryOTPView.as_view(), name='verify-otp'),
    path('orders/<int:pk>/confirm-handoff/', views.SellerConfirmHandoffView.as_view(), name='confirm-handoff'),

    # Driver
    path('driver/orders/', views.DriverAvailableOrdersView.as_view(), name='driver-available-orders'),
    path('driver/orders/<int:pk>/accept/', views.DriverAcceptOrderView.as_view(), name='driver-accept-order'),
    path('driver/orders/<int:pk>/status/', views.DriverUpdateOrderStatusView.as_view(), name='driver-update-status'),
    path('driver/history/', views.DriverOrderHistoryView.as_view(), name='driver-history'),

    # Seller orders
    path('seller/orders/', views.SellerOrderListView.as_view(), name='seller-orders'),

    # Admin
    path('admin/orders/', views.AdminOrderListView.as_view(), name='admin-orders'),
    path('admin/orders/<int:pk>/', views.AdminOrderDetailView.as_view(), name='admin-order-detail'),

    # Vendor storefront
    path('store/<str:store_slug>/', views.StorePageView.as_view(), name='store-page'),

    # Seller settlements (instant Paystack payouts — history only)
    path('seller/settlements/', views.SellerSettlementListView.as_view(), name='seller-settlements'),
    path('admin/settlements/', views.AdminSettlementListView.as_view(), name='admin-settlements'),
    path('admin/finance/', views.AdminFinanceView.as_view(), name='admin-finance'),
    path('admin/seller-earnings/', views.AdminSellerEarningsView.as_view(), name='admin-seller-earnings'),
    path('admin/email-logs/', views.AdminEmailLogListView.as_view(), name='admin-email-logs'),
    path('admin/email-logs/test/', views.AdminTestEmailView.as_view(), name='admin-email-test'),
    path('seller/wallet/', views.SellerWalletView.as_view(), name='seller-wallet'),
    path('seller/payouts/', views.SellerPayoutListCreateView.as_view(), name='seller-payouts'),
    path('admin/payouts/', views.SellerPayoutListCreateView.as_view(), name='admin-payout-list'),
    path('admin/payouts/<int:pk>/', views.AdminPayoutActionView.as_view(), name='admin-payout-action'),
]
