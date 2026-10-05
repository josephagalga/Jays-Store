"""Escalate paid driverless orders that have waited too long.

An order qualifies when ALL of these hold:
  - payment_status == 'paid'
  - status == 'pending' (no driver accepted yet)
  - needs_driver is True (all-self-delivery orders need no driver)
  - driver is still unassigned
  - created more than --hours ago (default 24)
  - never escalated before (escalated_at is null)

Each qualifying order is stamped (idempotent — re-runs skip it) and the
admin gets one email per order. Nothing about money or status changes.

Schedule (production): Render Cron Job every 6 hours:
    python manage.py escalate_stale_orders
Local dev: run it by hand, or add `--dry-run` to preview without emailing.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Email the admin about paid driverless orders waiting too long (default 24h).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours', type=float, default=24,
            help='Waiting-time threshold in hours (default: 24).',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='List qualifying orders without stamping or emailing.',
        )

    def handle(self, *args, **options):
        from apps.orders.models import Order
        from apps.orders.emails import send_stale_escalation

        hours = options['hours']
        dry_run = options['dry_run']
        cutoff = timezone.now() - timedelta(hours=hours)

        stale = list(Order.objects.filter(
            payment_status='paid',
            status='pending',
            needs_driver=True,
            driver__isnull=True,
            created_at__lt=cutoff,
            escalated_at__isnull=True,
        ).select_related('buyer').prefetch_related('items', 'handoffs').order_by('created_at'))

        if not stale:
            self.stdout.write(self.style.SUCCESS('No stale driverless orders.'))
            return

        emailed = 0
        for order in stale:
            waiting_hours = (timezone.now() - order.created_at).total_seconds() / 3600
            if dry_run:
                self.stdout.write(
                    f'  [dry-run] Order #{order.id} — waiting {waiting_hours:.1f}h — '
                    f'{order.buyer_display_name}'
                )
                continue
            order.escalated_at = timezone.now()
            order.save(update_fields=['escalated_at'])
            try:
                if send_stale_escalation(order, waiting_hours):
                    emailed += 1
            except Exception as exc:  # never break the loop on one bad email
                self.stderr.write(f'  Order #{order.id}: email failed ({exc})')

        self.stdout.write(self.style.SUCCESS(
            f'{"Would escalate" if dry_run else "Escalated"} {len(stale)} order(s)'
            + ('' if dry_run else f', {emailed} email(s) sent')
            + '.'
        ))
