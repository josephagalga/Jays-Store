"""Delivery OTPs never expire: clear historic expiry timestamps."""
from django.db import migrations


def null_expiries(apps, schema_editor):
    DeliveryOTPLog = apps.get_model('orders', 'DeliveryOTPLog')
    DeliveryOTPLog.objects.exclude(otp_expires_at=None).update(otp_expires_at=None)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0022_alter_deliveryotplog_otp_expires_at'),
    ]

    operations = [
        migrations.RunPython(null_expiries, noop),
    ]
