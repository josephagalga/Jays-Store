# Instant-transfer era: per-settlement transfer tracking + fee bearer.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0020_order_escalated_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='settlement',
            name='transfer_reference',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='settlement',
            name='transfer_status',
            field=models.CharField(
                choices=[('pending', 'Pending'), ('sent', 'Sent'), ('failed', 'Failed'), ('held', 'Held')],
                default='pending',
                max_length=15,
            ),
        ),
        migrations.AddField(
            model_name='settlement',
            name='transfer_fee',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=12),
        ),
        migrations.AddField(
            model_name='settlement',
            name='fee_borne_by',
            field=models.CharField(
                choices=[('seller', 'Seller'), ('platform', 'Platform')],
                default='seller',
                max_length=15,
            ),
        ),
        migrations.AddField(
            model_name='settlement',
            name='transfer_error',
            field=models.TextField(blank=True, default=''),
        ),
    ]
