import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.contrib.auth import get_user_model
U = get_user_model()

users = [
    # Admin
    dict(email='admin@jaysstore.com', password='Password123!', first_name='Admin', last_name='User', role='admin', is_staff=True, is_superuser=True),
    # Buyer
    dict(email='buyer@jaysstore.com', password='Password123!', first_name='Test', last_name='Buyer', role='buyer', phone_number='0240000000', delivery_address='Test Address Accra'),
    # Vendors (sellers)
    dict(email='vendor1@jaysstore.com', password='Password123!', first_name='Kofi', last_name='Mensah', role='seller', store_name='Kofi Streetwear', store_slug='kofi-streetwear', phone_number='0241111111', store_address='Accra, Ghana', store_description='Welcome to Kofi Streetwear! Quality fashion.'),
    dict(email='vendor2@jaysstore.com', password='Password123!', first_name='Ama', last_name='Asante', role='seller', store_name='Ama Fashion', store_slug='ama-fashion', phone_number='0242222222', store_address='Kumasi, Ghana', store_description='Welcome to Ama Fashion! Trendy styles.'),
    dict(email='vendor3@jaysstore.com', password='Password123!', first_name='Yaw', last_name='Owusu', role='seller', store_name='Yaw Accessories', store_slug='yaw-accessories', phone_number='0243333333', store_address='Takoradi, Ghana', store_description='Welcome to Yaw Accessories!'),
    # Driver
    dict(email='driver@jaysstore.com', password='Password123!', first_name='Test', last_name='Driver', role='driver', phone_number='0244444444', vehicle_type='Motorcycle', verification_status='approved'),
]

for u in users:
    pwd = u.pop('password')
    obj, created = U.objects.get_or_create(email=u['email'], defaults={k: v for k, v in u.items() if k != 'password'})
    for k, v in u.items():
        if k == 'password':
            continue
        setattr(obj, k, v)
    obj.set_password(pwd)
    obj.save()
    print(('CREATED' if created else 'UPDATED'), obj.email, obj.role)

print('---DONE---')
print('Total users:', U.objects.count())
for x in U.objects.order_by('role', 'email'):
    print(x.email, '|', x.role, '|', getattr(x, 'store_slug', None) or '')
