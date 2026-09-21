from django.core.management.base import BaseCommand
from apps.users.models import User, get_or_create_system_role


class Command(BaseCommand):
    help = 'Fixes superusers that have incorrect roles - ensures all superusers have admin role'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without actually making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Get admin role
        admin_role = get_or_create_system_role('admin')
        
        # Find all superusers
        superusers = User.objects.filter(is_superuser=True)
        
        fixed_count = 0
        already_correct_count = 0
        
        self.stdout.write(f'Found {superusers.count()} superuser(s)')
        
        for user in superusers:
            current_role_code = user.role_code
            needs_fix = current_role_code != 'admin'
            
            if needs_fix:
                if dry_run:
                    self.stdout.write(
                        self.style.WARNING(
                            f'[DRY RUN] Would fix: {user.email} (ID: {user.id}) - '
                            f'Current role: {current_role_code}, Should be: admin'
                        )
                    )
                else:
                    user.custom_role = admin_role
                    user.save(update_fields=['custom_role'])
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Fixed: {user.email} (ID: {user.id}) - '
                            f'Changed role from {current_role_code} to admin'
                        )
                    )
                fixed_count += 1
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'OK: {user.email} (ID: {user.id}) - Already has admin role'
                    )
                )
                already_correct_count += 1
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'\n[DRY RUN] Would fix {fixed_count} superuser(s), '
                    f'{already_correct_count} already correct'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nFixed {fixed_count} superuser(s), '
                    f'{already_correct_count} already correct'
                )
            )
