from django.db import models, transaction
from django.utils import timezone
from datetime import timedelta
from django.core.cache import cache
import hashlib


def get_client_identifier(request):
    """
    Get a unique identifier for the client (user or IP-based).
    Returns a string that uniquely identifies the client.
    """
    user = getattr(request, 'user', None)
    if user and user.is_authenticated:
        # For authenticated users, use user ID
        return f"user_{user.id}"
    else:
        # For unauthenticated users, use IP address + User-Agent hash
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        # Create a hash to avoid storing full IP/UA
        identifier = hashlib.md5(f"{ip_address}_{user_agent}".encode()).hexdigest()
        return f"ip_{identifier}"


def get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def should_increment_view(request, content_type, content_id, throttle_hours=24):
    """
    Check if a view should be counted based on throttling rules.
    
    Args:
        request: Django request object
        content_type: String identifier for content type ('property' or 'gym')
        content_id: ID of the content being viewed
        throttle_hours: Hours to wait before allowing another view count (default: 24)
    
    Returns:
        bool: True if view should be counted, False otherwise
    """
    client_id = get_client_identifier(request)
    cache_key = f"view_{content_type}_{content_id}_{client_id}"
    
    # Check if this view was already counted recently
    last_view_time = cache.get(cache_key)
    if last_view_time:
        # View was already counted within throttle period
        return False
    
    # This is a new view or outside throttle period
    # Set cache with expiration time
    cache.set(cache_key, timezone.now(), timeout=throttle_hours * 3600)
    return True


def increment_view_count_atomic(model_instance):
    """
    Atomically increment view count using F() expression to prevent race conditions.
    
    Args:
        model_instance: Model instance with views_count field
    
    Returns:
        int: New view count after increment
    """
    from django.db.models import F
    
    # Use atomic transaction and F() expression to prevent race conditions
    with transaction.atomic():
        # Use update() with F() expression for atomic increment at database level
        model_instance.__class__.objects.filter(pk=model_instance.pk).update(
            views_count=F('views_count') + 1
        )
        # Refresh to get the actual new value
        model_instance.refresh_from_db()
        return model_instance.views_count
