import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from apps.products.models import Product, ProductVariant

U = get_user_model()

print('Creating vendors...')

vendors = [
    {'email': 'vendor1@jaysstore.com', 'first_name': 'Kofi', 'last_name': 'Mensah', 'store_name': 'Kofi Streetwear', 'store_slug': 'kofi-streetwear', 'password': 'Password123!'},
    {'email': 'vendor2@jaysstore.com', 'first_name': 'Ama', 'last_name': 'Asante', 'store_name': 'Ama Fashion', 'store_slug': 'ama-fashion', 'password': 'Password123!'},
    {'email': 'vendor3@jaysstore.com', 'first_name': 'Yaw', 'last_name': 'Owusu', 'store_name': 'Yaw Accessories', 'store_slug': 'yaw-accessories', 'password': 'Password123!'},
]

for v in vendors:
    user, created = U.objects.get_or_create(email=v['email'], defaults={'first_name': v['first_name'], 'last_name': v['last_name'], 'role': 'seller'})
    user.store_name = v['store_name']
    user.store_slug = v['store_slug']
    user.phone_number = '0240000000'
    user.store_address = 'Accra, Ghana'
    user.store_description = f'Welcome to {v["store_name"]}! Quality fashion and accessories.'
    user.save()
    user.set_password(v['password'])
    user.save()
    print(f"Created: {user.email} -> slug: {user.store_slug}")

# Now distribute all products among the 3 vendors
vendor1 = U.objects.get(email='vendor1@jaysstore.com')
vendor2 = U.objects.get(email='vendor2@jaysstore.com')
vendor3 = U.objects.get(email='vendor3@jaysstore.com')

products = Product.objects.all()
vendor_list = [vendor1, vendor2, vendor3]

for i, product in enumerate(products):
    vendor = vendor_list[i % 3]
    product.seller = vendor
    product.save()
    print(f"Assigned {product.name} to {vendor.store_name}")

print('Done!')