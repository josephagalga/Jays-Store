# Generated manually for vendor pickup location

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_contactmessage_newslettersubscriber'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='store_address',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='pickup_location',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
    ]
