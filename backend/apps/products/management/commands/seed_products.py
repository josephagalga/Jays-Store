from django.core.management.base import BaseCommand
from apps.products.models import Category, Product, ProductVariant, ProductImage
from apps.accounts.models import CustomUser


class Command(BaseCommand):
    help = 'Seed the database with sample products using external image URLs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all existing products before seeding',
        )

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting seed...')

        if kwargs['clear']:
            self.stdout.write('Clearing existing products...')
            ProductImage.objects.all().delete()
            ProductVariant.objects.all().delete()
            Product.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Cleared.'))

        admin = CustomUser.objects.filter(role='admin').first()
        if not admin:
            self.stdout.write(self.style.ERROR('No admin found. Cannot seed.'))
            return

        self.stdout.write(f'Using admin: {admin.email}')

        cat_data = [
            {'name': 'Men', 'slug': 'men', 'external_url': 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&auto=format&fit=crop&q=80'},
            {'name': 'Women', 'slug': 'women', 'external_url': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80'},
            {'name': 'Kids', 'slug': 'kids', 'external_url': 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=600&auto=format&fit=crop&q=80'},
            {'name': 'Accessories', 'slug': 'accessories', 'external_url': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80'},
        ]

        cats = {}
        for c in cat_data:
            cat, created = Category.objects.get_or_create(
                slug=c['slug'],
                defaults={
                    'name': c['name'],
                    'is_active': True,
                    'external_url': c['external_url'],
                }
            )
            if not created and not cat.external_url:
                cat.external_url = c['external_url']
                cat.save()
            cats[c['slug']] = cat
            self.stdout.write(f'Category ready: {cat.name}')

        products_data = [
            # ── MEN ───────────────────────────────────────────
            {
                'name': 'Classic White Linen Shirt',
                'slug': 'classic-white-linen-shirt',
                'description': 'A timeless white linen shirt perfect for any occasion. Lightweight and breathable.',
                'price': 189.00, 'gender': 'men', 'brand': 'Essentials',
                'category_key': 'men', 'tags': 'casual, summer, lightweight, linen, white',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'White'), ('M', 'White'), ('L', 'White'), ('XL', 'White')],
            },
            {
                'name': 'Tailored Black Blazer',
                'slug': 'tailored-black-blazer',
                'description': 'Sharp and sophisticated black blazer for formal and smart casual occasions.',
                'price': 450.00, 'gender': 'men', 'brand': 'Noir',
                'category_key': 'men', 'tags': 'formal, office, smart, blazer, black',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'Black'), ('M', 'Black'), ('L', 'Black'), ('XL', 'Black')],
            },
            {
                'name': 'Slim Fit Chinos',
                'slug': 'slim-fit-chinos',
                'description': 'Modern slim fit chinos in khaki. Versatile for work and weekend.',
                'price': 175.00, 'gender': 'men', 'brand': 'Craft',
                'category_key': 'men', 'tags': 'chinos, slim, khaki, smart casual',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80',
                'variants': [('30', 'Khaki'), ('32', 'Khaki'), ('34', 'Khaki'), ('36', 'Khaki')],
            },
            {
                'name': 'Denim Jacket',
                'slug': 'denim-jacket',
                'description': 'Classic denim jacket that never goes out of style.',
                'price': 255.00, 'gender': 'men', 'brand': 'Indigo',
                'category_key': 'men', 'tags': 'denim, jacket, casual, classic',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'Blue'), ('M', 'Blue'), ('L', 'Blue'), ('XL', 'Blue')],
            },
            {
                'name': 'Graphic Tee',
                'slug': 'graphic-tee-men',
                'description': 'Bold graphic tee in 100% combed cotton. Relaxed fit.',
                'price': 89.00, 'gender': 'men', 'brand': 'Urban',
                'category_key': 'men', 'tags': 'graphic, tee, casual, bold, cotton',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'Black'), ('M', 'Black'), ('L', 'White'), ('XL', 'White')],
            },
            {
                'name': 'Wool Blend Overcoat',
                'slug': 'wool-blend-overcoat',
                'description': 'Premium wool blend overcoat for cool weather.',
                'price': 620.00, 'gender': 'men', 'brand': 'Noir',
                'category_key': 'men', 'tags': 'coat, wool, winter, overcoat, formal',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'Camel'), ('M', 'Camel'), ('L', 'Grey'), ('XL', 'Grey')],
            },
            {
                'name': 'Printed Ankara Shirt',
                'slug': 'printed-ankara-shirt',
                'description': 'Vibrant Ankara print shirt celebrating African heritage.',
                'price': 195.00, 'gender': 'men', 'brand': 'Kente Co.',
                'category_key': 'men', 'tags': 'ankara, african, print, cultural, vibrant',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'Multi'), ('M', 'Multi'), ('L', 'Multi'), ('XL', 'Multi')],
            },
            {
                'name': 'Athletic Jogger Pants',
                'slug': 'athletic-jogger-pants',
                'description': 'Comfortable jogger pants in moisture-wicking fabric.',
                'price': 130.00, 'gender': 'men', 'brand': 'Active',
                'category_key': 'men', 'tags': 'jogger, athletic, sport, gym, casual',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'Black'), ('M', 'Black'), ('L', 'Grey'), ('XL', 'Grey')],
            },
            {
                'name': 'Slim Fit Suit',
                'slug': 'slim-fit-suit',
                'description': 'Complete slim fit two-piece suit for weddings and formal events.',
                'price': 850.00, 'gender': 'men', 'brand': 'Prestige',
                'category_key': 'men', 'tags': 'suit, formal, slim, wedding, event',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'Navy'), ('M', 'Navy'), ('L', 'Charcoal'), ('XL', 'Charcoal')],
            },
            {
                'name': 'Oversized Hoodie',
                'slug': 'oversized-hoodie',
                'description': 'Cosy oversized hoodie in premium fleece.',
                'price': 165.00, 'gender': 'unisex', 'brand': 'Cozy',
                'category_key': 'men', 'tags': 'hoodie, casual, oversized, cosy, fleece',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'Grey'), ('M', 'Grey'), ('L', 'Black'), ('XL', 'Black')],
            },
            {
                'name': 'Bomber Jacket',
                'slug': 'bomber-jacket-men',
                'description': 'Classic bomber jacket with ribbed cuffs.',
                'price': 295.00, 'gender': 'men', 'brand': 'Urban',
                'category_key': 'men', 'tags': 'bomber, jacket, casual, stylish',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'Olive'), ('M', 'Olive'), ('L', 'Black'), ('XL', 'Black')],
            },
            {
                'name': 'Turtleneck Sweater',
                'slug': 'turtleneck-sweater-men',
                'description': 'Soft merino wool turtleneck sweater. Elegant and warm.',
                'price': 245.00, 'gender': 'men', 'brand': 'Wool & Co',
                'category_key': 'men', 'tags': 'turtleneck, sweater, wool, winter, elegant',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1580331451062-99ff652288d7?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'Cream'), ('M', 'Cream'), ('L', 'Black'), ('XL', 'Navy')],
            },
            {
                'name': 'Linen Trousers',
                'slug': 'linen-trousers-men',
                'description': 'Relaxed linen trousers in natural fabric.',
                'price': 185.00, 'gender': 'men', 'brand': 'Essentials',
                'category_key': 'men', 'tags': 'linen, trousers, summer, relaxed, natural',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'Beige'), ('M', 'Beige'), ('L', 'White'), ('XL', 'White')],
            },
            {
                'name': 'Striped Polo Shirt',
                'slug': 'striped-polo-shirt',
                'description': 'Classic striped polo shirt in premium pique cotton.',
                'price': 145.00, 'gender': 'men', 'brand': 'Club',
                'category_key': 'men', 'tags': 'polo, striped, casual, smart',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'Navy'), ('M', 'Navy'), ('L', 'White'), ('XL', 'White')],
            },
            {
                'name': 'Formal White Dress Shirt',
                'slug': 'formal-white-dress-shirt',
                'description': 'Crisp white dress shirt with spread collar.',
                'price': 165.00, 'gender': 'men', 'brand': 'Prestige',
                'category_key': 'men', 'tags': 'formal, shirt, white, dress, office',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'White'), ('M', 'White'), ('L', 'White'), ('XL', 'White')],
            },

            # ── WOMEN ─────────────────────────────────────────
            {
                'name': 'Floral Wrap Dress',
                'slug': 'floral-wrap-dress',
                'description': 'A beautiful floral wrap dress ideal for summer events.',
                'price': 220.00, 'discount_price': 175.00, 'gender': 'women', 'brand': 'Bloom',
                'category_key': 'women', 'tags': 'floral, summer, dress, feminine',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=600&auto=format&fit=crop&q=80',
                'variants': [('XS', 'Floral'), ('S', 'Floral'), ('M', 'Floral'), ('L', 'Floral')],
            },
            {
                'name': 'High Waist Denim Jeans',
                'slug': 'high-waist-denim-jeans',
                'description': 'Classic high waist denim jeans for everyday wear.',
                'price': 195.00, 'gender': 'women', 'brand': 'Indigo',
                'category_key': 'women', 'tags': 'denim, jeans, casual, everyday, blue',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80',
                'variants': [('28', 'Blue'), ('30', 'Blue'), ('32', 'Blue'), ('34', 'Blue')],
            },
            {
                'name': 'Silk Evening Blouse',
                'slug': 'silk-evening-blouse',
                'description': 'Luxurious silk blouse for evening occasions.',
                'price': 280.00, 'gender': 'women', 'brand': 'Luxe',
                'category_key': 'women', 'tags': 'silk, blouse, evening, elegant, luxury',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600&auto=format&fit=crop&q=80',
                'variants': [('XS', 'Ivory'), ('S', 'Ivory'), ('M', 'Ivory'), ('L', 'Ivory')],
            },
            {
                'name': 'Maxi Boho Dress',
                'slug': 'maxi-boho-dress',
                'description': 'Free-spirited boho maxi dress with intricate embroidery.',
                'price': 235.00, 'gender': 'women', 'brand': 'Bloom',
                'category_key': 'women', 'tags': 'boho, maxi, dress, embroidery, bohemian',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&auto=format&fit=crop&q=80',
                'variants': [('XS', 'Terracotta'), ('S', 'Terracotta'), ('M', 'Blue'), ('L', 'Blue')],
            },
            {
                'name': 'Tailored Blazer Women',
                'slug': 'tailored-blazer-women',
                'description': 'Structured blazer for the modern professional woman.',
                'price': 395.00, 'gender': 'women', 'brand': 'Noir',
                'category_key': 'women', 'tags': 'blazer, formal, office, structured, professional',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1594938298603-c8148c4b0c4b?w=600&auto=format&fit=crop&q=80',
                'variants': [('XS', 'Black'), ('S', 'Black'), ('M', 'Cream'), ('L', 'Cream')],
            },
            {
                'name': 'Pleated Midi Skirt',
                'slug': 'pleated-midi-skirt',
                'description': 'Elegant pleated midi skirt in satin finish.',
                'price': 175.00, 'gender': 'women', 'brand': 'Grace',
                'category_key': 'women', 'tags': 'skirt, midi, pleated, satin, elegant',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&auto=format&fit=crop&q=80',
                'variants': [('XS', 'Blush'), ('S', 'Blush'), ('M', 'Black'), ('L', 'Black')],
            },
            {
                'name': 'Ankara Print Dress',
                'slug': 'ankara-print-dress',
                'description': 'Stunning Ankara print dress celebrating African fashion.',
                'price': 245.00, 'gender': 'women', 'brand': 'Kente Co.',
                'category_key': 'women', 'tags': 'ankara, african, print, cultural, dress',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&auto=format&fit=crop&q=80',
                'variants': [('XS', 'Multi'), ('S', 'Multi'), ('M', 'Multi'), ('L', 'Multi')],
            },
            {
                'name': 'Wide Leg Trousers',
                'slug': 'wide-leg-trousers-women',
                'description': 'Sophisticated wide leg trousers in flowing fabric.',
                'price': 210.00, 'gender': 'women', 'brand': 'Grace',
                'category_key': 'women', 'tags': 'wide leg, trousers, flowing, sophisticated',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80',
                'variants': [('XS', 'Ivory'), ('S', 'Ivory'), ('M', 'Black'), ('L', 'Black')],
            },
            {
                'name': 'Bodycon Mini Dress',
                'slug': 'bodycon-mini-dress',
                'description': 'Sleek bodycon mini dress for evening events.',
                'price': 199.00, 'gender': 'women', 'brand': 'Luxe',
                'category_key': 'women', 'tags': 'bodycon, mini, dress, evening, sleek',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80',
                'variants': [('XS', 'Black'), ('S', 'Black'), ('M', 'Red'), ('L', 'Red')],
            },
            {
                'name': 'Linen Co-ord Set',
                'slug': 'linen-coord-set',
                'description': 'Matching linen top and trouser co-ord set.',
                'price': 285.00, 'gender': 'women', 'brand': 'Essentials',
                'category_key': 'women', 'tags': 'coord, linen, matching, chic, summer',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80',
                'variants': [('XS', 'Sage'), ('S', 'Sage'), ('M', 'Sand'), ('L', 'Sand')],
            },
            {
                'name': 'Trench Coat Women',
                'slug': 'trench-coat-women',
                'description': 'Classic belted trench coat. Timeless and sophisticated.',
                'price': 485.00, 'gender': 'women', 'brand': 'Noir',
                'category_key': 'women', 'tags': 'trench, coat, classic, belted, sophisticated',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=600&auto=format&fit=crop&q=80',
                'variants': [('XS', 'Camel'), ('S', 'Camel'), ('M', 'Black'), ('L', 'Black')],
            },
            {
                'name': 'Ruched Midi Dress',
                'slug': 'ruched-midi-dress',
                'description': 'Flattering ruched midi dress.',
                'price': 225.00, 'gender': 'women', 'brand': 'Grace',
                'category_key': 'women', 'tags': 'ruched, midi, dress, flattering',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80',
                'variants': [('XS', 'Burgundy'), ('S', 'Burgundy'), ('M', 'Forest'), ('L', 'Forest')],
            },
            {
                'name': 'Off Shoulder Top',
                'slug': 'off-shoulder-top',
                'description': 'Romantic off shoulder top in soft cotton blend.',
                'price': 115.00, 'gender': 'women', 'brand': 'Bloom',
                'category_key': 'women', 'tags': 'off shoulder, top, romantic, cotton',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600&auto=format&fit=crop&q=80',
                'variants': [('XS', 'White'), ('S', 'White'), ('M', 'Pink'), ('L', 'Pink')],
            },
            {
                'name': 'Wrap Jumpsuit',
                'slug': 'wrap-jumpsuit',
                'description': 'Elegant wrap jumpsuit with tie waist.',
                'price': 245.00, 'gender': 'women', 'brand': 'Grace',
                'category_key': 'women', 'tags': 'jumpsuit, wrap, elegant, tie waist',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&auto=format&fit=crop&q=80',
                'variants': [('XS', 'Emerald'), ('S', 'Emerald'), ('M', 'Black'), ('L', 'Black')],
            },
            {
                'name': 'Ribbed Knit Dress',
                'slug': 'ribbed-knit-dress',
                'description': 'Cosy ribbed knit midi dress.',
                'price': 195.00, 'gender': 'women', 'brand': 'Cozy',
                'category_key': 'women', 'tags': 'ribbed, knit, dress, cosy, midi',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&auto=format&fit=crop&q=80',
                'variants': [('XS', 'Cream'), ('S', 'Cream'), ('M', 'Brown'), ('L', 'Brown')],
            },

            # ── KIDS ──────────────────────────────────────────
            {
                'name': 'Kids Colourful Tee Pack',
                'slug': 'kids-colourful-tee-pack',
                'description': 'Fun pack of colourful tees for kids.',
                'price': 95.00, 'gender': 'kids', 'brand': 'Tiny',
                'category_key': 'kids', 'tags': 'kids, colourful, casual, cotton, tee',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=600&auto=format&fit=crop&q=80',
                'variants': [('3-4Y', 'Mixed'), ('5-6Y', 'Mixed'), ('7-8Y', 'Mixed')],
            },
            {
                'name': 'Kids Denim Overalls',
                'slug': 'kids-denim-overalls',
                'description': 'Adorable denim overalls for kids.',
                'price': 135.00, 'gender': 'kids', 'brand': 'Tiny',
                'category_key': 'kids', 'tags': 'kids, denim, overalls, adorable',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=600&auto=format&fit=crop&q=80',
                'variants': [('2-3Y', 'Blue'), ('3-4Y', 'Blue'), ('5-6Y', 'Blue'), ('7-8Y', 'Blue')],
            },
            {
                'name': 'Kids Ankara Outfit',
                'slug': 'kids-ankara-outfit',
                'description': 'Beautiful Ankara outfit for kids.',
                'price': 120.00, 'gender': 'kids', 'brand': 'Kente Co.',
                'category_key': 'kids', 'tags': 'kids, ankara, african, cultural, print',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&auto=format&fit=crop&q=80',
                'variants': [('2-3Y', 'Multi'), ('3-4Y', 'Multi'), ('5-6Y', 'Multi'), ('7-8Y', 'Multi')],
            },
            {
                'name': 'Kids School Uniform Set',
                'slug': 'kids-school-uniform',
                'description': 'Complete school uniform set.',
                'price': 145.00, 'gender': 'kids', 'brand': 'Scholar',
                'category_key': 'kids', 'tags': 'kids, school, uniform, formal',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&auto=format&fit=crop&q=80',
                'variants': [('4-5Y', 'White/Navy'), ('5-6Y', 'White/Navy'), ('7-8Y', 'White/Navy'), ('9-10Y', 'White/Navy')],
            },
            {
                'name': 'Kids Hoodie',
                'slug': 'kids-hoodie',
                'description': 'Soft fleece hoodie for kids.',
                'price': 99.00, 'gender': 'kids', 'brand': 'Tiny',
                'category_key': 'kids', 'tags': 'kids, hoodie, warm, fleece, playful',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&auto=format&fit=crop&q=80',
                'variants': [('3-4Y', 'Red'), ('5-6Y', 'Red'), ('7-8Y', 'Blue'), ('9-10Y', 'Blue')],
            },
            {
                'name': 'Girls Party Dress',
                'slug': 'girls-party-dress',
                'description': 'Sparkly party dress for girls.',
                'price': 135.00, 'gender': 'kids', 'brand': 'Bloom',
                'category_key': 'kids', 'tags': 'kids, girls, party, dress, sparkly',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&auto=format&fit=crop&q=80',
                'variants': [('2-3Y', 'Pink'), ('3-4Y', 'Pink'), ('5-6Y', 'Gold'), ('7-8Y', 'Gold')],
            },
            {
                'name': 'Kids Sneakers',
                'slug': 'kids-sneakers',
                'description': 'Comfortable and durable sneakers for active kids.',
                'price': 149.00, 'gender': 'kids', 'brand': 'Stride',
                'category_key': 'kids', 'tags': 'kids, sneakers, shoes, active, durable',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1555274175-6cbf6f3b137b?w=600&auto=format&fit=crop&q=80',
                'variants': [('28', 'White'), ('29', 'White'), ('30', 'Navy'), ('31', 'Navy'), ('32', 'Navy')],
            },
            {
                'name': 'Kids Summer Dress',
                'slug': 'kids-summer-dress',
                'description': 'Light and breezy summer dress for girls.',
                'price': 105.00, 'gender': 'kids', 'brand': 'Bloom',
                'category_key': 'kids', 'tags': 'kids, dress, summer, floral, girls',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=600&auto=format&fit=crop&q=80',
                'variants': [('2-3Y', 'Floral'), ('3-4Y', 'Floral'), ('5-6Y', 'Floral'), ('7-8Y', 'Floral')],
            },

            # ── ACCESSORIES ───────────────────────────────────
            {
                'name': 'Leather Crossbody Bag',
                'slug': 'leather-crossbody-bag',
                'description': 'Premium leather crossbody bag with multiple compartments.',
                'price': 310.00, 'gender': 'unisex', 'brand': 'Craft',
                'category_key': 'accessories', 'tags': 'bag, leather, crossbody, premium',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80',
                'variants': [('One Size', 'Brown'), ('One Size', 'Black')],
            },
            {
                'name': 'Canvas Tote Bag',
                'slug': 'canvas-tote-bag',
                'description': 'Large canvas tote bag. Eco-friendly and practical.',
                'price': 85.00, 'gender': 'unisex', 'brand': 'Craft',
                'category_key': 'accessories', 'tags': 'tote, canvas, bag, eco, practical',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=600&auto=format&fit=crop&q=80',
                'variants': [('One Size', 'Natural'), ('One Size', 'Black')],
            },
            {
                'name': 'Classic Watch',
                'slug': 'classic-watch',
                'description': 'Classic minimalist watch with leather strap.',
                'price': 350.00, 'gender': 'unisex', 'brand': 'Tempo',
                'category_key': 'accessories', 'tags': 'watch, classic, leather, minimalist',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
                'variants': [('One Size', 'Gold/Brown'), ('One Size', 'Silver/Black')],
            },
            {
                'name': 'Leather Belt',
                'slug': 'leather-belt',
                'description': 'Genuine leather belt with classic buckle.',
                'price': 95.00, 'gender': 'unisex', 'brand': 'Heritage',
                'category_key': 'accessories', 'tags': 'belt, leather, classic, staple',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'Brown'), ('M', 'Brown'), ('L', 'Black'), ('XL', 'Black')],
            },
            {
                'name': 'Running Shoes',
                'slug': 'running-shoes',
                'description': 'Lightweight running shoes with cushioned sole.',
                'price': 285.00, 'gender': 'unisex', 'brand': 'Active',
                'category_key': 'accessories', 'tags': 'running, shoes, sport, lightweight',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
                'variants': [('38', 'Black'), ('39', 'Black'), ('40', 'White'), ('41', 'White'), ('42', 'Blue')],
            },
            {
                'name': 'Aviator Sunglasses',
                'slug': 'aviator-sunglasses',
                'description': 'Classic aviator sunglasses with UV400 protection.',
                'price': 135.00, 'gender': 'unisex', 'brand': 'Vision',
                'category_key': 'accessories', 'tags': 'sunglasses, aviator, UV, classic',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1473496169904-658ba7574b0d?w=600&auto=format&fit=crop&q=80',
                'variants': [('One Size', 'Gold/Brown'), ('One Size', 'Silver/Grey')],
            },
            {
                'name': 'Mini Shoulder Bag',
                'slug': 'mini-shoulder-bag',
                'description': 'Compact mini shoulder bag perfect for evenings out.',
                'price': 175.00, 'gender': 'women', 'brand': 'Luxe',
                'category_key': 'accessories', 'tags': 'shoulder bag, mini, evening, compact',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=80',
                'variants': [('One Size', 'Black'), ('One Size', 'Tan'), ('One Size', 'Red')],
            },
            {
                'name': 'Gold Hoop Earrings',
                'slug': 'gold-hoop-earrings',
                'description': 'Classic gold hoop earrings in 18k gold plate.',
                'price': 89.00, 'gender': 'women', 'brand': 'Luxe',
                'category_key': 'accessories', 'tags': 'earrings, gold, hoop, jewellery, classic',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=crop&q=80',
                'variants': [('Small', 'Gold'), ('Large', 'Gold')],
            },
            {
                'name': 'Beaded Bracelet Set',
                'slug': 'beaded-bracelet-set',
                'description': 'Handcrafted beaded bracelet set inspired by African tradition.',
                'price': 55.00, 'gender': 'unisex', 'brand': 'Kente Co.',
                'category_key': 'accessories', 'tags': 'bracelet, beaded, handcraft, african',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1573408301185-9519f94815f8?w=600&auto=format&fit=crop&q=80',
                'variants': [('One Size', 'Multi'), ('One Size', 'Earth Tones')],
            },
            {
                'name': 'Leather Wallet',
                'slug': 'leather-wallet',
                'description': 'Slim leather bifold wallet. Fits all essentials.',
                'price': 115.00, 'gender': 'men', 'brand': 'Heritage',
                'category_key': 'accessories', 'tags': 'wallet, leather, slim, bifold',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80',
                'variants': [('One Size', 'Brown'), ('One Size', 'Black')],
            },
            {
                'name': 'High Top Sneakers',
                'slug': 'high-top-sneakers',
                'description': 'Classic canvas high-top sneakers.',
                'price': 195.00, 'gender': 'unisex', 'brand': 'Stride',
                'category_key': 'accessories', 'tags': 'sneakers, high top, canvas, streetwear',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&auto=format&fit=crop&q=80',
                'variants': [('38', 'White'), ('39', 'White'), ('40', 'Black'), ('41', 'Black'), ('42', 'Red')],
            },
            {
                'name': 'Straw Sun Hat',
                'slug': 'straw-sun-hat',
                'description': 'Classic straw sun hat for beach and outdoor occasions.',
                'price': 75.00, 'gender': 'unisex', 'brand': 'Tropics',
                'category_key': 'accessories', 'tags': 'hat, straw, sun, beach, outdoor',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600&auto=format&fit=crop&q=80',
                'variants': [('One Size', 'Natural')],
            },
            {
                'name': 'Sandals',
                'slug': 'flat-sandals',
                'description': 'Comfortable flat sandals in genuine leather.',
                'price': 165.00, 'gender': 'women', 'brand': 'Heritage',
                'category_key': 'accessories', 'tags': 'sandals, flat, leather, comfortable, summer',
                'is_featured': False,
                'image_url': 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80',
                'variants': [('36', 'Tan'), ('37', 'Tan'), ('38', 'Tan'), ('39', 'Black'), ('40', 'Black')],
            },
            {
                'name': 'Kofi Hat',
                'slug': 'kofi-hat',
                'description': 'Traditional Ghanaian Kofi hat in kente fabric.',
                'price': 85.00, 'gender': 'men', 'brand': 'Kente Co.',
                'category_key': 'accessories', 'tags': 'kofi, hat, ghanaian, kente, cultural',
                'is_featured': True,
                'image_url': 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600&auto=format&fit=crop&q=80',
                'variants': [('S', 'Multi'), ('M', 'Multi'), ('L', 'Multi')],
            },
        ]

        created = 0
        for p in products_data:
            if Product.objects.filter(slug=p['slug']).exists():
                self.stdout.write(f'Skipping {p["name"]} — already exists')
                continue

            variants_data = p.pop('variants')
            image_url = p.pop('image_url')
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
                    product=product,
                    size=size,
                    color=color,
                    stock=25
                )

            # Store Unsplash URL directly — no download needed
            ProductImage.objects.create(
                product=product,
                external_url=image_url,
                is_primary=True,
                order=0
            )

            self.stdout.write(self.style.SUCCESS(f'✓ {product.name}'))
            created += 1

        self.stdout.write(self.style.SUCCESS(f'\nDone — {created} products created.'))