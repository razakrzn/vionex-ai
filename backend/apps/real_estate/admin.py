from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import (
    AssetType, PropertyType, Purpose, FurnishingStatus,
    CompletionStatus, OccupantType, Amenity, Property, PropertyGallery, PropertyArchive, PropertyContact
)


@admin.register(AssetType)
class AssetTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(PropertyType)
class PropertyTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'asset_type', 'slug', 'created_at')
    list_filter = ('asset_type',)
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Purpose)
class PurposeAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(FurnishingStatus)
class FurnishingStatusAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(CompletionStatus)
class CompletionStatusAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(OccupantType)
class OccupantTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Property)
class PropertyAdmin(GISModelAdmin):
    """
    Admin interface for Property model with GIS support for location field
    """
    list_display = (
        'title', 'property_type', 'purpose', 'place',
        'price', 'currency', 'is_approved', 'owner', 'created_at'
    )
    list_filter = (
        'property_type__asset_type', 'purpose', 'furnishing_status',
        'completion_status', 'occupant_type', 'is_approved', 'currency'
    )
    search_fields = ('title', 'description', 'address', 'place', 'building_name', 'owner__email', 'owner__full_name')
    filter_horizontal = ('amenities',)
    readonly_fields = ('created_at', 'updated_at', 'views_count', 'price_per_sqft')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'owner')
        }),
        ('Property Classification', {
            'fields': ('property_type', 'purpose', 'furnishing_status', 'completion_status')
        }),
        ('Location', {
            'fields': ('address', 'place', 'building_name', 'floor_number', 'unit_number', 'location')
        }),
        ('Property Details', {
            'fields': ('bedrooms', 'bathrooms', 'area_sqm', 'occupant_type', 'occupants_count')
        }),
        ('Pricing', {
            'fields': ('price', 'currency', 'price_per_sqft', 'rent_period')
        }),
        ('Off-Plan Information', {
            'fields': ('handover_date', 'developer_name', 'project_name'),
            'classes': ('collapse',)
        }),
        ('Features & Media', {
            'fields': ('amenities', 'main_image')
        }),
        ('Status & Metadata', {
            'fields': ('is_approved', 'views_count', 'created_at', 'updated_at')
        }),
    )
    
    # Default map settings for location field
    default_lat = 25.2048  # Dubai coordinates
    default_lon = 55.2708
    default_zoom = 11


@admin.register(PropertyContact)
class PropertyContactAdmin(admin.ModelAdmin):
    """
    Admin interface for PropertyContact model
    """
    list_display = ('seeker', 'property', 'contact_method', 'created_at')
    list_filter = ('contact_method', 'created_at')
    search_fields = ('seeker__email', 'seeker__full_name', 'property__title')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Contact Information', {
            'fields': ('seeker', 'property', 'contact_method')
        }),
        ('Metadata', {
            'fields': ('created_at',)
        }),
    )


@admin.register(PropertyGallery)
class PropertyGalleryAdmin(admin.ModelAdmin):
    list_display = ('id', 'property', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('property__title',)
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'


@admin.register(PropertyArchive)
class PropertyArchiveAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "original_id",
        "title",
        "price",
        "currency",
        "listing_status",
        "deleted_at",
        "archived_at",
    )
    list_filter = ("currency", "listing_status", "archived_at")
    search_fields = ("title", "description", "address", "place", "project_name", "developer_name")
    readonly_fields = [field.name for field in PropertyArchive._meta.fields]
    date_hierarchy = "archived_at"
