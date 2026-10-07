import django_filters
from decimal import Decimal
from django.db.models import Case, When, Q, F, Value, DecimalField, ExpressionWrapper
from django.db.models.functions import Coalesce
from .models import Product


def with_display_price(queryset):
    """Annotate `display_price_calc`: buyer-facing gross price.

    Mirrors Product.display_price / commission_rate_effective in Python:
    seller products get 10% under GHS 100 net else 5%; platform products 0%.
    """
    rate = Case(
        When(
            Q(seller__role='seller') | Q(created_by__role='seller'),
            then=Case(
                When(net_price__gte=Decimal('100.00'), then=Value(Decimal('5.00'))),
                default=Value(Decimal('10.00')),
                output_field=DecimalField(max_digits=5, decimal_places=2),
            ),
        ),
        default=Value(Decimal('0.00')),
        output_field=DecimalField(max_digits=5, decimal_places=2),
    )
    display = ExpressionWrapper(
        # NOTE: divisor/multiplier are floats, not Decimals. SQLite stores
        # CAST(10.00 AS NUMERIC) as INTEGER 10, so Decimal/Decimal divides
        # as integers (10/100 = 0). Float forces REAL division on SQLite and
        # is exact-enough for a price filter on Postgres too.
        F('net_price') * (Value(1.0) + rate / Value(100.0)),
        output_field=DecimalField(max_digits=12, decimal_places=2),
    )
    return queryset.annotate(
        net_price=Coalesce('discount_price', 'price'),
    ).annotate(display_price_calc=display)


class ProductFilter(django_filters.FilterSet):
    """
    Allows buyers to filter products by price range, category,
    gender, brand and rating on the frontend.
    e.g. GET /api/products/?min_price=50&max_price=200&gender=women
    min/max_price apply to the buyer-facing display (gross) price.
    """
    min_price = django_filters.NumberFilter(method='filter_min_price')
    max_price = django_filters.NumberFilter(method='filter_max_price')
    # ↑ gte = greater than or equal, lte = less than or equal

    category = django_filters.CharFilter(field_name='category__slug', lookup_expr='exact')
    subcategory = django_filters.CharFilter(field_name='subcategory__slug', lookup_expr='exact')
    gender = django_filters.CharFilter(field_name='gender', lookup_expr='exact')
    brand = django_filters.CharFilter(field_name='brand', lookup_expr='icontains')
    # ↑ icontains = case insensitive contains — "nike" matches "Nike"

    min_rating = django_filters.NumberFilter(field_name='average_rating', lookup_expr='gte')
    in_stock = django_filters.BooleanFilter(method='filter_in_stock')
    seller_store = django_filters.CharFilter(method='filter_seller_store')

    def filter_min_price(self, queryset, name, value):
        """Buyer-facing display (gross) price >= value."""
        return with_display_price(queryset).filter(display_price_calc__gte=value)

    def filter_max_price(self, queryset, name, value):
        """Buyer-facing display (gross) price <= value."""
        return with_display_price(queryset).filter(display_price_calc__lte=value)

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