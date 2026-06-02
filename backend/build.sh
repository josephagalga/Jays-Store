#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

python manage.py shell << 'EOF'
from apps.accounts.models import CustomUser
if not CustomUser.objects.filter(email='admin@jaysstore.com').exists():
    CustomUser.objects.create_superuser(
        email='admin@jaysstore.com',
        password='Admin1234!',
        first_name='Jay',
        last_name='Admin'
    )
    print('Superuser created')
else:
    print('Superuser already exists')
EOF

python manage.py shell << 'EOF'
from apps.products.models import ProductImage
print(f'Deleting {ProductImage.objects.count()} existing images...')
ProductImage.objects.all().delete()
print('Done')
EOF

python manage.py seed_products