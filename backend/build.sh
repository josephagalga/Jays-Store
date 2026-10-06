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

# Demo catalog seeding — TESTING ONLY. seed_products uploads fake products
# so testers have something to click through during soft launch.
# NEVER runs for commercial launch: it only runs when ALLOW_SEED=True is
# set in the environment (staging/soft-launch). The real vendor catalog is
# the commercial catalog — a fresh commercial DB stays empty until vendors
# list products. Test users (create_test_users) are likewise never created here.
if [ "${ALLOW_SEED:-False}" = "True" ]; then
  if python manage.py shell -c "from apps.products.models import Product; exit(0 if Product.objects.exists() else 1)"; then
    echo "Products already exist, skipping seed"
  else
    python manage.py seed_products
  fi
else
  echo "Skipping demo seed (ALLOW_SEED not set — commercial mode)"
fi