from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notifications'
    verbose_name = 'Notifications'
    
    def ready(self):
        """Initialize Firebase when app is ready"""
        try:
            from django.conf import settings
            from apps.notifications.services import NotificationService
            
            # Initialize Firebase if service account path is configured
            if hasattr(settings, 'FIREBASE_SERVICE_ACCOUNT_PATH'):
                NotificationService._initialize_firebase()
        except Exception as e:
            logger.warning(f"Could not initialize Firebase in app ready: {str(e)}")
