import django_filters
from .models import Product


class ProductFilter(django_filters.FilterSet):
    """
    Allows buyers to filter products by price range, category,
    gender, brand and rating on the frontend.
    e.g. GET /api/products/?min_price=50&max_price=200&gender=women
    """
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    # ↑ gte = greater than or equal, lte = less than or equal

    category = django_filters.CharFilter(field_name='category__slug', lookup_expr='exact')
    subcategory = django_filters.CharFilter(field_name='subcategory__slug', lookup_expr='exact')
    gender = django_filters.CharFilter(field_name='gender', lookup_expr='exact')
    brand = django_filters.CharFilter(field_name='brand', lookup_expr='icontains')
    # ↑ icontains = case insensitive contains — "nike" matches "Nike"

    min_rating = django_filters.NumberFilter(field_name='average_rating', lookup_expr='gte')
    in_stock = django_filters.BooleanFilter(method='filter_in_stock')
    seller_store = django_filters.CharFilter(method='filter_seller_store')

    def filter_in_stock(self, queryset, name, value):
        """Filter to only show products that have at least one variant in stock."""
        if value:
            return queryset.filter(variants__stock__gt=0).distinct()
        return queryset

    def filter_seller_store(self, queryset, name, value):
        """Filter products by vendor store slug, e.g. ?seller_store=jays-streetwear."""
        if value:
            return queryset.filter(seller__store_slug=value)
        return queryset

    class Meta:
        model = Product
        fields = ['gender', 'brand', 'category', 'subcategory']