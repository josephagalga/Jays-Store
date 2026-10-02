#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Deep dive verification - check actual Paystack split configuration
"""
import os
import sys
import django

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.orders.models import Order
from decimal import Decimal

print("=" * 80)
print("DEEP DIVE: Paystack Split Investigation")
print("=" * 80)

# Get a recent paid order to analyze
order = Order.objects.filter(payment_status='paid', paystack_split_code__isnull=False).exclude(paystack_split_code='').first()

if not order:
    print("No paid orders with Paystack splits found.")
    sys.exit(0)

print(f"\nAnalyzing Order #{order.id}")
print(f"Created: {order.created_at}")
print(f"Split code: {order.paystack_split_code}")
print(f"Reference: {order.paystack_reference}")

# Calculate commission from order items
commission_collected = Decimal('0.00')
seller_net_total = Decimal('0.00')
buyer_paid_total = Decimal('0.00')

print("\n" + "-" * 80)
print("ORDER ITEMS BREAKDOWN")
print("-" * 80)

for item in order.items.all():
    buyer_paid = item.unit_price * item.quantity
    seller_net = item.seller_net_price * item.quantity
    item_commission = buyer_paid - seller_net
    
    commission_collected += item_commission
    seller_net_total += seller_net
    buyer_paid_total += buyer_paid
    
    print(f"\n{item.product_name}")
    print(f"  Qty: {item.quantity}")
    print(f"  Buyer paid per unit: {item.unit_price:.2f} GHS")
    print(f"  Seller net per unit: {item.seller_net_price:.2f} GHS")
    print(f"  Commission per unit: {(item.unit_price - item.seller_net_price):.2f} GHS")
    print(f"  Line total (buyer): {buyer_paid:.2f} GHS")
    print(f"  Line total (seller net): {seller_net:.2f} GHS")
    print(f"  Line commission: {item_commission:.2f} GHS")

print("\n" + "-" * 80)
print("ORDER TOTALS")
print("-" * 80)
print(f"Subtotal (buyer paid for items): {order.subtotal:.2f} GHS")
print(f"Delivery fee: {order.delivery_fee:.2f} GHS")
print(f"Order total: {order.total:.2f} GHS")
print(f"Processing fee: {order.processing_fee:.2f} GHS")
print(f"Buyer charged: {order.total + order.processing_fee:.2f} GHS")
print(f"\nCalculated from items:")
print(f"  Buyer paid for items: {buyer_paid_total:.2f} GHS")
print(f"  Seller net for items: {seller_net_total:.2f} GHS")
print(f"  Commission collected: {commission_collected:.2f} GHS")

# Check stored commission_collected value
stored_commission = getattr(order, 'commission_collected', None)
print(f"  Stored commission_collected: {stored_commission:.2f} GHS" if stored_commission is not None else "  Stored commission_collected: NOT SET (0.00)")

print("\n" + "-" * 80)
print("SETTLEMENTS (What was sent in Paystack split)")
print("-" * 80)

settlements_total = Decimal('0.00')
for settlement in order.settlements.all():
    settlements_total += settlement.net_share
    seller_name = settlement.seller.store_name if settlement.seller and settlement.seller.store_name else (settlement.seller.email if settlement.seller else 'Platform')
    print(f"\n{seller_name}")
    print(f"  Gross share: {settlement.gross_share:.2f} GHS")
    print(f"  Commission: {settlement.commission:.2f} GHS")
    print(f"  Fee slice: {settlement.fee_slice:.2f} GHS")
    print(f"  Net share: {settlement.net_share:.2f} GHS")
    print(f"  Subaccount: {settlement.subaccount_code}")

print(f"\nTotal sent to sellers: {settlements_total:.2f} GHS")

print("\n" + "-" * 80)
print("PLATFORM SHARE ANALYSIS")
print("-" * 80)

platform_should_receive = commission_collected + order.delivery_fee
buyer_charged = order.total + order.processing_fee
platform_receives_approx = buyer_charged - settlements_total - order.processing_fee

print(f"Platform SHOULD receive:")
print(f"  Commission: {commission_collected:.2f} GHS")
print(f"  Delivery fee: {order.delivery_fee:.2f} GHS")
print(f"  Total: {platform_should_receive:.2f} GHS")
print(f"\nPlatform ACTUALLY receives (estimated):")
print(f"  Buyer charged: {buyer_charged:.2f} GHS")
print(f"  - Sent to sellers: {settlements_total:.2f} GHS")
print(f"  - Paystack fee: {order.processing_fee:.2f} GHS")
print(f"  = Platform gets: {platform_receives_approx:.2f} GHS")
print(f"\nDifference: {platform_receives_approx - platform_should_receive:.2f} GHS")

if abs(platform_receives_approx - platform_should_receive) < 0.01:
    print("\n[OK] Platform is receiving the correct amount!")
else:
    print(f"\n[ISSUE] Platform is missing {platform_should_receive - platform_receives_approx:.2f} GHS")

print("\n" + "=" * 80)
print("CONCLUSION")
print("=" * 80)

if stored_commission is None or stored_commission == 0:
    print("[INFO] Order was created BEFORE commission_collected field was added")
    print("[INFO] New orders will store commission_collected automatically")
else:
    print(f"[OK] Order has commission_collected = {stored_commission:.2f} GHS stored")

print("\n" + "=" * 80)
