from google import genai
from google.genai import types
from django.conf import settings
from apps.products.models import Product

client = genai.Client(api_key=settings.GEMINI_API_KEY)
MODEL = 'gemini-2.0-flash'


def get_product_context(queryset=None):
    if queryset is None:
        queryset = Product.objects.filter(is_active=True).select_related(
            'category', 'subcategory'
        ).prefetch_related('variants')[:100]

    products_text = []
    for product in queryset:
        variants = product.variants.filter(stock__gt=0)
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


def chat_with_gemini(user_message, conversation_history=None, buyer=None):
    try:
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
        response_text = response.text

        product_ids = []
        if '<recommendations>' in response_text and '</recommendations>' in response_text:
            import json
            import re
            try:
                json_str = re.search(
                    r'<recommendations>(.*?)</recommendations>',
                    response_text,
                    re.DOTALL
                ).group(1).strip()
                recommendations = json.loads(json_str)
                product_ids = [item['id'] for item in recommendations]
                response_text = re.sub(
                    r'<recommendations>.*?</recommendations>',
                    '',
                    response_text,
                    flags=re.DOTALL
                ).strip()
            except (json.JSONDecodeError, AttributeError):
                pass

        return {
            'message': response_text,
            'product_ids': product_ids,
        }

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f'Gemini error: {str(e)}')
        raise


def get_similar_products(product_id, limit=6):
    try:
        product = Product.objects.get(id=product_id, is_active=True)
    except Product.DoesNotExist:
        return []

    try:
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
        response_text = response.text

        if '<recommendations>' in response_text:
            import json
            import re
            json_str = re.search(
                r'<recommendations>(.*?)</recommendations>',
                response_text,
                re.DOTALL
            ).group(1).strip()
            recommendations = json.loads(json_str)
            product_ids = [item['id'] for item in recommendations if item['id'] != product_id]
            return product_ids[:limit]
    except Exception:
        pass

    return []