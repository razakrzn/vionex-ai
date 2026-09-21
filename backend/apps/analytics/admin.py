from django.contrib import admin
from .models import UserVisit


@admin.register(UserVisit)
class UserVisitAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'ip_address', 'device', 'city', 'country')
    list_filter = ('timestamp', 'device', 'country', 'user__is_staff')
    search_fields = ('ip_address', 'user__email', 'device', 'city', 'country', 'user_agent')
    readonly_fields = ('timestamp', 'user', 'ip_address', 'session_key', 'user_agent', 'device', 'city', 'country', 'latitude', 'longitude')

    def has_add_permission(self, request):
        return False
