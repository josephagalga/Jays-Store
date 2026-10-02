from django.contrib import admin
from django.utils import timezone
from django.contrib import messages
from decimal import Decimal
from .models import CustomUser, CommissionRateAuditLog
from apps.products.models import Product


def update_seller_commission_rate(seller, new_rate, changed_by, apply_to_existing=False, reason=''):
    """Update commission rate with audit trail and optional retroactive application.
    
    Args:
        seller: CustomUser instance (seller)
        new_rate: Decimal (0.00-30.00)
        changed_by: CustomUser (admin making the change)
        apply_to_existing: Boolean (update existing products?)
        reason: String (explanation for change)
    
    Returns:
        Number of products affected
    """
    old_rate = seller.commission_rate
    if old_rate == new_rate:
        return 0
    
    # Update seller's current rate
    seller.commission_rate = new_rate
    seller.commission_rate_updated_at = timezone.now()
    seller.save(update_fields=['commission_rate', 'commission_rate_updated_at'])
    
    affected_count = 0
    if apply_to_existing:
        # Update commission_rate_snapshot for all active products
        affected_count = Product.objects.filter(
            seller=seller, is_active=True
        ).update(commission_rate_snapshot=new_rate)
    
    # Log the change
    CommissionRateAuditLog.objects.create(
        seller=seller,
        old_rate=old_rate,
        new_rate=new_rate,
        changed_by=changed_by,
        reason=reason,
        affected_products_count=affected_count,
        apply_to_existing=apply_to_existing
    )
    
    return affected_count


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ['email', 'role', 'commission_rate', 'subaccount_status', 'is_active', 'date_joined']
    list_filter = ['role', 'subaccount_status', 'is_active', 'verification_status']
    search_fields = ['email', 'first_name', 'last_name', 'store_name']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('email', 'first_name', 'last_name', 'role', 'phone_number', 'avatar', 'is_active')
        }),
        ('Seller Info', {
            'fields': (
                'store_name', 'store_slug', 'store_description',
                'store_logo', 'store_banner', 'store_address', 'pickup_location',
                'commission_rate', 'commission_rate_updated_at',
                'payout_account_number', 'payout_bank_code', 'payout_account_name',
                'paystack_subaccount_code', 'subaccount_status', 'subaccount_note'
            ),
            'classes': ('collapse',),
            'description': 'Commission rate: Buyer-pays model. Commission added on top of seller\'s listed price.'
        }),
        ('Driver Info', {
            'fields': (
                'vehicle_type', 'ghana_card_image', 'selfie_image',
                'verification_status', 'verification_note',
                'total_deliveries', 'successful_deliveries', 'average_rating',
                'currently_delivering', 'is_available'
            ),
            'classes': ('collapse',)
        }),
        ('Buyer Info', {
            'fields': (
                'delivery_address', 'total_orders', 'completed_orders',
                'cancelled_orders', 'total_spent'
            ),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['commission_rate_updated_at', 'date_joined']


@admin.register(CommissionRateAuditLog)
class CommissionRateAuditLogAdmin(admin.ModelAdmin):
    list_display = ['seller', 'old_rate', 'new_rate', 'changed_by', 'apply_to_existing', 'affected_products_count', 'created_at']
    list_filter = ['apply_to_existing', 'created_at']
    search_fields = ['seller__email', 'seller__store_name', 'reason', 'changed_by__email']
    readonly_fields = ['seller', 'old_rate', 'new_rate', 'changed_by', 'reason', 'affected_products_count', 'apply_to_existing', 'created_at']
    
    def has_add_permission(self, request):
        return False  # Audit logs are created automatically
    
    def has_delete_permission(self, request, obj=None):
        return False  # Don't allow deletion of audit logs
