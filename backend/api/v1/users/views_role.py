from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from datetime import datetime
from apps.users.models import Role, User
from django.contrib.auth.models import Permission
from .serializers import (
    RoleSerializer,
    RoleDetailSerializer,
    RoleCreateSerializer,
    RoleOptionSerializer,
    PermissionListSerializer,
    UserListSerializer,
)
from .permissions import IsAdminOnly


class RoleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Roles.
    Only admins can create, update, and delete roles.
    """
    queryset = Role.objects.select_related('created_by').prefetch_related('permissions', 'users').all()
    permission_classes = [IsAdminOnly]

    def get_serializer_class(self):
        if self.action == 'create':
            return RoleCreateSerializer
        elif self.action == 'list':
            return RoleSerializer
        elif self.action == 'options':
            return RoleOptionSerializer
        return RoleDetailSerializer

    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }, status=status_code)

    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        response_data = {
            "success": False,
            "message": message,
            "errors": errors or {},
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }
        return Response(response_data, status=status_code)

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return self._format_success_response(
                data=serializer.data,
                message="Fetched roles successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to fetch roles",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='options')
    def options(self, request, *args, **kwargs):
        """
        Minimal roles list for dropdowns.
        Returns only: id, name
        """
        try:
            queryset = self.filter_queryset(self.get_queryset()).filter(is_active=True).order_by('name')
            serializer = self.get_serializer(queryset, many=True)
            return self._format_success_response(
                data=serializer.data,
                message="Fetched role options successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to fetch role options",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        """
        Create a new role.
        Only admins can create roles.
        """
        try:
            serializer = self.get_serializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return self._format_success_response(
                data=serializer.data,
                message="Role created successfully",
                status_code=status.HTTP_201_CREATED
            )
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only administrators can create roles"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except ValidationError as e:
            return self._format_error_response(
                message="Validation error",
                errors=e.detail if hasattr(e, 'detail') else {"detail": str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to create role",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return self._format_success_response(
                data=serializer.data,
                message="Role retrieved successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Role not found",
                errors={"detail": "The requested role does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve role",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=False)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return self._format_success_response(
                data=serializer.data,
                message="Role updated successfully"
            )
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only administrators can update roles"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return self._format_error_response(
                message="Role not found",
                errors={"detail": "The requested role does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except ValidationError as e:
            return self._format_error_response(
                message="Validation error",
                errors=e.detail if hasattr(e, 'detail') else {"detail": str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to update role",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def partial_update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return self._format_success_response(
                data=serializer.data,
                message="Role updated successfully"
            )
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only administrators can update roles"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return self._format_error_response(
                message="Role not found",
                errors={"detail": "The requested role does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except ValidationError as e:
            return self._format_error_response(
                message="Validation error",
                errors=e.detail if hasattr(e, 'detail') else {"detail": str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to update role",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='users')
    def users_with_role(self, request, pk=None):
        """
        Get all users assigned to this role.
        Useful for seeing which users need to be reassigned before deleting a role.
        
        GET /api/v1/roles/{id}/users/
        """
        try:
            instance = self.get_object()
            users = instance.users.all()
            serializer = UserListSerializer(users, many=True)
            return self._format_success_response(
                data={
                    "users": serializer.data,
                    "count": users.count()
                },
                message=f"Found {users.count()} user(s) with this role"
            )
        except NotFound:
            return self._format_error_response(
                message="Role not found",
                errors={"detail": "The requested role does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to fetch users",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """
        Delete a role.
        
        By default, prevents deletion if role is assigned to users.
        Use ?force=true to automatically unassign all users before deleting.
        
        DELETE /api/v1/roles/{id}/
        DELETE /api/v1/roles/{id}/?force=true
        """
        try:
            instance = self.get_object()
            force = request.query_params.get('force', 'false').lower() == 'true'
            
            # Check if role is assigned to any users
            users_count = instance.users.count()
            if users_count > 0:
                if force:
                    # Force delete: unassign all users from this role
                    User.objects.filter(custom_role=instance).update(custom_role=None)
                    self.perform_destroy(instance)
                    return self._format_success_response(
                        data={
                            "unassigned_users_count": users_count
                        },
                        message=f"Role deleted successfully. {users_count} user(s) were automatically unassigned from this role.",
                        status_code=status.HTTP_200_OK
                    )
                else:
                    # Regular delete: prevent deletion and show error
                    return self._format_error_response(
                        message="Cannot delete role",
                        errors={
                            "detail": "This role is assigned to one or more users. Please reassign users before deleting.",
                            "users_count": users_count,
                            "hint": "Use ?force=true to automatically unassign all users before deleting, or use GET /api/v1/roles/{id}/users/ to see which users have this role."
                        },
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            
            # No users assigned, safe to delete
            self.perform_destroy(instance)
            return self._format_success_response(
                data=None,
                message="Role deleted successfully",
                status_code=status.HTTP_200_OK
            )
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only administrators can delete roles"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return self._format_error_response(
                message="Role not found",
                errors={"detail": "The requested role does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to delete role",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing available permissions.
    Read-only - permissions are managed by Django.
    """
    queryset = Permission.objects.select_related('content_type').all()
    serializer_class = PermissionListSerializer
    permission_classes = [IsAdminOnly]

    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }, status=status_code)

    def _get_permission_type(self, codename):
        """Determine permission type from codename"""
        if codename.startswith('view_'):
            return 'can_view'
        elif codename.startswith('add_'):
            return 'can_create'
        elif codename.startswith('change_'):
            return 'can_update'
        elif codename.startswith('delete_'):
            return 'can_delete'
        return None

    def _child_id_to_model_name(self, child_id, app_label):
        """
        Convert child module ID to Django model name.
        Examples: 'gyms' -> 'gym', 'gym_types' -> 'gymtype', 'membership_packages' -> 'membershippackage'
        """
        # Common mappings for known cases
        mappings = {
            'gyms': 'gym',
            'gym_types': 'gymtype',
            'facilities': 'facility',
            'membership_packages': 'membershippackage',
            'subscription_plans': 'subscriptionplan',
            'expired_subscriptions': 'subscription',
        }
        
        if child_id in mappings:
            return mappings[child_id]
        
        # Try to infer: remove plural, remove underscores
        # 'gym_types' -> 'gymtype', 'membership_packages' -> 'membershippackage'
        model_name = child_id
        
        # Remove common plural endings
        if model_name.endswith('_packages'):
            model_name = model_name.replace('_packages', 'package')
        elif model_name.endswith('_types'):
            model_name = model_name.replace('_types', 'type')
        elif model_name.endswith('_plans'):
            model_name = model_name.replace('_plans', 'plan')
        elif model_name.endswith('_subscriptions'):
            model_name = model_name.replace('_subscriptions', 'subscription')
        elif model_name.endswith('ies'):
            model_name = model_name[:-3] + 'y'  # facilities -> facility
        elif model_name.endswith('s'):
            model_name = model_name[:-1]  # gyms -> gym
        
        # Remove underscores
        model_name = model_name.replace('_', '')
        
        return model_name.lower()

    def list(self, request, *args, **kwargs):
        try:
            from apps.dashboard.models import DashboardModule
            from django.contrib.contenttypes.models import ContentType
            from collections import defaultdict
            
            user = request.user
            
            # Get all parent dashboard modules
            parent_modules = DashboardModule.objects.filter(
                is_active=True,
                parent__isnull=True
            ).prefetch_related('permissions', 'children', 'children__permissions').order_by('order', 'name')
            
            # Get all permissions grouped by app_label and model
            all_permissions = Permission.objects.select_related('content_type').all()
            
            # Optional filtering by app_label
            app_label_filter = request.query_params.get('app_label', None)
            if app_label_filter:
                all_permissions = all_permissions.filter(content_type__app_label=app_label_filter)
            
            # Build a lookup: app_label -> model_name -> permission_type -> permission_info
            permissions_lookup = defaultdict(lambda: defaultdict(dict))
            
            for perm in all_permissions:
                app_label = perm.content_type.app_label
                model_name = perm.content_type.model
                codename = perm.codename
                
                perm_type = self._get_permission_type(codename)
                if not perm_type:
                    continue
                
                enabled = user.has_perm(f"{app_label}.{codename}")
                
                if perm_type not in permissions_lookup[app_label][model_name]:
                    permissions_lookup[app_label][model_name][perm_type] = {
                        'id': perm.id,
                        'enabled': enabled
                    }
                elif enabled:
                    # Prefer enabled permissions if multiple exist
                    permissions_lookup[app_label][model_name][perm_type] = {
                        'id': perm.id,
                        'enabled': enabled
                    }
            
            # If filtering by app_label=dashboard, also include standalone dashboard permissions
            # that might not be associated with any module yet
            standalone_permissions = {}
            if app_label_filter == 'dashboard':
                # Get all dashboard permissions
                dashboard_permissions = Permission.objects.filter(
                    content_type__app_label='dashboard'
                ).select_related('content_type')
                
                # Group by module ID extracted from codename
                for perm in dashboard_permissions:
                    # Extract module ID from codename (e.g., "view_test_module" -> "test_module")
                    codename = perm.codename
                    if '_' in codename:
                        parts = codename.split('_', 1)
                        if len(parts) == 2 and parts[0] in ['view', 'add', 'change', 'delete']:
                            module_id = parts[1]
                            if module_id not in standalone_permissions:
                                standalone_permissions[module_id] = {
                                    'module_id': module_id,
                                    'permissions': {}
                                }
                            
                            perm_type = self._get_permission_type(codename)
                            if perm_type:
                                enabled = user.has_perm(f"dashboard.{codename}")
                                standalone_permissions[module_id]['permissions'][perm_type] = {
                                    'id': perm.id,
                                    'enabled': enabled
                                }
            
            # Build response based on dashboard modules
            result = []
            
            for parent_module in parent_modules:
                # Get parent module's own permissions (for dashboard app)
                parent_perms = parent_module.permissions.all()
                
                # Determine app_label from parent module's permissions
                if not parent_perms.exists():
                    # If no permissions, try using module ID as app_label
                    app_label = parent_module.id
                else:
                    # Get app_label from the first permission
                    app_label = parent_perms.first().content_type.app_label
                
                # Get children for this module
                children_modules = parent_module.children.filter(is_active=True).order_by('order', 'name')
                
                children_list = []
                
                # Only add actual child modules (not the parent module itself)
                # Add children modules
                for child in children_modules:
                    # Get child's permissions
                    child_perms = child.permissions.all()
                    
                    # If child has dashboard permissions, use those
                    if child_perms.exists() and child_perms.first().content_type.app_label == 'dashboard':
                        child_perms_dict = {}
                        child_module_id_normalized = child.id.lower().replace('-', '_').replace(' ', '_')
                        
                        for perm_type in ['can_view', 'can_create', 'can_update', 'can_delete']:
                            if perm_type == 'can_view':
                                expected_codename = f"view_{child_module_id_normalized}"
                            elif perm_type == 'can_create':
                                expected_codename = f"add_{child_module_id_normalized}"
                            elif perm_type == 'can_update':
                                expected_codename = f"change_{child_module_id_normalized}"
                            elif perm_type == 'can_delete':
                                expected_codename = f"delete_{child_module_id_normalized}"
                            
                            matching_perm = child_perms.filter(codename=expected_codename).first()
                            if matching_perm:
                                enabled = user.has_perm(f"dashboard.{expected_codename}")
                                child_perms_dict[perm_type] = {
                                    'id': matching_perm.id,
                                    'enabled': enabled
                                }
                            else:
                                child_perms_dict[perm_type] = {'id': None, 'enabled': False}
                        
                        children_list.append({
                            'id': child.id,
                            'label': child.label,
                            'model': 'dashboardmodule',
                            'permissions': child_perms_dict
                        })
                    else:
                        # Original logic for non-dashboard permissions
                        # Convert child ID to model name
                        model_name = self._child_id_to_model_name(child.id, app_label)
                        
                        # Get permissions for this model
                        model_perms = permissions_lookup.get(app_label, {}).get(model_name, {})
                        
                        # Build permissions dict
                        perms_dict = {}
                        for perm_type in ['can_view', 'can_create', 'can_update', 'can_delete']:
                            if perm_type in model_perms:
                                perms_dict[perm_type] = model_perms[perm_type]
                            else:
                                perms_dict[perm_type] = {'id': None, 'enabled': False}
                        
                        children_list.append({
                            'id': child.id,
                            'label': child.label,
                            'model': model_name,
                            'permissions': perms_dict
                        })
                
                # Build module object
                module_obj = {
                    'id': parent_module.id,
                    'label': parent_module.label,
                    'icon': parent_module.icon
                }
                
                # If module has children, add children array
                if children_list:
                    module_obj['children'] = children_list
                # If module has no children but has permissions, add permissions directly to module
                elif parent_perms.exists() and app_label == 'dashboard':
                    # Get parent module's own permissions
                    module_perms_dict = {}
                    module_id_normalized = parent_module.id.lower().replace('-', '_').replace(' ', '_')
                    
                    for perm_type in ['can_view', 'can_create', 'can_update', 'can_delete']:
                        if perm_type == 'can_view':
                            expected_codename = f"view_{module_id_normalized}"
                        elif perm_type == 'can_create':
                            expected_codename = f"add_{module_id_normalized}"
                        elif perm_type == 'can_update':
                            expected_codename = f"change_{module_id_normalized}"
                        elif perm_type == 'can_delete':
                            expected_codename = f"delete_{module_id_normalized}"
                        
                        # Find the permission in parent_perms
                        matching_perm = parent_perms.filter(codename=expected_codename).first()
                        if matching_perm:
                            enabled = user.has_perm(f"dashboard.{expected_codename}")
                            module_perms_dict[perm_type] = {
                                'id': matching_perm.id,
                                'enabled': enabled
                            }
                        else:
                            module_perms_dict[perm_type] = {'id': None, 'enabled': False}
                    
                    # Add permissions directly to module if any exist
                    if any(p.get('id') for p in module_perms_dict.values()):
                        module_obj['permissions'] = module_perms_dict
                
                # Always include module
                result.append({
                    'module': module_obj
                })
                
                # Remove from standalone if it was added there
                if app_label_filter == 'dashboard':
                    module_id_normalized = parent_module.id.lower().replace('-', '_').replace(' ', '_')
                    standalone_permissions.pop(module_id_normalized, None)
            
            # Add standalone dashboard permissions (modules not in the modules list)
            if app_label_filter == 'dashboard' and standalone_permissions:
                for module_id, perm_data in standalone_permissions.items():
                    # Build permissions dict
                    perms_dict = {}
                    for perm_type in ['can_view', 'can_create', 'can_update', 'can_delete']:
                        if perm_type in perm_data['permissions']:
                            perms_dict[perm_type] = perm_data['permissions'][perm_type]
                        else:
                            perms_dict[perm_type] = {'id': None, 'enabled': False}
                    
                    # Only add if there are any permissions
                    if any(p.get('id') for p in perms_dict.values()):
                        result.append({
                            'module': {
                                'id': module_id,
                                'label': module_id.replace('_', ' ').title(),
                                'icon': None,
                                'children': [{
                                    'id': module_id,
                                    'label': module_id.replace('_', ' ').title(),
                                    'model': 'dashboardmodule',
                                    'permissions': perms_dict
                                }]
                            }
                        })
            
            return self._format_success_response(
                data=result,
                message="Fetched permissions successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to fetch permissions",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        response_data = {
            "success": False,
            "message": message,
            "errors": errors or {},
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }
        return Response(response_data, status=status_code)

