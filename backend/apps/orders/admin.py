from django.contrib import admin
from .models import Coupon, Payout


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ['code', 'discount_type', 'discount_value', 'is_active', 'used_count', 'usage_limit']
    list_filter = ['discount_type', 'is_active']
    search_fields = ['code']


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ['id', 'seller', 'amount', 'momo_network', 'status', 'requested_at']
    list_filter = ['status', 'momo_network']
    search_fields = ['seller__email']
