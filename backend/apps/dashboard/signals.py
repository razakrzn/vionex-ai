from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from apps.dashboard.models import DashboardModule
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=DashboardModule)
def create_module_permissions(sender, instance, created, **kwargs):
    """
    Automatically create permissions for a module when it's created.
    Works for both parent and child modules.
    
    Creates: view_<module_id>, add_<module_id>, change_<module_id>, delete_<module_id>
    Each module (parent or child) gets its own independent permissions.
    """
    if created:
        try:
            # Get ContentType for DashboardModule model (this is the proper way)
            content_type = ContentType.objects.get_for_model(DashboardModule)
            
            # Normalize module ID for permission codename
            # Replace hyphens, spaces, and other special chars with underscores
            module_id = instance.id.lower().replace('-', '_').replace(' ', '_')
            
            # Define permission codenames based on module ID
            permissions_to_create = [
                {
                    'codename': f'view_{module_id}',
                    'name': f'Can view {instance.label}'
                },
                {
                    'codename': f'add_{module_id}',
                    'name': f'Can add {instance.label}'
                },
                {
                    'codename': f'change_{module_id}',
                    'name': f'Can change {instance.label}'
                },
                {
                    'codename': f'delete_{module_id}',
                    'name': f'Can delete {instance.label}'
                },
            ]
            
            created_permissions = []
            for perm_data in permissions_to_create:
                try:
                    permission, perm_created = Permission.objects.get_or_create(
                        codename=perm_data['codename'],
                        content_type=content_type,
                        defaults={'name': perm_data['name']}
                    )
                    if perm_created:
                        created_permissions.append(permission)
                    else:
                        logger.debug(f"Permission already exists: {permission.codename}")
                except Exception as e:
                    logger.error(f"Error creating permission {perm_data['codename']}: {str(e)}")
                    continue
            
            # Automatically assign created permissions to the module
            if created_permissions:
                # Use transaction to ensure atomicity
                with transaction.atomic():
                    instance.permissions.add(*created_permissions)
            else:
                logger.warning(f"No permissions were created for module {instance.id}")
                
        except Exception as e:
            logger.error(f"Error in create_module_permissions signal for module {instance.id}: {str(e)}", exc_info=True)


@receiver(pre_delete, sender=DashboardModule)
def delete_module_permissions(sender, instance, **kwargs):
    """
    Automatically delete permissions for a module when it's deleted.
    Deletes: view_<module_id>, add_<module_id>, change_<module_id>, delete_<module_id>
    """
    try:
        # Get ContentType for DashboardModule model
        content_type = ContentType.objects.get_for_model(DashboardModule)
        
        # Normalize module ID for permission codename (same as creation)
        module_id = instance.id.lower().replace('-', '_').replace(' ', '_')
        
        # Define permission codenames to delete
        permission_codenames = [
            f'view_{module_id}',
            f'add_{module_id}',
            f'change_{module_id}',
            f'delete_{module_id}',
        ]
        
        # Find and delete permissions
        deleted_count = 0
        for codename in permission_codenames:
            try:
                permission = Permission.objects.filter(
                    codename=codename,
                    content_type=content_type
                ).first()
                
                if permission:
                    permission.delete()
                    deleted_count += 1
            except Exception as e:
                logger.error(f"Error deleting permission {codename}: {str(e)}")
                continue
        
        if deleted_count > 0:
            logger.debug(f"Deleted {deleted_count} permissions for module {instance.id}")
        else:
            logger.debug(f"No permissions found to delete for module {instance.id}")
            
    except Exception as e:
        logger.error(f"Error in delete_module_permissions signal for module {instance.id}: {str(e)}", exc_info=True)
