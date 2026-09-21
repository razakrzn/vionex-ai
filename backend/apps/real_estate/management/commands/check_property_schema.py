from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Check Property model database schema for mismatches'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Attempt to fix schema issues by removing orphaned columns',
        )

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Get all columns in the real_estate_property table
            cursor.execute("""
                SELECT column_name, data_type, character_maximum_length, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'real_estate_property'
                ORDER BY column_name;
            """)
            columns = cursor.fetchall()
            
            self.stdout.write(self.style.SUCCESS('\n=== Property Table Schema ===\n'))
            
            # Columns that should NOT exist (were removed in migrations)
            orphaned_columns = ['contact_name', 'contact_phone', 'contact_email', 
                               'is_active', 'is_featured', 'is_verified', 'area_sqft',
                               'latitude', 'longitude', 'city_id']
            
            # Columns with 100-char limit that might cause issues
            problematic_columns = []
            
            for col_name, data_type, max_length, is_nullable in columns:
                status = "✓"
                style = self.style.SUCCESS
                
                if col_name in orphaned_columns:
                    status = "⚠ ORPHANED"
                    style = self.style.WARNING
                    problematic_columns.append(col_name)
                elif max_length == 100:
                    # main_image should be TEXT, not VARCHAR(100) for Cloudinary URLs
                    if col_name == 'main_image':
                        status = "⚠ NEEDS FIX (should be TEXT)"
                        style = self.style.ERROR
                        problematic_columns.append(col_name)
                    else:
                        status = "⚠ 100-CHAR LIMIT"
                        style = self.style.WARNING
                        problematic_columns.append(col_name)
                
                self.stdout.write(style(
                    f"{status} {col_name:30} {data_type:20} "
                    f"max_length={max_length or 'N/A':10} nullable={is_nullable}"
                ))
            
            if problematic_columns:
                self.stdout.write(self.style.ERROR(
                    f'\n⚠ Found {len(problematic_columns)} potentially problematic columns:'
                ))
                for col in problematic_columns:
                    self.stdout.write(self.style.ERROR(f"  - {col}"))
                
                if options['fix']:
                    self.stdout.write(self.style.WARNING('\nAttempting to fix...'))
                    for col in problematic_columns:
                        if col in orphaned_columns:
                            try:
                                cursor.execute(f'ALTER TABLE real_estate_property DROP COLUMN IF EXISTS {col};')
                                self.stdout.write(self.style.SUCCESS(f"  ✓ Removed column: {col}"))
                            except Exception as e:
                                self.stdout.write(self.style.ERROR(f"  ✗ Failed to remove {col}: {e}"))
                        elif col == 'main_image':
                            try:
                                cursor.execute('ALTER TABLE real_estate_property ALTER COLUMN main_image TYPE TEXT;')
                                self.stdout.write(self.style.SUCCESS(f"  ✓ Fixed {col}: Changed to TEXT"))
                            except Exception as e:
                                self.stdout.write(self.style.ERROR(f"  ✗ Failed to fix {col}: {e}"))
                    connection.commit()
                    self.stdout.write(self.style.SUCCESS('\n✓ Schema fix completed!'))
                else:
                    if 'main_image' in problematic_columns:
                        self.stdout.write(self.style.ERROR(
                            '\n⚠ CRITICAL: main_image has 100-char limit but needs TEXT for Cloudinary URLs!'
                        ))
                        self.stdout.write(self.style.WARNING(
                            'Run: python manage.py migrate real_estate 0014'
                        ))
                        self.stdout.write(self.style.WARNING(
                            'Or: python manage.py check_property_schema --fix'
                        ))
                    else:
                        self.stdout.write(self.style.WARNING(
                            '\nTo fix these issues, run: python manage.py check_property_schema --fix'
                        ))
            else:
                self.stdout.write(self.style.SUCCESS('\n✓ No schema issues found!'))

