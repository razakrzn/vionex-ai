from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission class that allows:
    - Admins: Full access (create, read, update, delete)
    - Authenticated users: Read-only access
    - Unauthenticated: No access
    """
    
    def _is_admin(self, user):
        """Helper method to check if user is admin"""
        if not user or not user.is_authenticated:
            return False
        # Check Django superuser/staff or custom role
        return (
            getattr(user, 'is_superuser', False) or
            getattr(user, 'is_staff', False) or
            getattr(user, 'role_code', None) == 'admin'
        )
    
    def has_permission(self, request, view):
        # Allow read operations for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Only allow write operations for admins
        return self._is_admin(request.user)


class IsAdminOrOwner(permissions.BasePermission):
    """
    Permission class that allows:
    - Admins: Full access to any user
    - Owners: Full access to their own data only
    - Others: No access
    """
    
    def _is_admin(self, user):
        """Helper method to check if user is admin"""
        if not user or not user.is_authenticated:
            return False
        # Check Django superuser/staff or custom role
        return (
            getattr(user, 'is_superuser', False) or
            getattr(user, 'is_staff', False) or
            getattr(user, 'role_code', None) == 'admin'
        )
    
    def has_permission(self, request, view):
        # Must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admins can do anything
        if self._is_admin(request.user):
            return True
        
        # For create action, only admins can create users
        if view.action == 'create':
            return False
        
        # For other actions, check object-level permission
        return True
    
    def has_object_permission(self, request, view, obj):
        # Admins can access any user
        if self._is_admin(request.user):
            return True
        
        # Users can only access their own data
        return obj.id == request.user.id


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

