from django.contrib import admin
from .models import Notification, UserDevice


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'type', 'title', 'is_read', 'created_at']
    list_filter = ['type', 'is_read', 'created_at']
    search_fields = ['user__email', 'title', 'message']
    readonly_fields = ['created_at', 'updated_at', 'read_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'type', 'title', 'message')
        }),
        ('Status', {
            'fields': ('is_read', 'read_at')
        }),
        ('Related Objects', {
            'fields': ('related_object_type', 'related_object_id', 'metadata'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UserDevice)
class UserDeviceAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'device_type', 'device_name', 'last_active', 'created_at']
    list_filter = ['device_type', 'created_at', 'last_active']
    search_fields = ['user__email', 'fcm_token', 'device_name']
    readonly_fields = ['created_at', 'last_active']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Device Information', {
            'fields': ('user', 'fcm_token', 'device_type', 'device_name')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'last_active'),
        }),
    )
