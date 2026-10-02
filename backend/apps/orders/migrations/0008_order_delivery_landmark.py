from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0007_remove_deliveryotplog_code_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='delivery_landmark',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
