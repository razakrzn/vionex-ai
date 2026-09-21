from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Permission
from django.utils import timezone
from django.contrib import messages
from django.db import models
from .models import User, Role, EmailVerificationOTP, PasswordResetToken


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom admin configuration for User model.
    """
    list_display = ('email', 'full_name', 'mobile_number', 'custom_role', 'seller_type', 'country', 'state', 'city', 'is_staff', 'verification_status', 'is_suspended', 'date_joined')
    list_filter = ('custom_role', 'seller_type', 'country', 'is_staff', 'verification_status', 'is_superuser', 'is_mobile_verified', 'is_suspended', 'date_joined')
    search_fields = ('email', 'full_name', 'mobile_number', 'company_name', 'address', 'emirates_id_number', 'country__name', 'state', 'city')
    ordering = ('-date_joined',)
    readonly_fields = ('date_joined', 'last_login', 'suspended_at')
    actions = ['suspend_users', 'activate_users']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('full_name', 'mobile_number', 'address', 'country', 'state', 'city', 'profile_picture')}),
        ('Role & Type', {'fields': ('custom_role', 'seller_type', 'company_name', 'license_number', 'emirates_id_number')}),
        ('Additional Info', {'fields': ('about_me', 'is_mobile_verified', 'document_uploads')}),
        ('Account Status', {'fields': ('verification_status', 'rejection_note', 'is_suspended', 'suspension_reason', 'suspended_at')}),
        ('Permissions', {'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'full_name', 'mobile_number', 'custom_role', 'seller_type', 'company_name', 'license_number'),
        }),
    )
    
    filter_horizontal = ('groups', 'user_permissions',)
    
    def suspend_users(self, request, queryset):
        """
        Admin action to suspend selected users.
        """
        # Prevent suspending admin accounts
        admin_users = queryset.filter(
            models.Q(is_superuser=True) | 
            models.Q(is_staff=True) | 
            models.Q(custom_role__code='admin')
        )
        
        if admin_users.exists():
            self.message_user(
                request,
                f"Cannot suspend {admin_users.count()} admin user(s). Admins cannot be suspended.",
                messages.WARNING
            )
            queryset = queryset.exclude(
                models.Q(is_superuser=True) | 
                models.Q(is_staff=True) | 
                models.Q(custom_role__code='admin')
            )
        
        if not queryset.exists():
            self.message_user(request, "No users were suspended.", messages.WARNING)
            return
        
        suspended_count = queryset.update(
            is_suspended=True,
            suspended_at=timezone.now()
        )
        self.message_user(
            request,
            f"Successfully suspended {suspended_count} user(s).",
            messages.SUCCESS
        )
    suspend_users.short_description = "Suspend selected users"
    
    def activate_users(self, request, queryset):
        """
        Admin action to activate (unsuspend) selected users.
        """
        activated_count = queryset.update(
            is_suspended=False,
            suspension_reason=None,
            suspended_at=None
        )
        self.message_user(
            request,
            f"Successfully activated {activated_count} user(s).",
            messages.SUCCESS
        )
    activate_users.short_description = "Activate (unsuspend) selected users"
    
    def save_model(self, request, obj, form, change):
        """
        Override save to handle suspension timestamp.
        """
        # If is_suspended is being set to True and suspended_at is not set, set it now
        if obj.is_suspended and not obj.suspended_at:
            obj.suspended_at = timezone.now()
        # If is_suspended is being set to False, clear suspension fields
        elif not obj.is_suspended:
            obj.suspension_reason = None
            obj.suspended_at = None
        
        super().save_model(request, obj, form, change)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """
    Admin configuration for Role model.
    """
    list_display = ('name', 'is_active', 'permissions_count', 'users_count', 'created_at', 'created_by')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    ordering = ('name',)
    readonly_fields = ('created_at', 'updated_at', 'created_by')
    filter_horizontal = ('permissions',)
    
    fieldsets = (
        (None, {'fields': ('name', 'description', 'is_active')}),
        ('Permissions', {'fields': ('permissions',)}),
        ('Metadata', {'fields': ('created_at', 'updated_at', 'created_by')}),
    )
    
    def permissions_count(self, obj):
        """Display the number of permissions assigned to this role"""
        return obj.permissions.count()
    permissions_count.short_description = 'Permissions'
    
    def users_count(self, obj):
        """Display the number of users with this role"""
        return obj.users.count()
    users_count.short_description = 'Users'
    
    def save_model(self, request, obj, form, change):
        """Set created_by to the current user if creating a new role"""
        if not change:  # If creating a new role
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(EmailVerificationOTP)
class EmailVerificationOTPAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'code', 'created_at', 'expires_at', 'verified_at', 'attempts')
    list_filter = ('created_at', 'expires_at', 'verified_at')
    search_fields = ('user__email', 'code', 'ip_address')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'token', 'created_at', 'expires_at', 'used_at')
    list_filter = ('created_at', 'expires_at', 'used_at')
    search_fields = ('user__email', 'token', 'ip_address')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
