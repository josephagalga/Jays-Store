from rest_framework import serializers
from .models import Review, ReviewImage, ReviewHelpfulVote
from apps.orders.models import Order


class ReviewImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ReviewImage
        fields = ['id', 'image', 'image_url', 'order']

    def get_image_url(self, obj):
        if not obj.image:
            return None
        try:
            url = obj.image.url
        except Exception:
            return None
        if str(url).startswith(('http://', 'https://')):
            return url
        request = self.context.get('request')
        if request:
            try:
                return request.build_absolute_uri(url)
            except Exception:
                pass
        return url


class ReviewSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source='buyer.full_name', read_only=True)
    buyer_avatar = serializers.ImageField(source='buyer.avatar', read_only=True)
    images = ReviewImageSerializer(many=True, read_only=True)
    has_voted_helpful = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'product', 'product_name', 'buyer_name', 'buyer_avatar',
            'rating', 'title', 'body', 'fit',
            'helpful_votes', 'has_voted_helpful', 'is_visible',
            'images', 'created_at',
        ]

    def get_has_voted_helpful(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return ReviewHelpfulVote.objects.filter(
                review=obj, buyer=request.user
            ).exists()
        return False


class CreateReviewSerializer(serializers.ModelSerializer):
    fit = serializers.ChoiceField(
        choices=['runs_small', 'true_to_size', 'runs_large', ''],
        required=False, allow_blank=True, default='',
    )

    class Meta:
        model = Review
        fields = ['id', 'product', 'rating', 'title', 'body', 'fit']
        read_only_fields = ['id']

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError('Rating must be between 1 and 5')
        return value

    def validate(self, data):
        buyer = self.context['request'].user
        product = data.get('product')

        # Check for duplicate review
        if Review.objects.filter(buyer=buyer, product=product).exists():
            raise serializers.ValidationError(
                'You have already reviewed this product'
            )

        # Check buyer actually received this product
        has_purchased = Order.objects.filter(
            buyer=buyer,
            status='delivered',
        ).filter(
            items__product=product
        ).exists()

        if not has_purchased:
            raise serializers.ValidationError(
                'You can only review products you have received'
            )

        return data

    def create(self, validated_data):
        return Review.objects.create(
            buyer=self.context['request'].user,
            **validated_data
        )


class ProductRatingSummarySerializer(serializers.Serializer):
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    total_ratings = serializers.IntegerField()
    five_star = serializers.IntegerField()
    four_star = serializers.IntegerField()
    three_star = serializers.IntegerField()
    two_star = serializers.IntegerField()
    one_star = serializers.IntegerField()
    fit_runs_small = serializers.IntegerField(required=False, default=0)
    fit_true_to_size = serializers.IntegerField(required=False, default=0)
    fit_runs_large = serializers.IntegerField(required=False, default=0)