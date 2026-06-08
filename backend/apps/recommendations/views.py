from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import SearchHistory, AIConversation, ProductView
from .serializers import (
    AIMessageSerializer,
    AIResponseSerializer,
    SearchHistorySerializer,
    RecentlyViewedSerializer,
)
from .gemini_service import chat_with_gemini, get_similar_products
from apps.products.models import Product
from apps.products.serializers import ProductListSerializer
from apps.core.permissions import IsBuyer


class AIChatView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def post(self, request):
        serializer = AIMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_message = serializer.validated_data['message']

        conversation, _ = AIConversation.objects.get_or_create(buyer=request.user)

        try:
            result = chat_with_gemini(
                user_message=user_message,
                conversation_history=conversation.messages,
                buyer=request.user
            )
        except Exception as e:
            return Response(
                {'error': 'AI service is temporarily unavailable. Please try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        conversation.add_message('user', user_message)
        conversation.add_message('model', result['message'])

        SearchHistory.objects.create(
            buyer=request.user,
            query=user_message,
            results_count=len(result['product_ids'])
        )

        products = []
        if result['product_ids']:
            products = Product.objects.filter(
                id__in=result['product_ids'],
                is_active=True
            ).prefetch_related('images')
            product_map = {p.id: p for p in products}
            products = [product_map[pid] for pid in result['product_ids'] if pid in product_map]

        return Response({
            'message': result['message'],
            'products': ProductListSerializer(
                products,
                many=True,
                context={'request': request}
            ).data
        })


class ClearAIConversationView(APIView):
    """Buyer resets their AI chat history and starts fresh."""
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def post(self, request):
        try:
            conversation = AIConversation.objects.get(buyer=request.user)
            conversation.clear()
        except AIConversation.DoesNotExist:
            pass
        return Response({'message': 'Conversation cleared'})


class SimilarProductsView(APIView):
    """
    Returns products similar to a given product.
    Called on the product detail page to power
    the 'You might also like' section.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, product_id):
        product_ids = get_similar_products(product_id)
        products = Product.objects.filter(
            id__in=product_ids,
            is_active=True
        ).prefetch_related('images')
        return Response(
            ProductListSerializer(products, many=True, context={'request': request}).data
        )


class TrackProductViewView(APIView):
    """
    Called when a buyer views a product detail page.
    Saves to their view history for recommendations.
    """
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def post(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        view, created = ProductView.objects.get_or_create(
            buyer=request.user,
            product=product
        )
        if not created:
            view.view_count += 1
            view.save()

        return Response({'message': 'View tracked'})


class RecentlyViewedView(generics.ListAPIView):
    """Returns the buyer's recently viewed products."""
    serializer_class = RecentlyViewedSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get_queryset(self):
        return ProductView.objects.filter(
            buyer=self.request.user
        ).select_related('product').order_by('-last_viewed')[:20]


class SearchHistoryView(generics.ListAPIView):
    """Returns the buyer's recent search queries."""
    serializer_class = SearchHistorySerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get_queryset(self):
        return SearchHistory.objects.filter(
            buyer=self.request.user
        ).order_by('-created_at')[:20]