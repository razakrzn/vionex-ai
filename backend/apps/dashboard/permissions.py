from rest_framework import permissions


class IsAdminOnly(permissions.BasePermission):
    """
    Permission class that only allows admin users.
    Checks for:
    1. User with custom_role.code == 'admin'
    2. Django superuser (is_superuser=True)
    3. Django staff (is_staff=True) as fallback
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user is Django superuser (highest privilege)
        if getattr(request.user, 'is_superuser', False):
            return True
        
        # Check if user is Django staff
        if getattr(request.user, 'is_staff', False):
            return True
        
        # Check if user has admin role via custom_role
        return getattr(request.user, 'role_code', None) == 'admin'


class CanViewDashboard(permissions.BasePermission):
    """
    Permission class that allows authenticated users to view dashboard modules.
    Modules will be filtered based on their permissions.
    """
    
    def has_permission(self, request, view):
        # Allow all authenticated users to access dashboard
        # Module filtering will be done in the view based on permissions
        return (
            request.user and 
            request.user.is_authenticated
        )


class CanManageModules(permissions.BasePermission):
    """
    Permission class for managing dashboard modules.
    Only admins can manage modules.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user is Django superuser (highest privilege)
        if getattr(request.user, 'is_superuser', False):
            return True
        
        # Check if user is Django staff
        if getattr(request.user, 'is_staff', False):
            return True
        
        # Check if user has admin role via custom_role
        return getattr(request.user, 'role_code', None) == 'admin'

