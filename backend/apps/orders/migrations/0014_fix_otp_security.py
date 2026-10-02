# Generated migration for OTP security improvements on 2026-10-01

from django.db import migrations, models
import django.utils.timezone
from datetime import timedelta


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0013_add_commission_collected'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='deliveryotplog',
            name='otp',
        ),
        migrations.AddField(
            model_name='deliveryotplog',
            name='otp_hash',
            field=models.CharField(max_length=128, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='deliveryotplog',
            name='otp_created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='deliveryotplog',
            name='otp_expires_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name='deliveryotplog',
            name='is_locked',
            field=models.BooleanField(default=False),
        ),
    ]
