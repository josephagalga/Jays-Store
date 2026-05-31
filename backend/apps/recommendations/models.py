from django.db import models
from django.conf import settings
from apps.products.models import Product


class SearchHistory(models.Model):
    """
    Every search query a buyer makes is saved here.
    Gemini uses this to understand the buyer's taste over time
    and make better personalised recommendations.
    """
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='search_history'
    )
    query = models.CharField(max_length=500)
    # ↑ The exact text the buyer typed e.g. "casual summer shirt under 200"
    results_count = models.PositiveIntegerField(default=0)
    # ↑ How many results were returned for this query
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'search_history'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.buyer.email} searched: {self.query}'


class AIConversation(models.Model):
    """
    Stores the full chat history between a buyer and the AI assistant.
    Each buyer has one ongoing conversation that persists across sessions.
    Gemini uses this history as context to give better answers over time.
    """
    buyer = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_conversation'
    )
    messages = models.JSONField(default=list)
    # ↑ Stored as a list of message objects:
    # [
    #   {"role": "user", "content": "I need a casual outfit"},
    #   {"role": "model", "content": "Here are some options..."},
    # ]
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_conversations'

    def __str__(self):
        return f'AI conversation — {self.buyer.email}'

    def add_message(self, role, content):
        """Appends a new message to the conversation history."""
        self.messages.append({'role': role, 'content': content})
        # Keep only the last 20 messages to avoid hitting token limits
        if len(self.messages) > 20:
            self.messages = self.messages[-20:]
        self.save()

    def clear(self):
        """Resets the conversation — buyer can start fresh."""
        self.messages = []
        self.save()


class ProductView(models.Model):
    """
    Tracks which products a buyer has viewed.
    Used to power the "Recently Viewed" section
    and improve AI recommendations.
    """
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='product_views'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='views'
    )
    view_count = models.PositiveIntegerField(default=1)
    # ↑ How many times this buyer viewed this product
    last_viewed = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'product_views'
        unique_together = ['buyer', 'product']
        ordering = ['-last_viewed']

    def __str__(self):
        return f'{self.buyer.email} viewed {self.product.name}'