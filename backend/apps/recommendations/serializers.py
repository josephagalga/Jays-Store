from rest_framework import serializers
from .models import SearchHistory, AIConversation, ProductView
from apps.products.serializers import ProductListSerializer


class AIMessageSerializer(serializers.Serializer):
    """Incoming message from the buyer to the AI."""
    message = serializers.CharField(max_length=1000)


class AIResponseSerializer(serializers.Serializer):
    """Response returned from the AI to the frontend."""
    message = serializers.CharField()
    products = ProductListSerializer(many=True)
    # ↑ Full product data for any products the AI recommended


class SearchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchHistory
        fields = ['id', 'query', 'results_count', 'created_at']


class RecentlyViewedSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = ProductView
        fields = ['product', 'view_count', 'last_viewed']