from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta
import os
import dj_database_url

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-dev-key-change-me')
DEBUG = os.getenv('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()]
if 'testserver' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('testserver')

CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        'CSRF_TRUSTED_ORIGINS',
        'https://jays-store-steel.vercel.app,https://*.onrender.com',
    ).split(',')
    if o.strip()
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'cloudinary_storage',
    'cloudinary',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'apps.accounts',
    'apps.products',
    'apps.orders',
    'apps.reviews',
    'apps.recommendations',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.core.middleware.UpdateLastActiveMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            ssl_require=True,
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

AUTH_USER_MODEL = 'accounts.CustomUser'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.ScopedRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'login': '10/minute',
        'register': '5/hour',
        'otp': '10/hour',
        'password': '10/hour',
        'contact': '5/hour',
        'checkout': '30/hour',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,https://jays-store-steel.vercel.app,https://myjays-store.vercel.app',
    ).split(',')
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

# ============================================================
# STATIC & MEDIA FILES
# ============================================================

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.getenv('CLOUDINARY_CLOUD_NAME'),
    'API_KEY': os.getenv('CLOUDINARY_API_KEY'),
    'API_SECRET': os.getenv('CLOUDINARY_API_SECRET'),
}

LOGIN_REDIRECT_URL = '/django-admin/'
LOGOUT_REDIRECT_URL = '/django-admin/login/'

USE_CLOUDINARY = all([
    os.getenv('CLOUDINARY_CLOUD_NAME'),
    os.getenv('CLOUDINARY_API_KEY'),
    os.getenv('CLOUDINARY_API_SECRET'),
    not DEBUG,
])

if USE_CLOUDINARY:
    STORAGES = {
        'default': {
            'BACKEND': 'cloudinary_storage.storage.MediaCloudinaryStorage',
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
        },
    }
else:
    STORAGES = {
        'default': {
            'BACKEND': 'django.core.files.storage.FileSystemStorage',
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
        },
    }
    if not DEBUG:
        import logging
        logging.getLogger(__name__).warning(
            'CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET are not all set: '
            'uploads (KYC docs, product images, avatars) use the ephemeral '
            'disk and will 404/disappear on redeploy. Set the env vars.'
        )

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Paystack
PAYSTACK_WEBHOOK_SECRET = os.getenv('PAYSTACK_WEBHOOK_SECRET', '')
PAYSTACK_PUBLIC_KEY = os.getenv('PAYSTACK_PUBLIC_KEY', '')
PAYSTACK_SECRET_KEY = os.getenv('PAYSTACK_SECRET_KEY', '')

# Paystack Ghana gateway fee (passed on to buyer + sellers, pro-rata).
# fee = rate * gross, capped at PAYSTACK_GH_FEE_CAP. Adjust to match
# Paystack's current Ghana pricing if it changes.
PAYSTACK_GH_FEE_RATE = os.getenv('PAYSTACK_GH_FEE_RATE', '0.0195')
PAYSTACK_GH_FEE_CAP = os.getenv('PAYSTACK_GH_FEE_CAP', '10.00')

# Public frontend URL (used for Paystack callback_url + docs)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

# Email — payment confirmations, OTP + receipts to buyers, sales alerts to sellers.
# Sends go over HTTPS via the Gmail API backend (works on hosts like Render
# free tier that block outbound SMTP ports 25/465/587). When the Gmail API
# credentials below are set, EMAIL_BACKEND uses Gmail; otherwise local dev
# falls back to the console backend so checkout never hangs.
# Setup: Google Cloud project -> enable Gmail API -> OAuth client (Desktop)
# with scope https://www.googleapis.com/auth/gmail.send -> generate a
# refresh token -> set the three GMAIL_API_* vars. No custom domain needed;
# mail sends from the authenticated Gmail account (EMAIL_HOST_USER).
# The gmailapi_backend package is optional at import time: it is only added
# to INSTALLED_APPS when installed, so a missing/slow package install can
# never take the whole site down with an startup-time ImportError (which
# surfaces as a bare 502 on every request, with no Django error body).
try:
    import importlib.util as _importlib_util
    _GMAILAPI_AVAILABLE = _importlib_util.find_spec('gmailapi_backend') is not None
except Exception:
    _GMAILAPI_AVAILABLE = False
if _GMAILAPI_AVAILABLE:
    INSTALLED_APPS.append('gmailapi_backend')
if os.getenv('GMAIL_API_REFRESH_TOKEN') and _GMAILAPI_AVAILABLE:
    EMAIL_BACKEND = 'gmailapi_backend.mail.GmailBackend'
else:
    EMAIL_BACKEND = os.getenv(
        'EMAIL_BACKEND',
        'django.core.mail.backends.smtp.EmailBackend'
        if os.getenv('EMAIL_HOST_USER') else
        'django.core.mail.backends.console.EmailBackend',
    )
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
GMAIL_API_CLIENT_ID = os.getenv('GMAIL_API_CLIENT_ID', '')
GMAIL_API_CLIENT_SECRET = os.getenv('GMAIL_API_CLIENT_SECRET', '')
GMAIL_API_REFRESH_TOKEN = os.getenv('GMAIL_API_REFRESH_TOKEN', '')
# Order alerts now live in the on-site inbox (buyer orders / seller orders /
# admin attention) instead of email. Account-security mail (password reset)
# still sends. Set NOTIFY_ORDER_EMAIL_ENABLED=True to also email order
# confirmations (requires the Gmail API credentials above).
NOTIFY_ORDER_EMAIL_ENABLED = os.getenv('NOTIFY_ORDER_EMAIL_ENABLED', 'False') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
# Fail fast (not gunicorn-timeout slow) when SMTP hangs: a hung send must
# surface as a logged EmailLog row, never as a dead connection that browsers
# misreport as a CORS error.
EMAIL_TIMEOUT = int(os.getenv('EMAIL_TIMEOUT', '10'))
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'My Jay\'s Store <no-reply@jaysstore.com>')

# Store owner — receives a payment notification (commission + delivery fee)
# on every confirmed order. No admin email existed before; the platform
# was never notified of its own money.
ADMIN_NOTIFICATION_EMAIL = os.getenv('ADMIN_NOTIFICATION_EMAIL', 'myjaysstore@gmail.com')

# Delivery coverage — towns the platform currently serves.
# Add more town names here as the company grows (frontend reads the same
# list from frontend/src/config/delivery.js — keep the two in sync).
SUPPORTED_DELIVERY_TOWNS = [t.strip() for t in os.getenv('SUPPORTED_DELIVERY_TOWNS', 'Navrongo').split(',') if t.strip()]

# Default commission rate for new sellers (percentage)
# Buyer-pays model: Commission is added on top of seller's listed price
from decimal import Decimal
DEFAULT_COMMISSION_RATE = Decimal(os.getenv('DEFAULT_COMMISSION_RATE', '10.00'))

# Security hardening for production
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    HSTS_SECONDS = 31536000
    # Note: CSRF_TRUSTED_ORIGINS is handled by django-cors-headers / middleware for prod proxies
