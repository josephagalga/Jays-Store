import base64
import hashlib
import secrets
from datetime import timedelta
from django.conf import settings
from django.utils import timezone


def generate_otp():
    """Generate a secure 4-digit OTP using secrets module (cryptographically secure)."""
    return f'{secrets.randbelow(10000):04d}'


def hash_otp(otp):
    """Hash OTP using SHA256 for secure storage."""
    return hashlib.sha256(otp.encode()).hexdigest()


def verify_otp(provided_otp, stored_hash):
    """Verify OTP against stored hash using constant-time comparison."""
    provided_hash = hashlib.sha256(provided_otp.encode()).hexdigest()
    return secrets.compare_digest(provided_hash, stored_hash)


def get_otp_expiry():
    """Delivery OTPs must survive until the driver arrives (hours/days later),
    so they live 7 days, not minutes. Resending rotates to a fresh code."""
    return timezone.now() + timedelta(days=7)


def _fernet():
    from cryptography.fernet import Fernet
    secret = (getattr(settings, 'SECRET_KEY', '') or '').encode()
    digest = hashlib.sha256(secret).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_otp(otp):
    """Reversibly encrypt an OTP so it can be shown back to its owner only.
    Verification still uses the hash; this copy exists purely for display."""
    try:
        return _fernet().encrypt(otp.encode()).decode()
    except Exception:
        return ''


def decrypt_otp(token):
    """Return the OTP plaintext, or '' if undecryptable."""
    if not token:
        return ''
    try:
        return _fernet().decrypt(token.encode()).decode()
    except Exception:
        return ''
