from rest_framework import serializers
from .models import Review, ReviewImage, ReviewHelpfulVote
from apps.orders.models import Order


class ReviewImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewImage
        fields = ['id', 'image', 'order']


class ReviewSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source='buyer.full_name', read_only=True)
    buyer_avatar = serializers.ImageField(source='buyer.avatar', read_only=True)
    images = ReviewImageSerializer(many=True, read_only=True)
    has_voted_helpful = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'buyer_name', 'buyer_avatar',
            'rating', 'title', 'body',
            'helpful_votes', 'has_voted_helpful',
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
    class Meta:
        model = Review
        fields = ['product', 'rating', 'title', 'body']

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