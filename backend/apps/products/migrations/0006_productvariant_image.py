from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0005_wishlist'),
    ]

    operations = [
        migrations.AddField(
            model_name='productvariant',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='variants/'),
        ),
    ]
