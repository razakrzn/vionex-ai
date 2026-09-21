from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone
from datetime import datetime
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from .serializers import (
    NotificationSerializer, 
    NotificationListSerializer,
    DeviceRegistrationSerializer,
    UserDeviceSerializer
)


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user notifications
    Users can only see their own notifications
    Supports: GET (list, retrieve), DELETE (delete), POST (mark-read, mark-all-read)
    """
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination for notifications
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK, extra_meta=None):
        """Helper method to format success responses"""
        meta = {
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        # Merge in any extra metadata (e.g., pagination)
        if extra_meta:
            meta.update(extra_meta)
        
        # Build response in desired key order:
        # success, message, data, status_code, meta
        response_data = {
            "success": True,
            "message": message,
        }
        # Only include data key if data is not None
        if data is not None:
            response_data["data"] = data
        response_data["status_code"] = status_code
        response_data["meta"] = meta
        return Response(response_data, status=status_code)
    
    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        response_data = {
            "success": False,
            "message": message,
            "errors": errors or {},
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }
        return Response(response_data, status=status_code)
    
    def get_queryset(self):
        """Return only notifications for the current user"""
        return Notification.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NotificationListSerializer
        return NotificationSerializer
    
    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_as_read(self, request, pk=None):
        """Mark a notification as read"""
        try:
            notification = self.get_object()
            notification.mark_as_read()
            serializer = self.get_serializer(notification)
            return self._format_success_response(
                data=serializer.data,
                message='Notification marked as read',
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to mark notification as read",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_as_read(self, request):
        """Mark all notifications as read for the current user"""
        try:
            count = Notification.objects.filter(
                user=request.user,
                is_read=False
            ).update(
                is_read=True,
                read_at=timezone.now()
            )
            return self._format_success_response(
                data={'count': count},
                message=f'{count} notifications marked as read',
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to mark all notifications as read",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """Get count of unread notifications"""
        try:
            count = Notification.objects.filter(
                user=request.user,
                is_read=False
            ).count()
            return self._format_success_response(
                data={'unread_count': count},
                message='Unread count retrieved successfully',
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to get unread count",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def list(self, request, *args, **kwargs):
        """List notifications with optional filtering"""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            # Filter by read status
            is_read = request.query_params.get('is_read', None)
            if is_read is not None:
                is_read = is_read.lower() == 'true'
                queryset = queryset.filter(is_read=is_read)
            
            # Filter by type
            notification_type = request.query_params.get('type', None)
            if notification_type:
                queryset = queryset.filter(type=notification_type)
            
            serializer = self.get_serializer(queryset, many=True)
            return self._format_success_response(
                message='Notifications retrieved successfully',
                data=serializer.data,
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve notifications",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a single notification"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return self._format_success_response(
                data=serializer.data,
                message='Notification retrieved successfully',
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve notification",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, *args, **kwargs):
        """Delete a notification (manual delete)"""
        try:
            instance = self.get_object()
            notification_id = instance.id
            instance.delete()
            return self._format_success_response(
                data=None,
                message='Notification deleted successfully',
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to delete notification",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['delete'], url_path='delete-read')
    def delete_read(self, request):
        """Delete all read notifications for the current user"""
        try:
            count, _ = Notification.objects.filter(
                user=request.user,
                is_read=True
            ).delete()
            return self._format_success_response(
                data={'deleted_count': count},
                message=f'{count} read notification(s) deleted successfully',
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to delete read notifications",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DeviceRegistrationView(APIView):
    """
    API endpoint for registering/updating FCM device tokens.
    Mobile apps should call this after login to register the device token.
    """
    permission_classes = [IsAuthenticated]
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        response_data = {
            "success": True,
            "message": message,
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            },
            "data": data
        }
        return Response(response_data, status=status_code)
    
    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        response_data = {
            "success": False,
            "message": message,
            "errors": errors or {},
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }
        return Response(response_data, status=status_code)
    
    def post(self, request):
        """Register or update a device FCM token"""
        try:
            serializer = DeviceRegistrationSerializer(data=request.data)
            if not serializer.is_valid():
                return self._format_error_response(
                    message="Validation error",
                    errors=serializer.errors,
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            device = NotificationService.register_device(
                user=request.user,
                fcm_token=serializer.validated_data['fcm_token'],
                device_type=serializer.validated_data.get('device_type'),
                device_name=serializer.validated_data.get('device_name')
            )
            
            device_serializer = UserDeviceSerializer(device)
            return self._format_success_response(
                data=device_serializer.data,
                message="Device registered successfully",
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to register device",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request):
        """Unregister a device by FCM token"""
        try:
            fcm_token = request.data.get('fcm_token')
            if not fcm_token:
                return self._format_error_response(
                    message="Validation error",
                    errors={"fcm_token": "fcm_token is required"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Verify the token belongs to the current user
            from apps.notifications.models import UserDevice
            device = UserDevice.objects.filter(
                fcm_token=fcm_token,
                user=request.user
            ).first()
            
            if not device:
                return self._format_error_response(
                    message="Device not found",
                    errors={"detail": "Device token not found for this user"},
                    status_code=status.HTTP_404_NOT_FOUND
                )
            
            deleted = NotificationService.unregister_device(fcm_token)
            if deleted:
                return self._format_success_response(
                    data=None,
                    message="Device unregistered successfully",
                    status_code=status.HTTP_200_OK
                )
            else:
                return self._format_error_response(
                    message="Failed to unregister device",
                    errors={"detail": "Device could not be unregistered"},
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            return self._format_error_response(
                message="Failed to unregister device",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get(self, request):
        """Get all registered devices for the current user"""
        try:
            from apps.notifications.models import UserDevice
            devices = UserDevice.objects.filter(user=request.user)
            serializer = UserDeviceSerializer(devices, many=True)
            return self._format_success_response(
                data=serializer.data,
                message="Devices retrieved successfully",
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve devices",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )