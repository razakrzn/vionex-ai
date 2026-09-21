from django.contrib import admin
from .models import Ad, AdGallery


@admin.register(Ad)
class AdAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title',
        'brand_name',
        'verification_status',
        'published_at',
        'created_date',
    )
    list_filter = ('verification_status', 'billing_cycle', 'created_date')
    search_fields = ('title', 'brand_name', 'location', 'whatsapp_number')
    readonly_fields = ('published_at', 'created_date', 'updated_at')


@admin.register(AdGallery)
class AdGalleryAdmin(admin.ModelAdmin):
    list_display = ('id', 'ad', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('ad__title', 'ad__brand_name')
    readonly_fields = ('created_at',)
