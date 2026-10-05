"""Recompute all active products onto the fixed 10/5 commission tiers.

Fixed rule: seller net < 100 GHS -> 10%, net >= 100 GHS -> 5%.
Clears per-product commission snapshots so the tier property governs.
Order history is untouched (OrderItems keep their stored rates).

Usage:
    python manage.py recompute_commission_tiers
    python manage.py recompute_commission_tiers --dry-run
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Clear commission snapshots so all active products follow the fixed 10/5 tiers.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Report what would change without writing.',
        )

    def handle(self, *args, **options):
        from apps.products.models import Product

        dry_run = options['dry_run']
        qs = Product.objects.filter(is_active=True).exclude(
            commission_rate_snapshot__isnull=True)
        total = qs.count()
        if dry_run:
            self.stdout.write(f'Would clear snapshots on {total} active product(s).')
            return
        updated = qs.update(commission_rate_snapshot=None)
        self.stdout.write(self.style.SUCCESS(
            f'Cleared snapshots on {updated} active product(s). '
            f'All now follow the fixed 10/5 tiers.'
        ))
