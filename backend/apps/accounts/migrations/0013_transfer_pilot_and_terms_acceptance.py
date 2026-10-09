# Instant-transfer pilot gate + legal acceptance tracking.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_alter_customuser_avatar_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='transfer_recipient_code',
            field=models.CharField(blank=True, default='', max_length=60),
        ),
        migrations.AddField(
            model_name='customuser',
            name='auto_transfer_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='customuser',
            name='terms_accepted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='terms_version',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
    ]
