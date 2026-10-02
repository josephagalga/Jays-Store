from django.conf import settings
from apps.products.models import Product
import json
import logging
import os
import re

logger = logging.getLogger(__name__)

# Configurable Gemini model with robust fallback
MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
_client = None


def get_client():
    global _client
    if _client is not None:
        return _client

    api_key = getattr(settings, 'GEMINI_API_KEY', None)
    if not api_key:
        raise RuntimeError('GEMINI_API_KEY is not configured')

    from google import genai
    _client = genai.Client(api_key=api_key)
    return _client


def get_product_context(queryset=None):
    if queryset is None:
        queryset = Product.objects.filter(is_active=True).select_related(
            'category', 'subcategory'
        ).prefetch_related('variants')[:100]

    products_text = []
    for product in queryset:
        variants = [v for v in product.variants.all() if v.stock > 0]
        sizes = list(set(v.size for v in variants))
        colors = list(set(v.color for v in variants))

        products_text.append(
            f"ID:{product.id} | {product.name} | "
            f"Brand:{product.brand or 'N/A'} | "
            f"Category:{product.category.name if product.category else 'N/A'} | "
            f"Gender:{product.gender} | "
            f"Price:GHS {product.effective_price} | "
            f"Rating:{product.average_rating}/5 | "
            f"Tags:{product.tags} | "
            f"Sizes:{', '.join(sizes) if sizes else 'N/A'} | "
            f"Colors:{', '.join(colors) if colors else 'N/A'}"
        )

    return '\n'.join(products_text)


def build_system_prompt():
    return """You are a helpful and friendly fashion assistant for Jay's Store,
a fashion e-commerce platform in Ghana. Your job is to help buyers find
clothing and accessories that match their needs, budget, and style.

RULES:
- Only recommend products that exist in the store catalog provided
- Always reference products by their exact ID so the frontend can display them
- Keep responses friendly, concise and helpful
- When recommending products, always mention the price in GHS
- If a buyer's budget or request does not match any products, say so honestly
- You can ask follow-up questions to better understand what the buyer wants
- Never make up products that are not in the catalog

RESPONSE FORMAT FOR RECOMMENDATIONS:
When recommending products, always end your response with a JSON block like this:
<recommendations>
[{"id": 1}, {"id": 2}, {"id": 3}]
</recommendations>

If you are just answering a question without recommending products, skip the JSON block."""


def build_history(conversation_history):
    from google.genai import types
    history = []
    for msg in conversation_history or []:
        role = msg.get('role', 'user')
        content = msg.get('content', '')
        if role in ['user', 'model'] and content:
            history.append(
                types.Content(
                    role=role,
                    parts=[types.Part(text=content)]
                )
            )
    return history


def parse_recommendations(response_text):
    product_ids = []
    cleaned = response_text or ''

    if '<recommendations>' in cleaned and '</recommendations>' in cleaned:
        try:
            json_str = re.search(
                r'<recommendations>(.*?)</recommendations>',
                cleaned,
                re.DOTALL
            ).group(1).strip()
            json_str = re.sub(r'^```(?:json)?\s*|\s*```$', '', json_str).strip()
            recommendations = json.loads(json_str)
            product_ids = [
                int(item['id'])
                for item in recommendations
                if isinstance(item, dict) and 'id' in item
            ]
            cleaned = re.sub(
                r'<recommendations>.*?</recommendations>',
                '',
                cleaned,
                flags=re.DOTALL
            ).strip()
        except (json.JSONDecodeError, AttributeError, TypeError, ValueError):
            pass

    return cleaned, product_ids


def catalog_smart_fallback(user_message):
    """
    Intelligent catalog matching fallback when external Gemini API is unreachable,
    rate-limited, or has an invalid/expired key.
    """
    msg_lower = user_message.lower()
    products_qs = Product.objects.filter(is_active=True).select_related('category', 'subcategory')

    # 1. Budget extraction
    budget_match = re.search(r'(?:under|below|less than|within|max|budget(?: of)?)\s*(?:ghs|ghc|cedis?|\$)?\s*(\d+(?:\.\d+)?)', msg_lower)
    max_price = float(budget_match.group(1)) if budget_match else None

    # 2. Gender extraction
    target_genders = []
    if any(w in msg_lower for w in ['men', 'man', 'male', 'boy', 'gentleman']):
        target_genders.extend(['men', 'unisex'])
    if any(w in msg_lower for w in ['women', 'woman', 'female', 'lady', 'ladies', 'girl']):
        target_genders.extend(['women', 'unisex'])
    if any(w in msg_lower for w in ['kid', 'kids', 'child', 'children', 'toddler', 'baby']):
        target_genders.extend(['kids'])

    # 3. Score all active products against user prompt
    scored_products = []
    stop_words = {'i', 'need', 'a', 'an', 'the', 'for', 'to', 'in', 'and', 'or', 'of', 'something', 'show', 'me', 'find', 'what', 'do', 'you', 'have', 'under', 'with', 'is'}
    tokens = [w for w in re.findall(r'\b\w+\b', msg_lower) if w not in stop_words and len(w) > 2]

    for product in products_qs:
        price = float(product.effective_price)
        if max_price and price > max_price:
            continue

        score = 0
        if target_genders and product.gender in target_genders:
            score += 3

        prod_text = f"{product.name} {product.brand or ''} {product.tags or ''} {product.description or ''} {product.category.name if product.category else ''}".lower()

        for token in tokens:
            if token in product.name.lower():
                score += 5
            elif product.tags and token in product.tags.lower():
                score += 4
            elif token in prod_text:
                score += 2

        if score > 0:
            scored_products.append((score, product))

    scored_products.sort(key=lambda x: (-x[0], -float(x[1].average_rating), float(x[1].effective_price)))
    selected = [p for _, p in scored_products[:6]]

    if not selected:
        # Fallback to general popular products
        selected = list(products_qs.order_by('-is_featured', '-average_rating')[:4])

    product_ids = [p.id for p in selected]
    
    # Generate friendly response text
    items_desc = ', '.join([f"{p.name} (GHS {float(p.effective_price):.2f})" for p in selected[:3]])
    response_msg = f"I found great options matching your request! Here are top picks from our store: {items_desc}."
    if max_price:
        response_msg += f" All within your budget of GHS {max_price:.2f}."

    return {
        'message': response_msg,
        'product_ids': product_ids,
    }


def chat_with_gemini(user_message, conversation_history=None, buyer=None):
    try:
        from google.genai import types
        client = get_client()

        personalisation = ''
        if buyer:
            try:
                recent_orders = buyer.orders.filter(
                    status='delivered'
                ).prefetch_related('items__product').order_by('-created_at')[:5]

                if recent_orders.exists():
                    past_products = []
                    for order in recent_orders:
                        for item in order.items.all():
                            if item.product:
                                past_products.append(item.product_name)
                    if past_products:
                        personalisation = (
                            f'\n\nThis buyer has previously ordered: {", ".join(past_products)}. '
                            f'Use this to personalise your recommendations.'
                        )
            except Exception:
                pass

        product_context = get_product_context()
        full_message = (
            f'AVAILABLE PRODUCTS IN STORE:\n{product_context}'
            f'{personalisation}'
            f'\n\nBUYER MESSAGE: {user_message}'
        )

        history = build_history(conversation_history)
        chat = client.chats.create(
            model=MODEL,
            config=types.GenerateContentConfig(
                system_instruction=build_system_prompt(),
            ),
            history=history,
        )

        response = chat.send_message(full_message)
        response_text, product_ids = parse_recommendations(response.text)

        return {
            'message': response_text,
            'product_ids': product_ids,
        }

    except Exception as e:
        logger.warning(f'Gemini live API unavailable or failed ({str(e)}), switching to catalog matching fallback.')
        return catalog_smart_fallback(user_message)


def get_similar_products(product_id, limit=6):
    try:
        product = Product.objects.get(id=product_id, is_active=True)
    except Product.DoesNotExist:
        return []

    fallback = list(
        Product.objects.filter(
            is_active=True,
            category=product.category,
        ).exclude(id=product_id).values_list('id', flat=True)[:limit]
    )

    try:
        from google.genai import types
        client = get_client()
        product_context = get_product_context()

        prompt = (
            f'AVAILABLE PRODUCTS:\n{product_context}\n\n'
            f'Find {limit} products similar to this one: '
            f'{product.name} | {product.brand} | {product.category} | '
            f'GHS {product.effective_price} | Tags: {product.tags}\n\n'
            f'Return only the recommendations JSON block, nothing else.'
        )

        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=build_system_prompt(),
            )
        )
        _, product_ids = parse_recommendations(response.text)
        product_ids = [pid for pid in product_ids if pid != product_id][:limit]
        return product_ids or fallback
    except Exception as e:
        logger.warning(f'Gemini similar products live API unavailable ({str(e)}), using category fallback.')
        return fallback
