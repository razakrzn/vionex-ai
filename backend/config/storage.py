"""Helpers for Cloudinary-backed Django file fields."""


def get_storage_url(file_field):
    """
    Return a browser-usable URL for a FileField/ImageField.

    Prefers the storage backend URL (Cloudinary) and falls back to the
    stored public id / object key when a URL is unavailable.
    """
    if not file_field:
        return None
    try:
        url = file_field.url
        if url:
            return url
    except (AttributeError, ValueError):
        pass
    return getattr(file_field, "name", None) or None
