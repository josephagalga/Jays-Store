from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from apps.accounts.views import CustomLoginView

urlpatterns = [
    path('django-admin/', admin.site.urls),

    # Auth
    path('api/auth/login/', CustomLoginView.as_view(), name='login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # Apps
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/products/', include('apps.products.urls')),
    path('api/', include('apps.orders.urls')),
    path('api/reviews/', include('apps.reviews.urls')),
    path('api/recommendations/', include('apps.recommendations.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)