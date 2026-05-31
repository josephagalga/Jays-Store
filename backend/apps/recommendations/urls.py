from django.urls import path
from . import views

urlpatterns = [
    # AI chat
    path('chat/', views.AIChatView.as_view(), name='ai-chat'),
    path('chat/clear/', views.ClearAIConversationView.as_view(), name='ai-chat-clear'),

    # Recommendations
    path('similar/<int:product_id>/', views.SimilarProductsView.as_view(), name='similar-products'),

    # Tracking
    path('view/<int:product_id>/', views.TrackProductViewView.as_view(), name='track-view'),
    path('recently-viewed/', views.RecentlyViewedView.as_view(), name='recently-viewed'),
    path('search-history/', views.SearchHistoryView.as_view(), name='search-history'),
]