"""
Management command to reset the database by dropping all tables and running fresh migrations.

WARNING: This will delete ALL data in the database!

Usage:
    python manage.py reset_database --confirm
    python manage.py reset_database --confirm --run-migrations
    python manage.py reset_database --confirm --no-migrations  # Just drop tables, don't run migrations
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection
from django.conf import settings


class Command(BaseCommand):
    help = 'Reset database by dropping all tables and optionally running fresh migrations (WARNING: Deletes all data!)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm that you want to delete all data (required)',
        )
        parser.add_argument(
            '--run-migrations',
            action='store_true',
            default=True,
            help='Run migrations after resetting (default: True)',
        )
        parser.add_argument(
            '--no-migrations',
            action='store_true',
            help='Skip running migrations after reset (just drop tables)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Require confirmation unless it's a dry run
        if not options['confirm'] and not dry_run:
            self.stdout.write(
                self.style.ERROR(
                    '\n' + '='*70 + '\n'
                    'WARNING: This will delete ALL data in the database!\n'
                    'Run with --confirm to proceed.\n'
                    '='*70 + '\n'
                )
            )
            return

        if options['no_migrations']:
            options['run_migrations'] = False

        run_migrations = options['run_migrations'] and not dry_run

        # Detect database engine
        engine = settings.DATABASES['default']['ENGINE']
        is_postgres = 'postgresql' in engine or 'postgis' in engine
        is_mysql = 'mysql' in engine
        is_sqlite = 'sqlite' in engine

        self.stdout.write(self.style.WARNING('\n=== Database Reset Command ===\n'))
        self.stdout.write(f'Database Engine: {engine}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE: No changes will be made\n'))

        try:
            with connection.cursor() as cursor:
                if is_postgres:
                    # PostgreSQL/PostGIS
                    if dry_run:
                        # Get list of tables that would be dropped
                        cursor.execute("""
                            SELECT tablename 
                            FROM pg_tables 
                            WHERE schemaname = 'public'
                            AND tablename NOT LIKE 'pg_%'
                            AND tablename NOT LIKE 'sql_%'
                            AND tablename NOT IN ('spatial_ref_sys', 'geometry_columns')
                            ORDER BY tablename;
                        """)
                        tables = [row[0] for row in cursor.fetchall()]
                        self.stdout.write(f'Would drop {len(tables)} tables:')
                        for table in tables:
                            self.stdout.write(f'  - {table}')
                    else:
                        # Get all table names
                        cursor.execute("""
                            SELECT tablename 
                            FROM pg_tables 
                            WHERE schemaname = 'public'
                            AND tablename NOT LIKE 'pg_%'
                            AND tablename NOT LIKE 'sql_%'
                            ORDER BY tablename;
                        """)
                        tables = [row[0] for row in cursor.fetchall()]
                        
                        if tables:
                            self.stdout.write(f'Dropping {len(tables)} tables...')
                            # Drop all tables in a single operation using DO block
                            # This is more reliable than dropping one by one
                            table_list = ', '.join([f'"{table}"' for table in tables])
                            try:
                                cursor.execute(f"""
                                    DO $$ 
                                    DECLARE 
                                        r RECORD;
                                    BEGIN
                                        FOR r IN (
                                            SELECT tablename 
                                            FROM pg_tables 
                                            WHERE schemaname = 'public' 
                                            AND tablename NOT LIKE 'pg_%' 
                                            AND tablename NOT LIKE 'sql_%'
                                            AND tablename NOT IN ('spatial_ref_sys', 'geometry_columns')
                                        ) 
                                        LOOP
                                            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                                        END LOOP;
                                    END $$;
                                """)
                                self.stdout.write(self.style.SUCCESS(f'✓ Dropped {len(tables)} tables'))
                            except Exception as e:
                                # Fallback: drop tables one by one
                                self.stdout.write(self.style.WARNING(f'Bulk drop failed, trying individual drops: {str(e)}'))
                                for table in tables:
                                    try:
                                        cursor.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE;')
                                    except Exception as e2:
                                        self.stdout.write(
                                            self.style.ERROR(f'Error dropping table {table}: {str(e2)}')
                                        )
                                self.stdout.write(self.style.SUCCESS(f'✓ Attempted to drop {len(tables)} tables'))
                        else:
                            self.stdout.write(self.style.WARNING('No tables found to drop'))
                        
                        # Try to drop and recreate schema (requires superuser, will fail gracefully if not)
                        try:
                            self.stdout.write('Attempting to reset public schema...')
                            cursor.execute('DROP SCHEMA IF EXISTS public CASCADE;')
                            cursor.execute('CREATE SCHEMA public;')
                            cursor.execute('GRANT ALL ON SCHEMA public TO postgres;')
                            cursor.execute('GRANT ALL ON SCHEMA public TO public;')
                            self.stdout.write(self.style.SUCCESS('✓ Schema reset complete'))
                        except Exception as e:
                            # Schema reset requires superuser - that's OK, tables are already dropped
                            self.stdout.write(
                                self.style.WARNING(f'Note: Schema reset skipped (requires superuser): {str(e)}')
                            )
                            self.stdout.write(self.style.SUCCESS('✓ All tables dropped successfully'))
                
                elif is_mysql:
                    # MySQL
                    if dry_run:
                        cursor.execute("SHOW TABLES;")
                        tables = [row[0] for row in cursor.fetchall()]
                        self.stdout.write(f'Would drop {len(tables)} tables:')
                        for table in tables:
                            self.stdout.write(f'  - {table}')
                    else:
                        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
                        cursor.execute("SHOW TABLES;")
                        tables = [row[0] for row in cursor.fetchall()]
                        
                        if tables:
                            self.stdout.write(f'Dropping {len(tables)} tables...')
                            for table in tables:
                                cursor.execute(f'DROP TABLE IF EXISTS `{table}`;')
                            self.stdout.write(self.style.SUCCESS(f'✓ Dropped {len(tables)} tables'))
                        
                        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
                
                elif is_sqlite:
                    # SQLite
                    if dry_run:
                        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
                        tables = [row[0] for row in cursor.fetchall()]
                        self.stdout.write(f'Would drop {len(tables)} tables:')
                        for table in tables:
                            self.stdout.write(f'  - {table}')
                    else:
                        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
                        tables = [row[0] for row in cursor.fetchall()]
                        
                        if tables:
                            self.stdout.write(f'Dropping {len(tables)} tables...')
                            for table in tables:
                                cursor.execute(f'DROP TABLE IF EXISTS "{table}";')
                            self.stdout.write(self.style.SUCCESS(f'✓ Dropped {len(tables)} tables'))
                else:
                    self.stdout.write(
                        self.style.ERROR(f'Unsupported database engine: {engine}')
                    )
                    return

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error resetting database: {str(e)}')
            )
            raise

        if not dry_run:
            self.stdout.write(self.style.SUCCESS('\n✓ Database cleared successfully!'))
            
            if run_migrations:
                self.stdout.write(self.style.WARNING('\nRunning fresh migrations...'))
                try:
                    call_command('migrate', verbosity=1, interactive=False)
                    self.stdout.write(self.style.SUCCESS('\n✓ Migrations completed successfully!'))
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'\n✗ Error running migrations: {str(e)}')
                    )
                    raise
            else:
                self.stdout.write(
                    self.style.WARNING('\nSkipped running migrations. Run "python manage.py migrate" manually.')
                )
            
            self.stdout.write(
                self.style.SUCCESS('\n' + '='*70 + '\n')
                + self.style.SUCCESS('Database reset complete!')
                + self.style.SUCCESS('\n' + '='*70)
            )
        else:
            self.stdout.write(
                self.style.WARNING('\nDRY RUN: No changes were made.')
            )
