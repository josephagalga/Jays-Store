from django.contrib import admin
from .models import CustomUser, CommissionRateAuditLog


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ['email', 'role', 'subaccount_status', 'is_active', 'date_joined']
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
                'payout_account_number', 'payout_bank_code', 'payout_account_name',
                'paystack_subaccount_code', 'subaccount_status', 'subaccount_note'
            ),
            'classes': ('collapse',),
            'description': 'Commission is fixed: 10% under GHS 100 net, 5% from GHS 100 net (buyer-pays model).'
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
