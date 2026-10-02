from rest_framework import serializers
from .models import Category, SubCategory, Product, ProductVariant, ProductImage, Wishlist


def absolute_media_url(url, request):
    if not url:
        return None
    if str(url).startswith(('http://', 'https://')):
        return url
    if request:
        return request.build_absolute_uri(url)
    return url


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'url', 'is_primary', 'alt_text', 'order']

    def get_url(self, obj):
        return absolute_media_url(obj.url, self.context.get('request'))


class ProductVariantSerializer(serializers.ModelSerializer):
    is_in_stock = serializers.ReadOnlyField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = ['id', 'size', 'color', 'color_hex', 'stock', 'is_in_stock', 'image', 'image_url']
        read_only_fields = ['id', 'image_url']

    def get_image_url(self, obj):
        return absolute_media_url(obj.image_url, self.context.get('request'))


class SubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory
        fields = ['id', 'name', 'slug', 'description']


class CategorySerializer(serializers.ModelSerializer):
    subcategories = SubCategorySerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image_url', 'subcategories']

    def get_image_url(self, obj):
        return absolute_media_url(obj.image_url, self.context.get('request'))

# ============================================================
# PRODUCT SERIALIZERS
# ============================================================

def _seller_store(obj):
    """Public store attribution for a product. Never exposes payout/bank data."""
    seller = getattr(obj, 'seller', None) or getattr(obj, 'created_by', None)
    if not seller or getattr(seller, 'role', None) not in ('seller', 'admin'):
        return None
    return seller


class ProductListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for product listings and search results.
    Only returns what's needed to render a product card on the frontend.
    """
    effective_price = serializers.SerializerMethodField()  # Buyer-facing price (includes commission)
    discount_percentage = serializers.ReadOnlyField()
    primary_image = serializers.SerializerMethodField()
    variants = ProductVariantSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)
    store_name = serializers.SerializerMethodField()
    store_slug = serializers.SerializerMethodField()
    store_verified = serializers.SerializerMethodField()
    store_logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'brand', 'gender',
            'price', 'discount_price', 'effective_price', 'discount_percentage',
            'category_name', 'subcategory_name',
            'average_rating', 'total_ratings', 'total_sold',
            'primary_image', 'is_featured', 'variants',
            'store_name', 'store_slug', 'store_verified', 'store_logo_url',
        ]

    def get_effective_price(self, obj):
        """Return display price (what buyers pay - includes commission markup)."""
        return str(obj.display_price)

    def get_store_name(self, obj):
        seller = _seller_store(obj)
        if not seller:
            return "Jay's Store"
        return seller.store_name or seller.full_name

    def get_store_slug(self, obj):
        seller = _seller_store(obj)
        return getattr(seller, 'store_slug', None) if seller else None

    def get_store_verified(self, obj):
        seller = _seller_store(obj)
        return bool(seller and seller.is_verified) if seller else True

    def get_store_logo_url(self, obj):
        seller = _seller_store(obj)
        if not seller or not getattr(seller, 'store_logo', None):
            return None
        try:
            url = seller.store_logo.url
        except Exception:
            return None
        return absolute_media_url(url, self.context.get('request'))

    def get_primary_image(self, obj):
        images = list(obj.images.all())
        primary = next((img for img in images if img.is_primary), None) or (images[0] if images else None)
        if not primary:
            return None
        return absolute_media_url(primary.url, self.context.get('request'))


class ProductDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for the product detail page.
    Includes all images, all variants, and full details.
    """
    effective_price = serializers.SerializerMethodField()  # Buyer-facing price (includes commission)
    discount_percentage = serializers.ReadOnlyField()
    commission_rate = serializers.SerializerMethodField()
    store_name = serializers.SerializerMethodField()
    store_slug = serializers.SerializerMethodField()
    store_verified = serializers.SerializerMethodField()
    store_logo_url = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    subcategory = SubCategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'brand', 'gender',
            'price', 'discount_price', 'effective_price', 'discount_percentage',
            'commission_rate',
            'store_name', 'store_slug', 'store_verified', 'store_logo_url',
            'category', 'subcategory', 'tags',
            'average_rating', 'total_ratings', 'total_sold',
            'images', 'variants', 'is_featured', 'is_active',
            'created_at', 'updated_at',
        ]

    def get_effective_price(self, obj):
        """Return display price (what buyers pay - includes commission markup)."""
        return str(obj.display_price)

    def get_store_name(self, obj):
        seller = _seller_store(obj)
        if not seller:
            return "Jay's Store"
        return seller.store_name or seller.full_name

    def get_store_slug(self, obj):
        seller = _seller_store(obj)
        return getattr(seller, 'store_slug', None) if seller else None

    def get_store_verified(self, obj):
        seller = _seller_store(obj)
        return bool(seller and seller.is_verified) if seller else True

    def get_store_logo_url(self, obj):
        seller = _seller_store(obj)
        if not seller or not getattr(seller, 'store_logo', None):
            return None
        try:
            url = seller.store_logo.url
        except Exception:
            return None
        return absolute_media_url(url, self.context.get('request'))

    def get_commission_rate(self, obj):
        """Expose effective commission % so frontend can show price breakdown."""
        try:
            return str(obj.commission_rate_effective)
        except Exception:
            return '0'


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True
    )
    subcategory = serializers.PrimaryKeyRelatedField(
        queryset=SubCategory.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Product
        fields = [
            'id',  # ← add this
            'name', 'slug', 'description', 'brand', 'gender',
            'price', 'discount_price', 'category', 'subcategory',
            'tags', 'is_active', 'is_featured',
        ]
        read_only_fields = ['id']

    def validate(self, data):
        price = data.get('price')
        discount_price = data.get('discount_price')
        if discount_price and price and discount_price >= price:
            raise serializers.ValidationError({
                'discount_price': 'Discount price must be less than the regular price'
            })
        return data

class ProductVariantCreateSerializer(serializers.ModelSerializer):
    """Used by admin to add a variant to a product."""
    class Meta:
        model = ProductVariant
        fields = ['size', 'color', 'color_hex', 'stock', 'image']


class ProductImageUploadSerializer(serializers.ModelSerializer):
    """Used by admin to upload an image for a product."""
    class Meta:
        model = ProductImage
        fields = ['image', 'is_primary', 'alt_text', 'order']

    def validate(self, data):
        # If this image is being set as primary, remove primary
        # status from all other images of this product
        if data.get('is_primary'):
            product = self.context.get('product')
            if product:
                product.images.filter(is_primary=True).update(is_primary=False)
        return data


class WishlistSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'created_at']
