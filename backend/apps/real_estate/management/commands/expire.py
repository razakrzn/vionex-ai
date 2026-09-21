from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.real_estate.models import Property
from apps.fitness.models import Gym
from apps.notifications.services import NotificationService
from apps.notifications.models import NotificationType


class Command(BaseCommand):
    help = 'Deactivate expired listings (properties and gyms) that have expired (expires_at < now)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be expired without actually deactivating listings',
        )

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Find all active properties that have expired
        expired_properties = Property.objects.filter(
            is_active=True,
            expires_at__lt=now,
            is_deleted=False
        )
        
        # Find all active gyms that have expired
        expired_gyms = Gym.objects.filter(
            is_active=True,
            expires_at__lt=now
        )
        
        property_count = expired_properties.count()
        gym_count = expired_gyms.count()
        total_count = property_count + gym_count
        
        if total_count == 0:
            self.stdout.write(self.style.SUCCESS('No expired listings found.'))
            return
        
        if options['dry_run']:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would deactivate {property_count} expired property/properties and {gym_count} expired gym/gyms:'
                )
            )
            if property_count > 0:
                self.stdout.write('  Properties:')
                for prop in expired_properties[:10]:  # Show first 10
                    self.stdout.write(f'    - Property #{prop.id}: {prop.title} (expired: {prop.expires_at})')
                if property_count > 10:
                    self.stdout.write(f'    ... and {property_count - 10} more')
            if gym_count > 0:
                self.stdout.write('  Gyms:')
                for gym in expired_gyms[:10]:  # Show first 10
                    self.stdout.write(f'    - Gym #{gym.id}: {gym.name} (expired: {gym.expires_at})')
                if gym_count > 10:
                    self.stdout.write(f'    ... and {gym_count - 10} more')
            return
        
        # Deactivate expired properties
        property_deactivated_count = 0
        for property_obj in expired_properties:
            property_obj.is_active = False
            property_obj.save(update_fields=['is_active'])
            property_deactivated_count += 1
            
            # Create notification for property owner using hybrid DB + FCM approach
            try:
                metadata = {
                    'property_id': property_obj.id,
                    'property_title': property_obj.title,
                }
                if property_obj.expires_at:
                    metadata['expires_at'] = property_obj.expires_at.isoformat()
                
                NotificationService.send_notification(
                    user=property_obj.owner,
                    type=NotificationType.PROPERTY_EXPIRED,
                    title='Property Expired',
                    message=f'Your property "{property_obj.title}" has expired and is no longer visible to users. Please renew or create a new listing.',
                    metadata=metadata,
                    related_object_type='property',
                    related_object_id=property_obj.id
                )
            except Exception as e:
                # Don't fail if notification creation fails
                self.stdout.write(
                    self.style.WARNING(
                        f'Warning: Failed to create notification for property {property_obj.id}: {str(e)}'
                    )
                )
        
        # Deactivate expired gyms
        gym_deactivated_count = 0
        for gym_obj in expired_gyms:
            gym_obj.is_active = False
            gym_obj.save(update_fields=['is_active'])
            gym_deactivated_count += 1
            
            # Create notification for gym owner using hybrid DB + FCM approach
            try:
                metadata = {
                    'gym_id': gym_obj.id,
                    'gym_name': gym_obj.name,
                }
                if gym_obj.expires_at:
                    metadata['expires_at'] = gym_obj.expires_at.isoformat()
                
                NotificationService.send_notification(
                    user=gym_obj.owner,
                    type=NotificationType.GYM_EXPIRED,
                    title='Gym Expired',
                    message=f'Your gym "{gym_obj.name}" has expired and is no longer visible to users. Please renew or create a new listing.',
                    metadata=metadata,
                    related_object_type='gym',
                    related_object_id=gym_obj.id
                )
            except Exception as e:
                # Don't fail if notification creation fails
                self.stdout.write(
                    self.style.WARNING(
                        f'Warning: Failed to create notification for gym {gym_obj.id}: {str(e)}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully deactivated {property_deactivated_count} expired property/properties and {gym_deactivated_count} expired gym/gyms.'
            )
        )
