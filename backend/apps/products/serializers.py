from rest_framework import serializers
from .models import Category, SubCategory, Product, ProductVariant, ProductImage


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.ReadOnlyField()

    class Meta:
        model = ProductImage
        fields = ['id', 'url', 'is_primary', 'alt_text', 'order']


class ProductVariantSerializer(serializers.ModelSerializer):
    is_in_stock = serializers.ReadOnlyField()

    class Meta:
        model = ProductVariant
        fields = ['id', 'size', 'color', 'color_hex', 'stock', 'is_in_stock']


class SubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory
        fields = ['id', 'name', 'slug', 'description']


class CategorySerializer(serializers.ModelSerializer):
    subcategories = SubCategorySerializer(many=True, read_only=True)
    image_url = serializers.ReadOnlyField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image_url', 'subcategories']

# ============================================================
# PRODUCT SERIALIZERS
# ============================================================

class ProductListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for product listings and search results.
    Only returns what's needed to render a product card on the frontend.
    """
    effective_price = serializers.ReadOnlyField()
    discount_percentage = serializers.ReadOnlyField()
    primary_image = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'brand', 'gender',
            'price', 'discount_price', 'effective_price', 'discount_percentage',
            'category_name', 'subcategory_name',
            'average_rating', 'total_ratings', 'total_sold',
            'primary_image', 'is_featured',
        ]

    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first()
        if primary:
            return primary.url
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for the product detail page.
    Includes all images, all variants, and full details.
    """
    effective_price = serializers.ReadOnlyField()
    discount_percentage = serializers.ReadOnlyField()
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    subcategory = SubCategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'brand', 'gender',
            'price', 'discount_price', 'effective_price', 'discount_percentage',
            'category', 'subcategory', 'tags',
            'average_rating', 'total_ratings', 'total_sold',
            'images', 'variants', 'is_featured', 'is_active',
            'created_at', 'updated_at',
        ]


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
        fields = ['size', 'color', 'color_hex', 'stock']


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