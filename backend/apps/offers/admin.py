from django.contrib import admin
from .models import Offer


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'custom_role',
        'price_per_listing',
        'validity_months',
        'cashback',
        'created_at',
        'updated_at',
    )
    list_filter = ('custom_role', 'created_at', 'updated_at')
    search_fields = ('price_per_listing', 'custom_role__name', 'custom_role__code')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
