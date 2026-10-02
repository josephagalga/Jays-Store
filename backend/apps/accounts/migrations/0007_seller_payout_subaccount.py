from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_customuser_sales_record_sent'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='payout_account_number',
            field=models.CharField(blank=True, default='', max_length=30),
        ),
        migrations.AddField(
            model_name='customuser',
            name='payout_bank_code',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
        migrations.AddField(
            model_name='customuser',
            name='payout_account_name',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='customuser',
            name='paystack_subaccount_code',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
        migrations.AddField(
            model_name='customuser',
            name='subaccount_status',
            field=models.CharField(
                choices=[('none', 'None'), ('pending', 'Pending'), ('active', 'Active'), ('failed', 'Failed')],
                default='none', max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='subaccount_note',
            field=models.TextField(blank=True, default=''),
        ),
    ]
