from django.core.management.base import BaseCommand
from apps.accounts.models import CustomUser


class Command(BaseCommand):
    help = 'Creates test accounts for admin, buyer, seller, and driver roles.'

    def handle(self, *args, **options):
        test_users = [
            {
                'email': 'admin@jaysstore.com',
                'password': 'Password123!',
                'first_name': 'Jay',
                'last_name': 'Admin',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
                'is_verified': True,
                'phone_number': '+233200000000',
            },
            {
                'email': 'buyer@jaysstore.com',
                'password': 'Password123!',
                'first_name': 'Kofi',
                'last_name': 'Mensah',
                'role': 'buyer',
                'delivery_address': '12 Ring Road Central, Accra, Ghana',
                'phone_number': '+233240000001',
                'is_verified': True,
            },
            {
                'email': 'seller@jaysstore.com',
                'password': 'Password123!',
                'first_name': 'Ama',
                'last_name': 'Osei',
                'role': 'seller',
                'store_name': "Ama's Boutique",
                'store_description': 'Authentic Ghanaian and modern fashion wear.',
                'phone_number': '+233240000002',
                'is_verified': True,
            },
            {
                'email': 'driver@jaysstore.com',
                'password': 'Password123!',
                'first_name': 'Kwame',
                'last_name': 'Boateng',
                'role': 'driver',
                'vehicle_type': 'Motorcycle',
                'verification_status': 'approved',
                'is_verified': True,
                'is_available': True,
                'phone_number': '+233240000003',
            },
        ]

        for data in test_users:
            email = data['email']
            password = data.pop('password')
            user, created = CustomUser.objects.get_or_create(email=email, defaults=data)
            if not created:
                for k, v in data.items():
                    setattr(user, k, v)
            user.set_password(password)
            user.save()
            action = 'Created' if created else 'Updated'
            self.stdout.write(self.style.SUCCESS(f'{action} {user.role.upper()}: {user.email} (Password: {password})'))
