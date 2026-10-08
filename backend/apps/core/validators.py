"""Shared upload validators (imported by models; enforced by DRF automatically)."""
from django.core.exceptions import ValidationError

# Cloudinary's free tier rejects images over 10 MB anyway — fail fast with a
# clear message instead of a late storage error, and cap local disk usage.
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def validate_image_file_size(value):
    if value is not None and getattr(value, 'size', 0) > MAX_IMAGE_BYTES:
        raise ValidationError(
            f'Image is too large ({value.size // 1024 // 1024} MB). Maximum is 10 MB.'
        )
