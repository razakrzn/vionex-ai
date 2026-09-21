from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.real_estate.models import Property, PropertyArchive
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Permanently delete properties that have been soft-deleted for more than 30 days'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days after soft deletion to permanently delete (default: 30)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        # Calculate the cutoff date
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Find properties that have been soft-deleted for more than the specified days
        old_deleted_properties = Property.objects.filter(
            is_deleted=True,
            deleted_at__lte=cutoff_date
        )
        
        count = old_deleted_properties.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'No properties found that have been deleted for more than {days} days.'
                )
            )
            return
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would permanently delete {count} property/properties:'
                )
            )
            for prop in old_deleted_properties[:10]:  # Show first 10
                self.stdout.write(f'  - Property ID {prop.id}: {prop.title} (deleted on {prop.deleted_at})')
            if count > 10:
                self.stdout.write(f'  ... and {count - 10} more')
            return
        
        # Log before deletion
        property_ids = list(old_deleted_properties.values_list('id', flat=True))
        
        # Archive and delete properties one by one
        # This ensures proper signal handling for image deletion
        archived_count = 0
        deleted_count = 0
        
        for property_obj in old_deleted_properties:
            try:
                # Step 1: Archive the property (copy to PropertyArchive table)
                archive = PropertyArchive.archive_property(property_obj)
                archived_count += 1
                
                # Step 2: Delete gallery images first (signals will handle Cloudinary deletion)
                gallery_images = property_obj.gallery_images.all()
                for gallery_image in gallery_images:
                    gallery_image.delete()  # This triggers pre_delete signal to delete from Cloudinary
                
                # Step 3: Delete main image (if exists) - signal will handle Cloudinary deletion
                if property_obj.main_image:
                    # The pre_delete signal will handle Cloudinary deletion
                    # We need to delete the property which will trigger the signal
                    pass
                
                # Step 4: Permanently delete the property
                # This will trigger pre_delete signal for main_image if it exists
                property_obj.delete()
                deleted_count += 1
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Archived and deleted property ID {property_obj.id}: {property_obj.title}'
                    )
                )
            except Exception as e:
                logger.error(f'Error archiving/deleting property ID {property_obj.id}: {str(e)}')
                self.stdout.write(
                    self.style.ERROR(
                        f'✗ Failed to archive/delete property ID {property_obj.id}: {str(e)}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully archived {archived_count} and permanently deleted {deleted_count} property/properties.'
            )
        )
        
        if archived_count != deleted_count:
            self.stdout.write(
                self.style.WARNING(
                    f'Warning: Archive count ({archived_count}) does not match delete count ({deleted_count})'
                )
            )
