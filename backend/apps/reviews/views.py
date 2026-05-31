from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Review, ReviewImage, ReviewHelpfulVote
from .serializers import (
    ReviewSerializer,
    CreateReviewSerializer,
    ReviewImageSerializer,
    ProductRatingSummarySerializer,
)
from apps.products.models import Product
from apps.core.permissions import IsBuyer, IsAdmin


class ProductReviewListView(generics.ListAPIView):
    """
    Public endpoint — anyone can read reviews for a product.
    Accessed via product slug e.g. /reviews/nike-air-force-1/
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        slug = self.kwargs['slug']
        return Review.objects.filter(
            product__slug=slug,
            is_visible=True
        ).select_related('buyer').prefetch_related('images')


class ProductRatingSummaryView(APIView):
    """
    Returns the rating breakdown for a product.
    e.g. how many 5 star, 4 star reviews etc.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            product = Product.objects.get(slug=slug)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        reviews = Review.objects.filter(product=product, is_visible=True)

        summary = {
            'average_rating': product.average_rating,
            'total_ratings': product.total_ratings,
            'five_star': reviews.filter(rating=5).count(),
            'four_star': reviews.filter(rating=4).count(),
            'three_star': reviews.filter(rating=3).count(),
            'two_star': reviews.filter(rating=2).count(),
            'one_star': reviews.filter(rating=1).count(),
        }

        serializer = ProductRatingSummarySerializer(summary)
        return Response(serializer.data)


class CreateReviewView(generics.CreateAPIView):
    """Buyer submits a review for a product they received."""
    serializer_class = CreateReviewSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]


class AddReviewImageView(generics.CreateAPIView):
    """Buyer adds images to their review."""
    serializer_class = ReviewImageSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def perform_create(self, serializer):
        review = generics.get_object_or_404(
            Review,
            pk=self.kwargs['pk'],
            buyer=self.request.user
            # ↑ Makes sure the buyer can only add images to their own reviews
        )
        serializer.save(review=review)


class VoteReviewHelpfulView(APIView):
    """
    Buyer marks a review as helpful or removes their vote.
    Works as a toggle — voting twice removes the vote.
    """
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def post(self, request, pk):
        try:
            review = Review.objects.get(pk=pk, is_visible=True)
        except Review.DoesNotExist:
            return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)

        # Prevent buyer from voting on their own review
        if review.buyer == request.user:
            return Response(
                {'error': 'You cannot vote on your own review'},
                status=status.HTTP_400_BAD_REQUEST
            )

        vote, created = ReviewHelpfulVote.objects.get_or_create(
            review=review,
            buyer=request.user
        )

        if created:
            # New vote — increment count
            review.helpful_votes += 1
            review.save()
            return Response({'message': 'Marked as helpful', 'helpful_votes': review.helpful_votes})
        else:
            # Already voted — remove the vote (toggle off)
            vote.delete()
            review.helpful_votes = max(0, review.helpful_votes - 1)
            review.save()
            return Response({'message': 'Vote removed', 'helpful_votes': review.helpful_votes})


class BuyerReviewListView(generics.ListAPIView):
    """Buyer sees all reviews they have written."""
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get_queryset(self):
        return Review.objects.filter(buyer=self.request.user)


class AdminReviewListView(generics.ListAPIView):
    """Admin sees all reviews across the platform."""
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = Review.objects.all().select_related('buyer', 'product')


class AdminToggleReviewVisibilityView(APIView):
    """
    Admin hides or shows a review.
    Used to moderate inappropriate content without deleting the review.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        try:
            review = Review.objects.get(pk=pk)
        except Review.DoesNotExist:
            return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)

        review.is_visible = not review.is_visible
        review.save()
        return Response({
            'message': f'Review {"visible" if review.is_visible else "hidden"}',
            'is_visible': review.is_visible,
        })