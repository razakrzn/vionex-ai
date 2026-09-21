from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.notifications.models import Notification


class Command(BaseCommand):
    help = 'Delete read notifications older than specified days (default: 30 days)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to keep read notifications (default: 30)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        # Calculate cutoff date
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Find notifications to delete
        notifications_to_delete = Notification.objects.filter(
            is_read=True,
            read_at__lt=cutoff_date
        )
        
        count = notifications_to_delete.count()
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would delete {count} read notification(s) older than {days} days'
                )
            )
            if count > 0:
                self.stdout.write(
                    self.style.WARNING(
                        f'Oldest notification to be deleted: {notifications_to_delete.order_by("read_at").first().read_at}'
                    )
                )
        else:
            if count == 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'No read notifications older than {days} days to delete'
                    )
                )
            else:
                deleted_count, _ = notifications_to_delete.delete()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully deleted {deleted_count} read notification(s) older than {days} days'
                    )
                )
