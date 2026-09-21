from django.contrib import admin
from .models import Country


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    """
    Admin configuration for Country model.
    """
    list_display = ('name', 'code', 'phone_code', 'currency')
    list_filter = ('currency',)
    search_fields = ('name', 'code', 'phone_code')
    ordering = ('name',)
