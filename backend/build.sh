#!/usr/bin/env bash
set -o errexit -o pipefail -o nounset

pip install -r requirements.txt

python manage.py migrate

python manage.py collectstatic --noinput

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@jaysstore.com}"
if [ -z "${ADMIN_PASSWORD:-}" ]; then
  echo "ADMIN_PASSWORD not set — skipping admin creation (set it in the environment to create/reset the admin)."
else
  ADMIN_FIRST_NAME="${ADMIN_FIRST_NAME:-Jay}" ADMIN_LAST_NAME="${ADMIN_LAST_NAME:-Admin}" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" python manage.py shell << 'EOF'
import os
from apps.accounts.models import CustomUser
email = os.environ['ADMIN_EMAIL']
user = CustomUser.objects.filter(email=email).first()
if user is None:
    CustomUser.objects.create_superuser(
        email=email,
        password=os.environ['ADMIN_PASSWORD'],
        first_name=os.environ.get('ADMIN_FIRST_NAME', 'Jay'),
        last_name=os.environ.get('ADMIN_LAST_NAME', 'Admin'),
    )
    print('Superuser created')
else:
    user.set_password(os.environ['ADMIN_PASSWORD'])
    user.is_active = True
    user.is_staff = True
    user.save()
    print('Superuser password reset')
EOF
fi

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