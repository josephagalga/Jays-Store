# Generated manually for COD PIN + Paystack fields

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_payout'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='delivery_pin',
            field=models.CharField(blank=True, max_length=4, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='pin_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='order',
            name='paystack_reference',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AlterField(
            model_name='order',
            name='payment_status',
            field=models.CharField(choices=[('unpaid', 'Unpaid'), ('paid', 'Paid'), ('failed', 'Failed'), ('refunded', 'Refunded')], default='unpaid', max_length=20),
        ),
        migrations.CreateModel(
            name='DeliveryPinLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=4)),
                ('buyer_notified', models.BooleanField(default=False)),
                ('attempts', models.PositiveIntegerField(default=0)),
                ('is_verified', models.BooleanField(default=False)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('driver', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pin_logs', to=settings.AUTH_USER_MODEL)),
                ('order', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='pin_log', to='orders.order')),
            ],
            options={
                'db_table': 'delivery_pin_logs',
                'ordering': ['-created_at'],
            },
        ),
    ]
