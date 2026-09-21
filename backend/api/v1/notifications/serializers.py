from rest_framework import serializers
from apps.notifications.models import Notification, UserDevice


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'type',
            'title',
            'message',
            'is_read',
            'read_at',
            'related_object_type',
            'related_object_id',
            'metadata',
            'created_at',
        ]
        read_only_fields = ['created_at', 'read_at']


class NotificationListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list view"""
    class Meta:
        model = Notification
        fields = [
            'id',
            'type',
            'title',
            'message',
            'is_read',
            'created_at',
        ]


class DeviceRegistrationSerializer(serializers.Serializer):
    """Serializer for FCM device token registration"""
    fcm_token = serializers.CharField(
        required=True,
        max_length=255,
        help_text="Firebase Cloud Messaging token"
    )
    device_type = serializers.ChoiceField(
        choices=[('ios', 'iOS'), ('android', 'Android'), ('web', 'Web')],
        required=False,
        allow_null=True,
        help_text="Type of device (ios, android, web)"
    )
    device_name = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        max_length=255,
        help_text="Optional device name/identifier"
    )


class UserDeviceSerializer(serializers.ModelSerializer):
    """Serializer for UserDevice model"""
    class Meta:
        model = UserDevice
        fields = [
            'id',
            'fcm_token',
            'device_type',
            'device_name',
            'last_active',
            'created_at',
        ]
        read_only_fields = ['id', 'last_active', 'created_at']
