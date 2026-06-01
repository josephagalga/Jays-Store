#!/usr/bin/env bash
set -o errexit
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
echo "from apps.accounts.models import CustomUser; CustomUser.objects.filter(email='admin@jaysstore.com').exists() or CustomUser.objects.create_superuser(email='admin@jaysstore.com', password='Admin1234!', first_name='Jay', last_name='Admin')" | python manage.py shell
python manage.py seed_products