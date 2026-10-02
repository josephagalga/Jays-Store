"""
Change Commission Rate for a Seller

This script allows you to update a seller's commission rate
and optionally apply it to their existing products.

Usage:
    python change_commission_rate.py
"""
import os
import sys
import django

sys.path.insert(0, r'C:\Users\user\Desktop\store\Jays-Store\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import CustomUser
from apps.accounts.admin import update_seller_commission_rate
from decimal import Decimal

def list_sellers():
    """Show all sellers and their current commission rates."""
    sellers = CustomUser.objects.filter(role='seller')
    
    if not sellers:
        print("No sellers found in the system.")
        return []
    
    print("\n" + "=" * 80)
    print("SELLERS IN SYSTEM")
    print("=" * 80)
    for i, seller in enumerate(sellers, 1):
        print(f"\n{i}. {seller.store_name or 'No Store Name'}")
        print(f"   Email: {seller.email}")
        print(f"   Current Rate: {seller.commission_rate}%")
        print(f"   Subaccount Status: {seller.subaccount_status}")
        print(f"   Active Products: {seller.store_products.filter(is_active=True).count()}")
    print("\n" + "=" * 80)
    
    return list(sellers)

def change_rate():
    """Interactive commission rate changer."""
    print("\n" + "=" * 80)
    print("COMMISSION RATE CHANGER")
    print("=" * 80)
    
    # List all sellers
    sellers = list_sellers()
    
    if not sellers:
        return
    
    # Get seller selection
    print("\nSelect seller number (or 0 to exit):")
    try:
        choice = int(input("Enter number: ").strip())
        if choice == 0:
            print("Cancelled.")
            return
        if choice < 1 or choice > len(sellers):
            print("Invalid selection.")
            return
        
        seller = sellers[choice - 1]
    except (ValueError, IndexError):
        print("Invalid input.")
        return
    
    # Get new rate
    print(f"\nCurrent rate for {seller.store_name}: {seller.commission_rate}%")
    print("Enter new commission rate (0.00 - 30.00):")
    try:
        new_rate = Decimal(input("New rate: ").strip())
        if new_rate < 0 or new_rate > 30:
            print("Rate must be between 0.00 and 30.00")
            return
    except:
        print("Invalid rate format. Use numbers like 10.00 or 12.5")
        return
    
    # Ask about retroactive application
    print("\nApply to existing products?")
    print("  YES: Update all active products to use new rate")
    print("  NO:  Only new products will use new rate (default)")
    apply_existing = input("Apply to existing? (yes/no) [no]: ").strip().lower() == 'yes'
    
    # Get reason
    print("\nReason for change (optional):")
    reason = input("Reason: ").strip()
    
    # Get admin user (you)
    admin = CustomUser.objects.filter(role='admin').first()
    
    # Confirm
    print("\n" + "-" * 80)
    print("CONFIRM CHANGES:")
    print(f"  Seller: {seller.store_name} ({seller.email})")
    print(f"  Old Rate: {seller.commission_rate}%")
    print(f"  New Rate: {new_rate}%")
    print(f"  Apply to existing products: {'YES' if apply_existing else 'NO'}")
    if reason:
        print(f"  Reason: {reason}")
    print("-" * 80)
    
    confirm = input("\nProceed? (yes/no): ").strip().lower()
    if confirm != 'yes':
        print("Cancelled.")
        return
    
    # Make the change
    print("\nUpdating commission rate...")
    affected_count = update_seller_commission_rate(
        seller=seller,
        new_rate=new_rate,
        changed_by=admin,
        apply_to_existing=apply_existing,
        reason=reason
    )
    
    print("\n" + "=" * 80)
    print("SUCCESS!")
    print("=" * 80)
    print(f"Commission rate updated: {seller.commission_rate}% -> {new_rate}%")
    if apply_existing:
        print(f"Products updated: {affected_count}")
    else:
        print("Existing products will keep their current rates")
        print("New products will use the new rate")
    print("\nChange logged in CommissionRateAuditLog")
    print("=" * 80)

if __name__ == '__main__':
    try:
        change_rate()
    except KeyboardInterrupt:
        print("\n\nCancelled by user.")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
