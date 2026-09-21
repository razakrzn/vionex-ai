"""
Notification Service for handling hybrid Database + FCM notifications
"""
import logging
from typing import Optional, Dict, Any
from django.conf import settings
from django.contrib.auth import get_user_model
from .models import Notification, NotificationType, UserDevice

User = get_user_model()
logger = logging.getLogger(__name__)

# Try to import Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import messaging, credentials
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logger.warning("firebase-admin not installed. FCM notifications will be disabled.")


class NotificationService:
    """
    Centralized service for sending notifications via Database + FCM hybrid approach.
    
    Usage:
        NotificationService.send_notification(
            user=user,
            type=NotificationType.VERIFICATION_APPROVED,
            title="Account Approved!",
            message="Your account has been verified.",
            metadata={"user_id": str(user.id)}
        )
    """
    
    _firebase_initialized = False
    
    @classmethod
    def _initialize_firebase(cls):
        """Initialize Firebase Admin SDK if not already initialized"""
        if not FIREBASE_AVAILABLE:
            return False
        
        if cls._firebase_initialized:
            return True
        
        try:
            # Check if Firebase is already initialized
            firebase_admin.get_app()
            cls._firebase_initialized = True
            return True
        except ValueError:
            # Firebase not initialized, try to initialize it
            try:
                firebase_service_account_path = getattr(
                    settings, 
                    'FIREBASE_SERVICE_ACCOUNT_PATH', 
                    None
                )
                
                if firebase_service_account_path:
                    cred = credentials.Certificate(firebase_service_account_path)
                    firebase_admin.initialize_app(cred)
                    cls._firebase_initialized = True
                    return True
                else:
                    logger.warning(
                        "FIREBASE_SERVICE_ACCOUNT_PATH not set in settings. "
                        "FCM notifications will be disabled."
                    )
                    return False
            except Exception as e:
                logger.error(f"Failed to initialize Firebase: {str(e)}")
                return False
    
    @classmethod
    def send_notification(
        cls,
        user: User,
        type: str,
        title: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        related_object_type: Optional[str] = None,
        related_object_id: Optional[int] = None
    ) -> tuple[Optional[Notification], Optional[Any]]:
        """
        Send a notification using hybrid approach: Save to DB + Push via FCM
        
        Args:
            user: User to send notification to
            type: Notification type (from NotificationType enum)
            title: Notification title
            message: Notification message
            metadata: Optional metadata dictionary
            related_object_type: Optional related object type (e.g., 'property', 'gym')
            related_object_id: Optional related object ID
            
        Returns:
            Tuple of (Notification object, FCM response or None)
        """
        # 1. Save to Database (In-App Notification)
        notification = Notification.objects.create(
            user=user,
            type=type,
            title=title,
            message=message,
            metadata=metadata or {},
            related_object_type=related_object_type,
            related_object_id=related_object_id
        )
        
        # 2. Send FCM Push Notification
        fcm_response = None
        try:
            fcm_response = cls._send_fcm_notification(
                user=user,
                notification=notification,
                title=title,
                message=message,
                metadata=metadata or {}
            )
        except Exception as e:
            logger.error(
                f"Failed to send FCM notification to user {user.id}: {str(e)}",
                exc_info=True
            )
            # Don't fail the whole operation if FCM fails
            # The notification is already saved in DB
        
        return notification, fcm_response
    
    @classmethod
    def _send_fcm_notification(
        cls,
        user: User,
        notification: Notification,
        title: str,
        message: str,
        metadata: Dict[str, Any]
    ) -> Optional[Any]:
        """
        Send FCM push notification to user's devices
        
        Returns:
            FCM BatchResponse or None if no tokens or Firebase unavailable
        """
        if not FIREBASE_AVAILABLE:
            return None
        
        # Initialize Firebase if needed
        if not cls._initialize_firebase():
            return None
        
        # Get all FCM tokens for the user
        devices = UserDevice.objects.filter(user=user)
        tokens = list(devices.values_list('fcm_token', flat=True))
        
        if not tokens:
            logger.warning(f"⚠️ No FCM tokens found for user {user.id} - notification saved to DB only (no push sent)")
            return None
        
        try:
            # Prepare data payload (includes type for frontend routing)
            data_payload = {
                'type': notification.type,
                'notification_id': str(notification.id),
                'title': title,
                'message': message,
            }
            
            # Add metadata to data payload (convert all values to strings for FCM)
            for key, value in metadata.items():
                data_payload[str(key)] = str(value)
            
            # Create FCM message
            message_obj = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=message,
                ),
                data=data_payload,
                tokens=tokens,
                # Optional: Add Android/iOS specific configs
                android=messaging.AndroidConfig(
                    priority='high',
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound='default',
                            badge=1,
                        )
                    )
                ),
            )
            
            # Check for available multicast methods (API changed in different versions)
            if hasattr(messaging, 'send_each_for_multicast'):
                # Newer API (firebase-admin 6.0.0+)
                response = messaging.send_each_for_multicast(message_obj)
            elif hasattr(messaging, 'send_multicast'):
                # Older API (firebase-admin 5.0.0 - 5.x)
                response = messaging.send_multicast(message_obj)
            else:
                # Fallback for older firebase-admin versions: send individually
                logger.warning("⚠️ send_each_for_multicast/send_multicast not available, using individual sends (upgrade firebase-admin for better performance)")
                
                # Create a simple response tracker
                class SimpleResponse:
                    def __init__(self, success, exception=None):
                        self.success = success
                        self.exception = exception
                
                responses = []
                for token in tokens:
                    try:
                        # Create individual message
                        individual_message = messaging.Message(
                            notification=messaging.Notification(title=title, body=message),
                            data=data_payload,
                            token=token,
                            android=messaging.AndroidConfig(priority='high'),
                            apns=messaging.APNSConfig(
                                payload=messaging.APNSPayload(
                                    aps=messaging.Aps(sound='default', badge=1)
                                )
                            ),
                        )
                        messaging.send(individual_message)
                        responses.append(SimpleResponse(success=True, exception=None))
                    except Exception as e:
                        responses.append(SimpleResponse(success=False, exception=e))
                
                # Create a mock BatchResponse for compatibility
                class MockBatchResponse:
                    def __init__(self, responses):
                        self.responses = responses
                        self.failure_count = sum(1 for r in responses if not r.success)
                        self.success_count = len(responses) - self.failure_count
                
                response = MockBatchResponse(responses)
            
            # Log results
            if response.failure_count > 0:
                logger.warning(
                    f"⚠️ FCM notification sent with {response.failure_count} failures "
                    f"out of {len(tokens)} tokens for user {user.id}"
                )
                # Remove invalid tokens
                for idx, result in enumerate(response.responses):
                    if not result.success:
                        if result.exception:
                            error_code = getattr(result.exception, 'code', None)
                            error_message = str(result.exception)
                            
                            # Log detailed error information
                            logger.error(
                                f"❌ FCM Token Error for user {user.id} (token index {idx}): "
                                f"Code: {error_code}, Message: {error_message}"
                            )
                            
                            # Remove token if it's invalid or unregistered
                            if error_code in [
                                'INVALID_ARGUMENT',
                                'UNREGISTERED',
                                'NOT_FOUND'
                            ]:
                                try:
                                    invalid_token = tokens[idx]
                                    UserDevice.objects.filter(
                                        fcm_token=invalid_token
                                    ).delete()
                                except Exception as e:
                                    logger.error(
                                        f"Error removing invalid token: {str(e)}"
                                    )
                        else:
                            logger.error(
                                f"❌ FCM Token Error for user {user.id} (token index {idx}): "
                                f"Unknown error - no exception details available"
                            )
            else:
                return response
            
        except Exception as e:
            logger.error(
                f"❌ Critical Error sending FCM notification to user {user.id}: {str(e)}",
                exc_info=True
            )
            logger.error(
                f"   This indicates a connection or configuration issue with Firebase."
            )
            return None
    
    @classmethod
    def register_device(
        cls,
        user: User,
        fcm_token: str,
        device_type: Optional[str] = None,
        device_name: Optional[str] = None
    ) -> UserDevice:
        """
        Register or update a device FCM token for a user
        
        Args:
            user: User to register device for
            fcm_token: FCM token from the device
            device_type: Optional device type ('ios', 'android', 'web')
            device_name: Optional device name/identifier
            
        Returns:
            UserDevice instance
        """
        device, created = UserDevice.objects.update_or_create(
            fcm_token=fcm_token,
            defaults={
                'user': user,
                'device_type': device_type,
                'device_name': device_name,
            }
        )
        
        return device
    
    @classmethod
    def unregister_device(cls, fcm_token: str) -> bool:
        """
        Unregister a device by FCM token
        
        Args:
            fcm_token: FCM token to unregister
            
        Returns:
            True if device was found and deleted, False otherwise
        """
        deleted_count, _ = UserDevice.objects.filter(fcm_token=fcm_token).delete()
        return deleted_count > 0
