import hashlib
import secrets
from datetime import timedelta
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
    """Return expiry time (15 minutes from now)."""
    return timezone.now() + timedelta(minutes=15)
