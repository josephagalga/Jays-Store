from django.db import models
from django.conf import settings
from apps.products.models import Product


class Review(models.Model):
    """
    A buyer reviews a product after receiving it.
    A buyer can only review a product they actually ordered.
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    rating = models.PositiveSmallIntegerField()
    # ↑ 1 to 5 stars
    title = models.CharField(max_length=100, blank=True)
    # ↑ e.g. "Great quality, fast delivery"
    body = models.TextField(blank=True)
    # ↑ The full written review

    # Helpful votes — other buyers can mark a review as helpful
    helpful_votes = models.PositiveIntegerField(default=0)

    # Admin can hide inappropriate reviews without deleting them
    is_visible = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reviews'
        ordering = ['-created_at']
        unique_together = ['product', 'buyer']
        # ↑ A buyer can only leave one review per product

    def __str__(self):
        return f'{self.buyer.full_name} → {self.product.name} ({self.rating}★)'

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        # Only update product rating on first creation, not edits
        if is_new:
            self.product.update_rating(self.rating)


class ReviewImage(models.Model):
    """
    Buyers can attach images to their review.
    e.g. photos of the product they received.
    """
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(upload_to='review_images/')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'review_images'
        ordering = ['order']

    def __str__(self):
        return f'Image for review #{self.review.id}'


class ReviewHelpfulVote(models.Model):
    """
    Tracks which buyers voted a review as helpful.
    Prevents the same buyer from voting multiple times.
    """
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name='helpful_vote_records'
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='helpful_votes_given'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'review_helpful_votes'
        unique_together = ['review', 'buyer']
        # ↑ One vote per buyer per review

    def __str__(self):
        return f'{self.buyer.full_name} found review #{self.review.id} helpful'