from django.urls import path
from . import views

urlpatterns = [
    # Public
    path('products/<slug:slug>/', views.ProductReviewListView.as_view(), name='product-reviews'),
    path('products/<slug:slug>/summary/', views.ProductRatingSummaryView.as_view(), name='review-summary'),

    # Buyer
    path('create/', views.CreateReviewView.as_view(), name='create-review'),
    path('<int:pk>/images/', views.AddReviewImageView.as_view(), name='review-images'),
    path('<int:pk>/helpful/', views.VoteReviewHelpfulView.as_view(), name='review-helpful'),
    path('my-reviews/', views.BuyerReviewListView.as_view(), name='my-reviews'),

    # Admin
    path('admin/', views.AdminReviewListView.as_view(), name='admin-reviews'),
    path('admin/<int:pk>/toggle/', views.AdminToggleReviewVisibilityView.as_view(), name='admin-toggle-review'),
]