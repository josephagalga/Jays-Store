from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0009_split_settlement'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='paystack_fee_actual',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.CreateModel(
            name='EmailLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('to_email', models.EmailField(blank=True, default='', max_length=254)),
                ('subject', models.CharField(blank=True, default='', max_length=200)),
                ('kind', models.CharField(blank=True, default='', max_length=30)),
                ('ok', models.BooleanField(default=False)),
                ('error', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='email_logs', to='orders.order')),
            ],
            options={'db_table': 'email_logs', 'ordering': ['-created_at']},
        ),
    ]
