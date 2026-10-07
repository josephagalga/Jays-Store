from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils.text import slugify
from .models import Category, Product, ProductVariant, ProductImage, Wishlist
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateUpdateSerializer,
    ProductVariantCreateSerializer,
    ProductImageUploadSerializer,
    WishlistSerializer,
)
from .filters import ProductFilter
from apps.core.permissions import IsAdmin, IsAdminOrSeller, IsProductOwner, IsBuyer


# ============================================================
# CATEGORY VIEWS
# ============================================================

class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    queryset = Category.objects.filter(is_active=True)


class AdminCategoryCreateView(generics.CreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def perform_create(self, serializer):
        name = serializer.validated_data.get('name', '')
        slug = serializer.validated_data.get('slug') or slugify(name)
        serializer.save(slug=slug)


class AdminCategoryUpdateView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = Category.objects.all()


# ============================================================
# PRODUCT VIEWS — PUBLIC
# ============================================================

class ProductListView(generics.ListAPIView):
    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'brand', 'tags']
    ordering_fields = ['price', 'average_rating', 'total_sold', 'created_at']
    ordering = ['-created_at']

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        # Commercial rule: real vendor products always rank above demo
        # showcase items. Buyer sorts (price, rating, …) still apply —
        # within each group (real first, demo last).
        order = [o for o in (queryset.query.order_by or ()) if str(o).lstrip('-+') != 'is_demo']
        if not order:
            order = ['-created_at']
        return queryset.order_by('is_demo', *order)

    def get_queryset(self):
        # Public catalog: active products from verified sellers (or platform items).
        # Products from pending/rejected sellers stay hidden until approval.
        return Product.objects.filter(is_active=True).exclude(
            seller__verification_status__in=['pending', 'rejected']
        ).exclude(
            seller__isnull=True,
            created_by__verification_status__in=['pending', 'rejected'],
        ).select_related(
            'category', 'subcategory', 'seller', 'created_by'
        ).prefetch_related('images', 'variants')


class ProductDetailView(generics.RetrieveAPIView):
    serializer_class = ProductDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        return Product.objects.filter(is_active=True).exclude(
            seller__verification_status__in=['pending', 'rejected']
        ).exclude(
            seller__isnull=True,
            created_by__verification_status__in=['pending', 'rejected'],
        ).select_related(
            'category', 'subcategory', 'seller', 'created_by'
        ).prefetch_related('images', 'variants')


class FeaturedProductsView(generics.ListAPIView):
    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Featured rail sells real stock: demo showcase items are excluded.
        return Product.objects.filter(
            is_active=True, is_featured=True, is_demo=False
        ).exclude(
            seller__verification_status__in=['pending', 'rejected']
        ).exclude(
            seller__isnull=True,
            created_by__verification_status__in=['pending', 'rejected'],
        ).select_related(
            'category', 'subcategory', 'seller', 'created_by'
        ).prefetch_related('images', 'variants')[:10]


# ============================================================
# PRODUCT VIEWS — ADMIN + SELLER SHARED
# ============================================================

class AdminProductListView(generics.ListAPIView):
    """
    Admin sees all products.
    Sellers see only their own products.
    """
    serializer_class = ProductDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSeller]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'brand', 'tags']
    ordering_fields = ['price', 'total_sold', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = Product.objects.all().select_related(
            'category', 'subcategory'
        ).prefetch_related('images', 'variants')

        if user.role == 'seller':
            # Sellers only see their own products
            qs = qs.filter(seller=user)

        return qs


class AdminProductCreateView(generics.CreateAPIView):
    """Admin or seller can create products."""
    serializer_class = ProductCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSeller]

    def perform_create(self, serializer):
        user = self.request.user
        name = serializer.validated_data.get('name', '')
        slug_base = slugify(name)
        slug = slug_base
        counter = 1
        # Ensure slug is unique
        while Product.objects.filter(slug=slug).exists():
            slug = f'{slug_base}-{counter}'
            counter += 1

        if user.role == 'seller':
            product = serializer.save(
                created_by=user,
                seller=user,
                slug=slug
            )
            # Keep the vendor's product counter in sync for the directory + dashboard
            user.seller_total_products = Product.objects.filter(seller=user, is_active=True).count()
            user.save(update_fields=['seller_total_products'])
        else:
            serializer.save(
                created_by=user,
                slug=slug
            )


class AdminProductUpdateView(generics.RetrieveUpdateDestroyAPIView):
    """Admin can edit any product. Sellers can only edit their own."""
    serializer_class = ProductCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSeller, IsProductOwner]
    queryset = Product.objects.all()


class AdminProductVariantView(generics.CreateAPIView):
    """Add a variant to a product."""
    serializer_class = ProductVariantCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSeller]

    def perform_create(self, serializer):
        product = generics.get_object_or_404(Product, pk=self.kwargs['pk'])
        # Sellers can only add variants to their own products
        if self.request.user.role == 'seller' and product.seller != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only manage your own products')
        serializer.save(product=product)


class AdminProductImageView(generics.CreateAPIView):
    """Upload an image for a product."""
    serializer_class = ProductImageUploadSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSeller]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['product'] = generics.get_object_or_404(Product, pk=self.kwargs['pk'])
        return context

    def perform_create(self, serializer):
        product = generics.get_object_or_404(Product, pk=self.kwargs['pk'])
        # Sellers can only upload images for their own products
        if self.request.user.role == 'seller' and product.seller != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only manage your own products')
        serializer.save(product=product)


class AdminInventoryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        total_products = Product.objects.filter(is_active=True).count()
        out_of_stock = ProductVariant.objects.filter(stock=0).count()
        low_stock = ProductVariant.objects.filter(stock__gt=0, stock__lte=5).count()
        top_selling = Product.objects.filter(
            is_active=True
        ).order_by('-total_sold')[:5].values('id', 'name', 'total_sold')

        return Response({
            'total_products': total_products,
            'out_of_stock_variants': out_of_stock,
            'low_stock_variants': low_stock,
            'top_selling_products': list(top_selling),
        })


# ============================================================
# WISHLIST VIEWS
# ============================================================

class WishlistListView(generics.ListAPIView):
    """Returns the buyer's wishlisted items."""
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get_queryset(self):
        return Wishlist.objects.filter(
            buyer=self.request.user
        ).select_related('product', 'product__category', 'product__subcategory').prefetch_related('product__images', 'product__variants')


class WishlistToggleView(APIView):
    """Toggles a product in/out of the buyer's wishlist."""
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def post(self, request, product_id):
        product = generics.get_object_or_404(Product, pk=product_id, is_active=True)
        item = Wishlist.objects.filter(buyer=request.user, product=product).first()
        if item:
            item.delete()
            return Response({'wishlisted': False, 'product_id': product.id, 'message': 'Removed from wishlist'})
        else:
            Wishlist.objects.create(buyer=request.user, product=product)
            return Response({'wishlisted': True, 'product_id': product.id, 'message': 'Added to wishlist'})


class WishlistIdsView(APIView):
    """Returns an array of product IDs currently in buyer's wishlist."""
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get(self, request):
        ids = list(Wishlist.objects.filter(buyer=request.user).values_list('product_id', flat=True))
        return Response({'ids': ids})
