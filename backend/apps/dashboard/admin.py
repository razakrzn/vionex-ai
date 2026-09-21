from django.contrib import admin
from .models import DashboardModule


@admin.register(DashboardModule)
class DashboardModuleAdmin(admin.ModelAdmin):
    """
    Admin interface for DashboardModule model.
    """
    list_display = (
        'id', 'name', 'label', 'parent', 'order', 'is_active', 
        'permissions_count', 'children_count', 'created_at'
    )
    list_filter = ('is_active', 'parent', 'created_at')
    search_fields = ('id', 'name', 'label', 'path')
    filter_horizontal = ('permissions',)
    readonly_fields = ('created_at', 'updated_at', 'permissions_count', 'children_count')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'label', 'icon', 'path')
        }),
        ('Hierarchy', {
            'fields': ('parent', 'order')
        }),
        ('Permissions', {
            'fields': ('permissions',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('permissions_count', 'children_count', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def permissions_count(self, obj):
        """Display number of permissions"""
        return obj.permissions.count()
    permissions_count.short_description = 'Permissions'
    
    def children_count(self, obj):
        """Display number of children"""
        return obj.children.count()
    children_count.short_description = 'Children'
