from django.middleware.common import CommonMiddleware
from django.http import Http404
import logging

logger = logging.getLogger(__name__)


class VisitorTrackingMiddleware:
    """
    Industrial standard visitor tracking middleware.
    Tracks unique visits per session to measure DAU/MAU.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Broaden "visit" tracking to any main entry point
        # Skip static, media, admin, and the analytics logs themselves to avoid loops
        path = request.path
        skip_prefixes = ['/admin/', '/media/', '/static/', '/api/v1/dashboard/visitor-logs/']
        
        should_track = not any(path.startswith(p) for p in skip_prefixes)
        
        if should_track:
            try:
                from apps.analytics.models import UserVisit
                from apps.real_estate.utils import should_increment_view, get_client_ip
                
                # Use a global throttle for "any visit" to avoid bloating DB
                # Same user/IP only tracked once every 10 mins regardless of which page they hit
                if should_increment_view(request, 'app_visit', 'global', throttle_hours=30/60):
                    ip = get_client_ip(request)
                    
                    # Use a fast, free API for demonstration
                    # timeout set to 1s to avoid slowing down the user experience
                    location_data = {}
                    if ip and ip != '127.0.0.1':
                        try:
                            import requests
                            response = requests.get(f"http://ip-api.com/json/{ip}", timeout=1)
                            if response.status_code == 200:
                                location_data = response.json()
                        except Exception:
                            pass

                    # Basic device identification from User-Agent
                    user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
                    if 'mobile' in user_agent:
                        device = 'Mobile'
                    elif 'tablet' in user_agent or 'ipad' in user_agent:
                        device = 'Tablet'
                    else:
                        device = 'Desktop'
                    
                    # More specific identification
                    if 'android' in user_agent:
                        device += ' (Android)'
                    elif 'iphone' in user_agent:
                        device += ' (iPhone)'
                    elif 'windows' in user_agent:
                        device += ' (Windows)'
                    elif 'macintosh' in user_agent:
                        device += ' (Mac)'
                    elif 'linux' in user_agent:
                        device += ' (Linux)'

                    UserVisit.objects.create(
                        user=request.user if request.user.is_authenticated else None,
                        ip_address=ip,
                        session_key=request.session.session_key,
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        device=device,
                        city=location_data.get('city'),
                        country=location_data.get('country'),
                        latitude=location_data.get('lat'),
                        longitude=location_data.get('lon'),
                    )
            except Exception as e:
                logger.error(f"Error tracking visit: {e}")

        response = self.get_response(request)
        return response


class APIFriendlyCommonMiddleware(CommonMiddleware):
    """
    Custom CommonMiddleware that skips APPEND_SLASH redirect for API routes.
    This prevents issues with DELETE and other requests that can't be redirected.
    """
    def process_request(self, request):
        # Skip APPEND_SLASH for API routes
        if request.path.startswith('/api/'):
            # Don't do the redirect for API routes
            return None
        # For non-API routes, use the default behavior
        return super().process_request(request)

