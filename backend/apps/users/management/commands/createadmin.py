from django.core.management.base import BaseCommand
from django.core.exceptions import ValidationError
from apps.users.models import User
from apps.users.models import Role


class Command(BaseCommand):
    help = 'Creates an admin user'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='Admin email')
        parser.add_argument('--password', type=str, required=True, help='Admin password')
        parser.add_argument('--full-name', type=str, required=True, help='Full name')
        parser.add_argument('--mobile', type=str, required=True, help='Mobile number')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        full_name = options['full_name']
        mobile_number = options['mobile']

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.ERROR(f'User with email {email} already exists!'))
            return

        try:
            admin = User.objects.create_user(
                email=email,
                password=password,
                role_code='admin',
                full_name=full_name,
                mobile_number=mobile_number,
                is_active=True
            )

            self.stdout.write(self.style.SUCCESS(
                f'Successfully created admin user: {admin.email}'
            ))
            self.stdout.write(self.style.SUCCESS(
                f'User ID: {admin.id}, Role: {getattr(admin, "role_code", None)}'
            ))
        except ValidationError as e:
            self.stdout.write(self.style.ERROR(f'Validation error: {e}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating admin: {str(e)}'))




































