"""
Management command to fix migration history after renaming app from 'locations' to 'countries'.
This updates the django_migrations table to reflect the app name change.
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Fix migration history after renaming locations app to countries'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        with connection.cursor() as cursor:
            # Check for existing 'locations' entries
            cursor.execute("""
                SELECT app, name 
                FROM django_migrations 
                WHERE app = 'locations'
                ORDER BY app, name;
            """)
            locations_migrations = cursor.fetchall()
            
            if not locations_migrations:
                self.stdout.write(
                    self.style.SUCCESS('No "locations" migrations found. Migration history is already correct.')
                )
                return
            
            self.stdout.write(
                self.style.WARNING(f'Found {len(locations_migrations)} migration(s) with app="locations":')
            )
            for app, name in locations_migrations:
                self.stdout.write(f'  - {app}.{name}')
            
            # Check for existing 'countries' entries
            cursor.execute("""
                SELECT app, name 
                FROM django_migrations 
                WHERE app = 'countries'
                ORDER BY app, name;
            """)
            countries_migrations = cursor.fetchall()
            
            if countries_migrations:
                self.stdout.write(
                    self.style.WARNING(f'\nFound {len(countries_migrations)} migration(s) with app="countries":')
                )
                for app, name in countries_migrations:
                    self.stdout.write(f'  - {app}.{name}')
            
            if dry_run:
                self.stdout.write(
                    self.style.WARNING('\nDRY RUN: Would update django_migrations table...')
                )
                self.stdout.write('  UPDATE django_migrations SET app = \'countries\' WHERE app = \'locations\';')
            else:
                # Update all 'locations' entries to 'countries'
                cursor.execute("""
                    UPDATE django_migrations 
                    SET app = 'countries' 
                    WHERE app = 'locations';
                """)
                
                updated_count = cursor.rowcount
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\nSuccessfully updated {updated_count} migration record(s) from "locations" to "countries".'
                    )
                )
                
                # Verify the update
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM django_migrations 
                    WHERE app = 'locations';
                """)
                remaining = cursor.fetchone()[0]
                
                if remaining == 0:
                    self.stdout.write(
                        self.style.SUCCESS('Migration history has been successfully fixed!')
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f'Warning: {remaining} "locations" entries still remain.')
                    )
