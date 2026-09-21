"""
Management command to populate countries from Google Places API or manual input.
Usage:
    python manage.py populate_countries --country-code AE --name "United Arab Emirates" --phone-code "+971"
    python manage.py populate_countries --all  # Populate common countries
"""
from django.core.management.base import BaseCommand
from apps.countries.models import Country
import googlemaps
import os


class Command(BaseCommand):
    help = 'Populate countries in the database from Google Places API or manual input'

    def add_arguments(self, parser):
        parser.add_argument(
            '--country-code',
            type=str,
            help='ISO 3166-1 alpha-2 country code (e.g., AE, IN, SA)',
        )
        parser.add_argument(
            '--name',
            type=str,
            help='Country name (e.g., United Arab Emirates)',
        )
        parser.add_argument(
            '--phone-code',
            type=str,
            help='Phone country code (e.g., +971)',
        )
        parser.add_argument(
            '--currency',
            type=str,
            default='AED',
            help='Currency code (default: AED)',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Populate common countries (UAE, India, Saudi Arabia, etc.)',
        )

    def handle(self, *args, **options):
        if options['all']:
            self.populate_common_countries()
        elif options['country_code']:
            self.create_country(
                code=options['country_code'],
                name=options.get('name'),
                phone_code=options.get('phone_code'),
                currency=options.get('currency', 'AED')
            )
        else:
            self.stdout.write(
                self.style.ERROR('Please provide --country-code and --name, or use --all to populate common countries')
            )

    def populate_common_countries(self):
        """Populate common countries used in the application"""
        common_countries = [
            {
                'code': 'AE',
                'name': 'United Arab Emirates',
                'phone_code': '+971',
                'currency': 'AED'
            },
            {
                'code': 'IN',
                'name': 'India',
                'phone_code': '+91',
                'currency': 'INR'
            },
            {
                'code': 'SA',
                'name': 'Saudi Arabia',
                'phone_code': '+966',
                'currency': 'SAR'
            },
            {
                'code': 'US',
                'name': 'United States',
                'phone_code': '+1',
                'currency': 'USD'
            },
            {
                'code': 'GB',
                'name': 'United Kingdom',
                'phone_code': '+44',
                'currency': 'GBP'
            },
            {
                'code': 'CA',
                'name': 'Canada',
                'phone_code': '+1',
                'currency': 'CAD'
            },
            {
                'code': 'AU',
                'name': 'Australia',
                'phone_code': '+61',
                'currency': 'AUD'
            },
        ]

        created_count = 0
        updated_count = 0

        for country_data in common_countries:
            country, created = Country.objects.update_or_create(
                code=country_data['code'],
                defaults={
                    'name': country_data['name'],
                    'phone_code': country_data['phone_code'],
                    'currency': country_data['currency']
                }
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created: {country.name} ({country.code})')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated: {country.name} ({country.code})')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted! Created: {created_count}, Updated: {updated_count}'
            )
        )

    def create_country(self, code, name=None, phone_code=None, currency='AED'):
        """Create a single country"""
        if not name:
            # Try to get name from Google Places API
            api_key = os.getenv('GOOGLE_PLACES_API_KEY')
            if api_key:
                try:
                    gmaps = googlemaps.Client(key=api_key)
                    # Use Geocoding API to get country details
                    result = gmaps.geocode(f"country:{code}")
                    if result:
                        name = result[0].get('formatted_address', '').split(',')[-1].strip()
                        self.stdout.write(
                            self.style.SUCCESS(f'Found country name from Google: {name}')
                        )
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'Could not fetch from Google Places: {str(e)}')
                    )

        if not name:
            self.stdout.write(
                self.style.ERROR('Country name is required. Please provide --name')
            )
            return

        country, created = Country.objects.update_or_create(
            code=code.upper(),
            defaults={
                'name': name,
                'phone_code': phone_code or '',
                'currency': currency
            }
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Created: {country.name} ({country.code})')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Updated: {country.name} ({country.code})')
            )
