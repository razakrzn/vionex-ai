"""
Role assignment must be explicit in the creation path (serializers / UserManager),
not via post_save hooks, to avoid hard-to-debug overrides (e.g., defaulting users to
the wrong role when `custom_role` is set after the initial save).

pre_delete on User: delete profile_picture and document_uploads from storage (S3/Cloudinary)
when a user (owner, gym_owner, etc.) is deleted.
"""
import logging
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import User

logger = logging.getLogger(__name__)


@receiver(pre_delete, sender=User)
def delete_user_files_from_storage(sender, instance, **kwargs):
    """Delete profile_picture and document_uploads from storage when User is deleted."""
    if instance.profile_picture:
        try:
            instance.profile_picture.delete(save=False)
        except Exception as e:
            logger.error('Error deleting profile_picture for user %s: %s', instance.pk, e)
    if instance.document_uploads:
        try:
            instance.document_uploads.delete(save=False)
        except Exception as e:
            logger.error('Error deleting document_uploads for user %s: %s', instance.pk, e)
