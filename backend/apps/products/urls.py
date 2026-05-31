from django.urls import path
from . import views

urlpatterns = [
    # ── Public ──────────────────────────────────────────────
    path('', views.ProductListView.as_view(), name='product-list'),
    path('categories/', views.CategoryListView.as_view(), name='category-list'),
    path('featured/', views.FeaturedProductsView.as_view(), name='featured-products'),

    # ── Admin / Seller shared ────────────────────────────────
    path('manage/', views.AdminProductListView.as_view(), name='manage-product-list'),
    path('manage/create/', views.AdminProductCreateView.as_view(), name='manage-product-create'),
    path('manage/<int:pk>/', views.AdminProductUpdateView.as_view(), name='manage-product-update'),
    path('manage/<int:pk>/variants/', views.AdminProductVariantView.as_view(), name='manage-product-variants'),
    path('manage/<int:pk>/images/', views.AdminProductImageView.as_view(), name='manage-product-images'),

    # ── Admin only ───────────────────────────────────────────
    path('admin/inventory/', views.AdminInventoryView.as_view(), name='admin-inventory'),
    path('admin/categories/create/', views.AdminCategoryCreateView.as_view(), name='admin-category-create'),
    path('admin/categories/<int:pk>/', views.AdminCategoryUpdateView.as_view(), name='admin-category-update'),

    # ── Slug route LAST ──────────────────────────────────────
    path('<slug:slug>/', views.ProductDetailView.as_view(), name='product-detail'),
]