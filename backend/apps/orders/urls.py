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
    path('orders/<int:pk>/', views.BuyerOrderDetailView.as_view(), name='buyer-order-detail'),
    path('orders/<int:pk>/cancel/', views.CancelOrderView.as_view(), name='cancel-order'),
    path('orders/<int:pk>/rate/', views.DeliveryRatingView.as_view(), name='rate-delivery'),

    # Driver
    path('driver/orders/', views.DriverAvailableOrdersView.as_view(), name='driver-available-orders'),
    path('driver/orders/<int:pk>/accept/', views.DriverAcceptOrderView.as_view(), name='driver-accept-order'),
    path('driver/orders/<int:pk>/status/', views.DriverUpdateOrderStatusView.as_view(), name='driver-update-status'),
    path('driver/history/', views.DriverOrderHistoryView.as_view(), name='driver-history'),

    # Admin
    path('admin/orders/', views.AdminOrderListView.as_view(), name='admin-orders'),
    path('admin/orders/<int:pk>/', views.AdminOrderDetailView.as_view(), name='admin-order-detail'),
]