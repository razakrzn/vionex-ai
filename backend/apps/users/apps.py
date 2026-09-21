from django.apps import AppConfig


class UsersConfig(AppConfig):
    name = "apps.users"
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        # Import signals so pre_delete (e.g. delete_user_files_from_storage) is registered
        from . import signals  # noqa: F401