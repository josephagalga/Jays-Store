from django.core.management.base import BaseCommand
from django.core.files import File
from apps.products.models import Category, Product, ProductVariant, ProductImage
from apps.accounts.models import CustomUser
import urllib.request
import tempfile
import os

def add_arguments(self, parser):
    parser.add_argument(
        '--clear',
        action='store_true',
        help='Delete all existing products before seeding',
    )

def handle(self, *args, **kwargs):
    if kwargs['clear']:
        self.stdout.write('Clearing existing products...')
        ProductImage.objects.all().delete()
        ProductVariant.objects.all().delete()
        Product.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('Cleared.'))

class Command(BaseCommand):
    help = 'Seed the database with sample products'

    def handle(self, *args, **kwargs):
        admin = CustomUser.objects.filter(role='admin').first()
        if not admin:
            self.stdout.write(self.style.ERROR('No admin found. Run createsuperuser first.'))
            return

        def download_image(url, filename):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=20) as response:
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
                        tmp.write(response.read())
                        return tmp.name
            except Exception as e:
                self.stdout.write(f'  Image download failed: {e}')
                return None

        cat_data = [
            {'name': 'Men', 'slug': 'men', 'image_url': 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&auto=format&fit=crop&q=80', 'image_name': 'cat-men.jpg'},
            {'name': 'Women', 'slug': 'women', 'image_url': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80', 'image_name': 'cat-women.jpg'},
            {'name': 'Kids', 'slug': 'kids', 'image_url': 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=600&auto=format&fit=crop&q=80', 'image_name': 'cat-kids.jpg'},
            {'name': 'Accessories', 'slug': 'accessories', 'image_url': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80', 'image_name': 'cat-accessories.jpg'},
        ]

        cats = {}
        for c in cat_data:
            cat, created = Category.objects.get_or_create(
                slug=c['slug'],
                defaults={'name': c['name'], 'is_active': True}
            )
            if not cat.image:
                tmp = download_image(c['image_url'], c['image_name'])
                if tmp:
                    with open(tmp, 'rb') as f:
                        cat.image.save(c['image_name'], File(f), save=True)
                    os.unlink(tmp)
            cats[c['slug']] = cat
            self.stdout.write(f'Category ready: {cat.name}')

        products_data = [
            {'name': 'Classic White Linen Shirt', 'slug': 'classic-white-linen-shirt', 'description': 'A timeless white linen shirt perfect for any occasion.', 'price': 189.00, 'gender': 'men', 'brand': 'Essentials', 'category_key': 'men', 'tags': 'casual, summer, lightweight, linen, white', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80', 'image_name': 'white-linen-shirt.jpg', 'variants': [('S','White'),('M','White'),('L','White'),('XL','White')]},
            {'name': 'Tailored Black Blazer', 'slug': 'tailored-black-blazer', 'description': 'Sharp and sophisticated black blazer for formal occasions.', 'price': 450.00, 'gender': 'men', 'brand': 'Noir', 'category_key': 'men', 'tags': 'formal, office, smart, blazer, black', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80', 'image_name': 'black-blazer.jpg', 'variants': [('S','Black'),('M','Black'),('L','Black'),('XL','Black')]},
            {'name': 'Floral Wrap Dress', 'slug': 'floral-wrap-dress', 'description': 'A beautiful floral wrap dress ideal for summer events.', 'price': 220.00, 'discount_price': 175.00, 'gender': 'women', 'brand': 'Bloom', 'category_key': 'women', 'tags': 'floral, summer, dress, feminine', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=600&auto=format&fit=crop&q=80', 'image_name': 'floral-dress.jpg', 'variants': [('XS','Floral'),('S','Floral'),('M','Floral'),('L','Floral')]},
            {'name': 'High Waist Denim Jeans', 'slug': 'high-waist-denim-jeans', 'description': 'Classic high waist denim jeans for everyday wear.', 'price': 195.00, 'gender': 'women', 'brand': 'Indigo', 'category_key': 'women', 'tags': 'denim, jeans, casual, everyday, blue', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80', 'image_name': 'denim-jeans.jpg', 'variants': [('28','Blue'),('30','Blue'),('32','Blue'),('34','Blue')]},
            {'name': 'Kids Colourful Tee Pack', 'slug': 'kids-colourful-tee-pack', 'description': 'Fun pack of colourful tees for kids.', 'price': 95.00, 'gender': 'kids', 'brand': 'Tiny', 'category_key': 'kids', 'tags': 'kids, colourful, casual, cotton, tee', 'is_featured': False, 'image_url': 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=600&auto=format&fit=crop&q=80', 'image_name': 'kids-tee.jpg', 'variants': [('3-4Y','Mixed'),('5-6Y','Mixed'),('7-8Y','Mixed')]},
            {'name': 'Leather Crossbody Bag', 'slug': 'leather-crossbody-bag', 'description': 'Premium leather crossbody bag with multiple compartments.', 'price': 310.00, 'gender': 'unisex', 'brand': 'Craft', 'category_key': 'accessories', 'tags': 'bag, leather, crossbody, premium', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80', 'image_name': 'leather-bag.jpg', 'variants': [('One Size','Brown'),('One Size','Black')]},
            {'name': 'Oversized Hoodie', 'slug': 'oversized-hoodie', 'description': 'Cosy oversized hoodie in premium fleece.', 'price': 165.00, 'gender': 'unisex', 'brand': 'Cozy', 'category_key': 'men', 'tags': 'hoodie, casual, oversized, cosy, fleece', 'is_featured': False, 'image_url': 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&auto=format&fit=crop&q=80', 'image_name': 'hoodie.jpg', 'variants': [('S','Grey'),('M','Grey'),('L','Black'),('XL','Black')]},
            {'name': 'Silk Evening Blouse', 'slug': 'silk-evening-blouse', 'description': 'Luxurious silk blouse for evening occasions.', 'price': 280.00, 'gender': 'women', 'brand': 'Luxe', 'category_key': 'women', 'tags': 'silk, blouse, evening, elegant, luxury', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600&auto=format&fit=crop&q=80', 'image_name': 'silk-blouse.jpg', 'variants': [('XS','Ivory'),('S','Ivory'),('M','Ivory'),('L','Ivory')]},
            {'name': 'Slim Fit Chinos', 'slug': 'slim-fit-chinos', 'description': 'Modern slim fit chinos in khaki.', 'price': 175.00, 'gender': 'men', 'brand': 'Craft', 'category_key': 'men', 'tags': 'chinos, slim, khaki, smart casual', 'is_featured': False, 'image_url': 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80', 'image_name': 'slim-chinos.jpg', 'variants': [('30','Khaki'),('32','Khaki'),('34','Khaki'),('36','Khaki')]},
            {'name': 'Maxi Boho Dress', 'slug': 'maxi-boho-dress', 'description': 'Free-spirited boho maxi dress with intricate embroidery.', 'price': 235.00, 'gender': 'women', 'brand': 'Bloom', 'category_key': 'women', 'tags': 'boho, maxi, dress, embroidery, bohemian', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&auto=format&fit=crop&q=80', 'image_name': 'maxi-boho.jpg', 'variants': [('XS','Terracotta'),('S','Terracotta'),('M','Blue'),('L','Blue')]},
            {'name': 'Denim Jacket', 'slug': 'denim-jacket', 'description': 'Classic denim jacket that never goes out of style.', 'price': 255.00, 'gender': 'men', 'brand': 'Indigo', 'category_key': 'men', 'tags': 'denim, jacket, casual, classic', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&auto=format&fit=crop&q=80', 'image_name': 'denim-jacket.jpg', 'variants': [('S','Blue'),('M','Blue'),('L','Blue'),('XL','Blue')]},
            {'name': 'Pleated Midi Skirt', 'slug': 'pleated-midi-skirt', 'description': 'Elegant pleated midi skirt in satin finish.', 'price': 175.00, 'gender': 'women', 'brand': 'Grace', 'category_key': 'women', 'tags': 'skirt, midi, pleated, satin, elegant', 'is_featured': False, 'image_url': 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&auto=format&fit=crop&q=80', 'image_name': 'midi-skirt.jpg', 'variants': [('XS','Blush'),('S','Blush'),('M','Black'),('L','Black')]},
            {'name': 'Kids Denim Overalls', 'slug': 'kids-denim-overalls', 'description': 'Adorable denim overalls for kids.', 'price': 135.00, 'gender': 'kids', 'brand': 'Tiny', 'category_key': 'kids', 'tags': 'kids, denim, overalls, adorable', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=600&auto=format&fit=crop&q=80', 'image_name': 'kids-overalls.jpg', 'variants': [('2-3Y','Blue'),('3-4Y','Blue'),('5-6Y','Blue'),('7-8Y','Blue')]},
            {'name': 'Ankara Print Dress', 'slug': 'ankara-print-dress', 'description': 'Stunning Ankara print dress celebrating African fashion.', 'price': 245.00, 'gender': 'women', 'brand': 'Kente Co.', 'category_key': 'women', 'tags': 'ankara, african, print, cultural, dress', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&auto=format&fit=crop&q=80', 'image_name': 'ankara-dress.jpg', 'variants': [('XS','Multi'),('S','Multi'),('M','Multi'),('L','Multi')]},
            {'name': 'Printed Ankara Shirt', 'slug': 'printed-ankara-shirt', 'description': 'Vibrant Ankara print shirt celebrating African heritage.', 'price': 195.00, 'gender': 'men', 'brand': 'Kente Co.', 'category_key': 'men', 'tags': 'ankara, african, print, cultural, vibrant', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=600&auto=format&fit=crop&q=80', 'image_name': 'ankara-shirt.jpg', 'variants': [('S','Multi'),('M','Multi'),('L','Multi'),('XL','Multi')]},
            {'name': 'Leather Belt', 'slug': 'leather-belt', 'description': 'Genuine leather belt with classic buckle.', 'price': 95.00, 'gender': 'unisex', 'brand': 'Heritage', 'category_key': 'accessories', 'tags': 'belt, leather, classic, staple', 'is_featured': False, 'image_url': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80', 'image_name': 'leather-belt.jpg', 'variants': [('S','Brown'),('M','Brown'),('L','Black'),('XL','Black')]},
            {'name': 'Running Shoes', 'slug': 'running-shoes', 'description': 'Lightweight running shoes with cushioned sole.', 'price': 285.00, 'gender': 'unisex', 'brand': 'Active', 'category_key': 'accessories', 'tags': 'running, shoes, sport, lightweight', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80', 'image_name': 'running-shoes.jpg', 'variants': [('38','Black'),('39','Black'),('40','White'),('41','White'),('42','Blue')]},
            {'name': 'Classic Watch', 'slug': 'classic-watch', 'description': 'Classic minimalist watch with leather strap.', 'price': 350.00, 'gender': 'unisex', 'brand': 'Tempo', 'category_key': 'accessories', 'tags': 'watch, classic, leather, minimalist', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80', 'image_name': 'classic-watch.jpg', 'variants': [('One Size','Gold/Brown'),('One Size','Silver/Black')]},
            {'name': 'Bomber Jacket', 'slug': 'bomber-jacket-men', 'description': 'Classic bomber jacket with ribbed cuffs.', 'price': 295.00, 'gender': 'men', 'brand': 'Urban', 'category_key': 'men', 'tags': 'bomber, jacket, casual, stylish', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=80', 'image_name': 'bomber-jacket.jpg', 'variants': [('S','Olive'),('M','Olive'),('L','Black'),('XL','Black')]},
            {'name': 'Wide Leg Trousers', 'slug': 'wide-leg-trousers-women', 'description': 'Sophisticated wide leg trousers in flowing fabric.', 'price': 210.00, 'gender': 'women', 'brand': 'Grace', 'category_key': 'women', 'tags': 'wide leg, trousers, flowing, sophisticated', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80', 'image_name': 'wide-leg-trousers.jpg', 'variants': [('XS','Ivory'),('S','Ivory'),('M','Black'),('L','Black')]},
            {'name': 'Kids Ankara Outfit', 'slug': 'kids-ankara-outfit', 'description': 'Beautiful Ankara outfit for kids.', 'price': 120.00, 'gender': 'kids', 'brand': 'Kente Co.', 'category_key': 'kids', 'tags': 'kids, ankara, african, cultural, print', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&auto=format&fit=crop&q=80', 'image_name': 'kids-ankara.jpg', 'variants': [('2-3Y','Multi'),('3-4Y','Multi'),('5-6Y','Multi'),('7-8Y','Multi')]},
            {'name': 'Aviator Sunglasses', 'slug': 'aviator-sunglasses', 'description': 'Classic aviator sunglasses with UV400 protection.', 'price': 135.00, 'gender': 'unisex', 'brand': 'Vision', 'category_key': 'accessories', 'tags': 'sunglasses, aviator, UV, classic', 'is_featured': False, 'image_url': 'https://images.unsplash.com/photo-1473496169904-658ba7574b0d?w=600&auto=format&fit=crop&q=80', 'image_name': 'aviator-sunglasses.jpg', 'variants': [('One Size','Gold/Brown'),('One Size','Silver/Grey')]},
            {'name': 'Trench Coat Women', 'slug': 'trench-coat-women', 'description': 'Classic belted trench coat. Timeless and sophisticated.', 'price': 485.00, 'gender': 'women', 'brand': 'Noir', 'category_key': 'women', 'tags': 'trench, coat, classic, belted, sophisticated', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=600&auto=format&fit=crop&q=80', 'image_name': 'trench-coat.jpg', 'variants': [('XS','Camel'),('S','Camel'),('M','Black'),('L','Black')]},
            {'name': 'Mini Shoulder Bag', 'slug': 'mini-shoulder-bag', 'description': 'Compact mini shoulder bag perfect for evenings out.', 'price': 175.00, 'gender': 'women', 'brand': 'Luxe', 'category_key': 'accessories', 'tags': 'shoulder bag, mini, evening, compact', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=80', 'image_name': 'mini-shoulder-bag.jpg', 'variants': [('One Size','Black'),('One Size','Tan'),('One Size','Red')]},
            {'name': 'Slim Fit Suit', 'slug': 'slim-fit-suit', 'description': 'Complete slim fit two-piece suit for formal events.', 'price': 850.00, 'gender': 'men', 'brand': 'Prestige', 'category_key': 'men', 'tags': 'suit, formal, slim, wedding, event', 'is_featured': True, 'image_url': 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&auto=format&fit=crop&q=80', 'image_name': 'slim-suit.jpg', 'variants': [('S','Navy'),('M','Navy'),('L','Charcoal'),('XL','Charcoal')]},
        ]

        created = 0
        for p in products_data:
            if Product.objects.filter(slug=p['slug']).exists():
                self.stdout.write(f'Skipping {p["name"]} — already exists')
                continue

            variants_data = p.pop('variants')
            image_url = p.pop('image_url')
            image_name = p.pop('image_name')
            category_key = p.pop('category_key')
            discount_price = p.pop('discount_price', None)

            product = Product.objects.create(
                created_by=admin,
                category=cats[category_key],
                discount_price=discount_price,
                **p
            )

            for size, color in variants_data:
                ProductVariant.objects.create(
                    product=product, size=size, color=color, stock=25
                )

            tmp = download_image(image_url, image_name)
            if tmp:
                with open(tmp, 'rb') as f:
                    pi = ProductImage(product=product, is_primary=True, order=0)
                    pi.image.save(image_name, File(f), save=True)
                os.unlink(tmp)
                self.stdout.write(self.style.SUCCESS(f'✓ {product.name}'))
            else:
                self.stdout.write(f'✓ {product.name} (no image)')

            created += 1

        self.stdout.write(self.style.SUCCESS(f'\nDone — {created} products created.'))