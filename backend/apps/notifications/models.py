from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class NotificationType(models.TextChoices):
    VERIFICATION_APPROVED = 'VERIFICATION_APPROVED', 'Verification Approved'
    VERIFICATION_REJECTED = 'VERIFICATION_REJECTED', 'Verification Rejected'
    VERIFICATION_PENDING = 'VERIFICATION_PENDING', 'Verification Pending'
    PAYMENT_SUCCESS = 'PAYMENT_SUCCESS', 'Payment Successful'
    PAYMENT_FAILED = 'PAYMENT_FAILED', 'Payment Failed'
    PROPERTY_APPROVED = 'PROPERTY_APPROVED', 'Property Approved'
    PROPERTY_REJECTED = 'PROPERTY_REJECTED', 'Property Rejected'
    PROPERTY_EXPIRED = 'PROPERTY_EXPIRED', 'Property Expired'
    PROPERTY_SOLD = 'PROPERTY_SOLD', 'Property Sold'
    GYM_APPROVED = 'GYM_APPROVED', 'Gym Approved'
    GYM_REJECTED = 'GYM_REJECTED', 'Gym Rejected'
    GYM_EXPIRED = 'GYM_EXPIRED', 'Gym Expired'
    # Admin-facing events
    NEW_OWNER_REGISTERED = 'NEW_OWNER_REGISTERED', 'New Owner Registered'
    NEW_GYM_OWNER_REGISTERED = 'NEW_GYM_OWNER_REGISTERED', 'New Gym Owner Registered'
    NEW_PROPERTY_CREATED = 'NEW_PROPERTY_CREATED', 'New Property Created'
    NEW_GYM_CREATED = 'NEW_GYM_CREATED', 'New Gym Created'


class Notification(models.Model):
    """
    In-app notification model for user notifications
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    type = models.CharField(
        max_length=50,
        choices=NotificationType.choices
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    # Optional: Link to related object (e.g., property, payment)
    related_object_type = models.CharField(max_length=50, null=True, blank=True)
    related_object_id = models.IntegerField(null=True, blank=True)
    # Metadata for additional data
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.title}"

    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])

    @classmethod
    def create_verification_notification(cls, user, action, rejection_note=None):
        """Helper method to create verification notifications"""
        type_mapping = {
            'approve': NotificationType.VERIFICATION_APPROVED,
            'reject': NotificationType.VERIFICATION_REJECTED,
            'pending': NotificationType.VERIFICATION_PENDING,
        }
        
        title_mapping = {
            'approve': 'Account Approved - Welcome to Vionex!',
            'reject': 'Account Verification Rejected',
            'pending': 'Account Verification Pending',
        }
        
        message_mapping = {
            'approve': 'Congratulations! Your account has been approved and verified. You can now access all features of Vionex.',
            'reject': f'Your account verification has been rejected.{" Reason: " + rejection_note if rejection_note else ""}',
            'pending': 'Your account verification status has been set to pending. Our team is reviewing your account.',
        }
        
        notification_type = type_mapping.get(action)
        if not notification_type:
            return None
        
        metadata = {}
        if rejection_note:
            metadata['rejection_note'] = rejection_note
        
        return cls.objects.create(
            user=user,
            type=notification_type,
            title=title_mapping[action],
            message=message_mapping[action],
            metadata=metadata
        )

    @classmethod
    def create_property_notification(cls, property_obj, action, rejection_note=None):
        """Helper method to create property verification notifications"""
        type_mapping = {
            'approve': NotificationType.PROPERTY_APPROVED,
            'reject': NotificationType.PROPERTY_REJECTED,
            'expired': NotificationType.PROPERTY_EXPIRED,
        }
        
        title_mapping = {
            'approve': 'Property Approved',
            'reject': 'Property Rejected',
            'expired': 'Property Expired',
        }
        
        message_mapping = {
            'approve': f'Your property "{property_obj.title}" has been approved and is now visible to all users.',
            'reject': f'Your property "{property_obj.title}" has been rejected.{" Reason: " + rejection_note if rejection_note else " Please review the property details and try again."}',
            'expired': f'Your property "{property_obj.title}" has expired and is no longer visible to users. Please renew or create a new listing.',
        }
        
        notification_type = type_mapping.get(action)
        if not notification_type:
            return None
        
        metadata = {
            'property_id': property_obj.id,
            'property_title': property_obj.title,
        }
        if rejection_note:
            metadata['rejection_note'] = rejection_note
        if action == 'expired' and property_obj.expires_at:
            metadata['expires_at'] = property_obj.expires_at.isoformat()
        
        return cls.objects.create(
            user=property_obj.owner,
            type=notification_type,
            title=title_mapping[action],
            message=message_mapping[action],
            related_object_type='property',
            related_object_id=property_obj.id,
            metadata=metadata
        )

    @classmethod
    def create_gym_notification(cls, gym_obj, action, rejection_note=None):
        """Helper method to create gym approval/rejection/expiration notifications"""
        type_mapping = {
            'approve': NotificationType.GYM_APPROVED,
            'reject': NotificationType.GYM_REJECTED,
            'expired': NotificationType.GYM_EXPIRED,
        }
        
        title_mapping = {
            'approve': 'Gym Approved',
            'reject': 'Gym Rejected',
            'expired': 'Gym Expired',
        }
        
        message_mapping = {
            'approve': f'Your gym "{gym_obj.name}" has been approved and is now visible to all users.',
            'reject': f'Your gym "{gym_obj.name}" has been rejected.{" Reason: " + rejection_note if rejection_note else " Please review the gym details and try again."}',
            'expired': f'Your gym "{gym_obj.name}" has expired and is no longer visible to users. Please renew or create a new listing.',
        }
        
        notification_type = type_mapping.get(action)
        if not notification_type:
            return None
        
        metadata = {
            'gym_id': gym_obj.id,
            'gym_name': gym_obj.name,
        }
        if rejection_note:
            metadata['rejection_note'] = rejection_note
        if action == 'expired' and gym_obj.expires_at:
            metadata['expires_at'] = gym_obj.expires_at.isoformat()
        
        return cls.objects.create(
            user=gym_obj.owner,
            type=notification_type,
            title=title_mapping[action],
            message=message_mapping[action],
            related_object_type='gym',
            related_object_id=gym_obj.id,
            metadata=metadata
        )


class UserDevice(models.Model):
    """
    Model to store FCM device tokens for push notifications.
    A user can have multiple devices (phone, tablet, etc.)
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='devices'
    )
    fcm_token = models.CharField(
        max_length=255,
        unique=True,
        help_text="Firebase Cloud Messaging token for the device"
    )
    device_type = models.CharField(
        max_length=20,
        choices=[('ios', 'iOS'), ('android', 'Android'), ('web', 'Web')],
        null=True,
        blank=True,
        help_text="Type of device"
    )
    device_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Optional device name/identifier"
    )
    last_active = models.DateTimeField(
        auto_now=True,
        help_text="Last time this device was active"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-last_active']
        indexes = [
            models.Index(fields=['user', 'fcm_token']),
            models.Index(fields=['fcm_token']),
        ]
        verbose_name = 'User Device'
        verbose_name_plural = 'User Devices'

    def __str__(self):
        return f"{self.user.email} - {self.device_type or 'Unknown'} Device"
