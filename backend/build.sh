#!/usr/bin/env bash
set -o errexit -o pipefail -o nounset

pip install -r requirements.txt

python manage.py migrate

python manage.py collectstatic --noinput

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
from apps.products.models import Product
# Only seed if this is a fresh deploy (no products exist yet)
if not Product.objects.exists():
    print('SEED_NEEDED')
else:
    print('SKIP_SEED')
EOF

if python manage.py shell -c "from apps.products.models import Product; exit(0 if Product.objects.exists() else 1)"; then
  echo "Products already exist, skipping seed"
else
  python manage.py seed_products
fi