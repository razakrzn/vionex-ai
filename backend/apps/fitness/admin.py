from django.contrib import admin
from .models import GymType, Facility, Gym, GymImage, MembershipPackage


@admin.register(GymType)
class GymTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Gym)
class GymAdmin(admin.ModelAdmin):
    """
    Admin interface for Gym model
    """
    list_display = (
        'name', 'gym_type', 'owner',
        'is_approved', 'is_active', 'gender_allowed', 'created_at'
    )
    list_filter = (
        'gym_type', 'gender_allowed', 'is_approved', 'is_active',
        'is_24_hours', 'created_at'
    )
    search_fields = (
        'name', 'description', 'address', 'owner__email',
        'owner__full_name'
    )
    filter_horizontal = ('facilities',)
    readonly_fields = ('created_at', 'updated_at', 'views_count')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('owner', 'name', 'gym_type', 'description')
        }),
        ('Location', {
            'fields': ('address', 'latitude', 'longitude')
        }),
        ('Details', {
            'fields': ('facilities', 'opening_time', 'closing_time', 'is_24_hours', 'gender_allowed')
        }),
        ('Media', {
            'fields': ('main_image',)
        }),
        ('Social Media', {
            'fields': ('social_media',),
            'classes': ('collapse',)
        }),
        ('Status & Metadata', {
            'fields': ('is_approved', 'is_active', 'rejection_note', 'views_count', 'created_at', 'updated_at')
        }),
    )
    
    date_hierarchy = 'created_at'


@admin.register(GymImage)
class GymImageAdmin(admin.ModelAdmin):
    """
    Admin interface for GymImage model
    """
    list_display = ('gym', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('gym__name',)
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'


@admin.register(MembershipPackage)
class MembershipPackageAdmin(admin.ModelAdmin):
    """
    Admin interface for MembershipPackage model
    """
    list_display = ('gym', 'title', 'price', 'duration', 'created_at')
    list_filter = ('duration', 'created_at')
    search_fields = ('gym__name', 'title', 'description')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Package Information', {
            'fields': ('gym', 'title', 'price', 'duration', 'description')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )
