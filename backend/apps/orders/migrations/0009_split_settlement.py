from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0008_order_delivery_landmark'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='processing_fee',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=10),
        ),
        migrations.AddField(
            model_name='order',
            name='paystack_split_code',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='deliveryotplog',
            name='email_sent',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='deliveryotplog',
            name='email_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='deliveryotplog',
            name='sms_sent',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='deliveryotplog',
            name='sms_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='Settlement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('subaccount_code', models.CharField(blank=True, default='', max_length=50)),
                ('gross_share', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('commission', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('fee_slice', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('net_share', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('settled', 'Settled'), ('failed', 'Failed')], default='pending', max_length=15)),
                ('paystack_reference', models.CharField(blank=True, default='', max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('settled_at', models.DateTimeField(blank=True, null=True)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='settlements', to='orders.order')),
                ('seller', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='settlements', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'settlements', 'ordering': ['-created_at']},
        ),
    ]
