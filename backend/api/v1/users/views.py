from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import ValidationError as DjangoValidationError
from datetime import datetime
from apps.users.models import User
from apps.notifications.models import Notification
from .serializers import (
    UserCreateSerializer,
    UserListSerializer,
    UserDetailSerializer,
)
from .permissions import IsAdminOrOwner, IsAdminOnly
from .filters import UserFilter


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('emirate', 'emirate__country').all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    # Add filter backends
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = UserFilter
    
    # Configure search fields (used with ?search= query parameter)
    search_fields = [
        'email',
        'full_name',
        'mobile_number',
        'whatsapp_number',
        'company_name',
        'website_url',
        'address',
        'state',
        'city',
        'license_number',
        'emirates_id_number',
        'country__name',
        'custom_role__name',
    ]
    
    # Configure ordering fields
    ordering_fields = [
        'date_joined',
        'email',
        'full_name',
        'custom_role__code',
        'verification_status',
        'seller_type',
    ]
    ordering = ['-date_joined']  # Default ordering

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        Allow unauthenticated access for list and retrieve actions (to view active agents, companies, individuals).
        Require authentication for all other actions.
        """
        if self.action in ['list', 'retrieve']:
            # Allow unauthenticated access for list and retrieve
            return [AllowAny()]
        elif self.action == 'me':
            # Me endpoint requires authentication (any authenticated user can access their own data)
            return [IsAuthenticated()]
        elif self.action == 'create':
            # Only admins can create users
            return [IsAdminOnly()]
        elif self.action == 'destroy':
            # Only admins can delete users
            return [IsAdminOnly()]
        elif self.action == 'update_verification_status':
            # Only admins can update verification status
            return [IsAdminOnly()]
        elif self.action in ['suspend', 'activate']:
            # Only admins can suspend/activate users
            return [IsAdminOnly()]
        else:
            # Users can view/update themselves, admins can do everything
            return [IsAdminOrOwner()]

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

    def get_queryset(self):
        """
        Filter queryset based on user role (access control):
        - Admins: Can see all users
        - Regular users: Can only see themselves
        - Unauthenticated users: Can only see APPROVED agents, companies, and individuals
        
        Note: Additional filtering (role, verification_status, etc.) is handled by FilterSet
        """
        user = self.request.user
        
        if not user.is_authenticated:
            # Unauthenticated users can only see APPROVED agents, companies, and individuals
            queryset = User.objects.select_related('country').filter(
                verification_status=User.VerificationStatus.APPROVED,
                custom_role__code='owner',
                seller_type__in=[
                    User.SellerTypes.AGENT,
                    User.SellerTypes.COMPANY,
                    User.SellerTypes.INDIVIDUAL
                ]
            )
        elif self._is_admin(user):
            queryset = User.objects.select_related('country').all()
        else:
            # Regular users can only see themselves
            queryset = User.objects.select_related('country').filter(id=user.id)
        
        # FilterSet will handle additional filtering via query parameters
        # Default ordering is set in ordering = ['-date_joined']
        
        return queryset

    def get_object(self):
        """
        Override to allow unauthenticated users to retrieve APPROVED agents, companies, and individuals only
        """
        obj = super().get_object()
        
        # If user is not authenticated, only allow access to APPROVED agents, companies, and individuals
        if not self.request.user.is_authenticated:
            if not (obj.verification_status == User.VerificationStatus.APPROVED and 
                    getattr(obj, 'role_code', None) == 'owner' and 
                    obj.seller_type in [
                        User.SellerTypes.AGENT,
                        User.SellerTypes.COMPANY,
                        User.SellerTypes.INDIVIDUAL
                    ]):
                raise NotFound("User not found")
        
        return obj

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        elif self.action == "list":
            return UserListSerializer
        return UserDetailSerializer

    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK, extra_meta=None):
        """Helper method to format success responses"""
        meta = {
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        # Merge in any extra metadata (e.g., pagination)
        if extra_meta:
            meta.update(extra_meta)
        
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "status_code": status_code,
            "meta": meta
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
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                paginator = self.paginator
                pagination_meta = {
                    "count": paginator.page.paginator.count,
                    "total_pages": paginator.page.paginator.num_pages,
                    "current_page": paginator.page.number,
                    "next": paginator.get_next_link(),
                    "previous": paginator.get_previous_link(),
                }
                return self._format_success_response(
                    data=serializer.data,
                    message="Users retrieved successfully",
                    extra_meta={"pagination": pagination_meta},
                )
            serializer = self.get_serializer(queryset, many=True)
            return self._format_success_response(
                data=serializer.data,
                message="Users retrieved successfully",
            )
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "You do not have permission to perform this action"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve users",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return self._format_success_response(
                data=serializer.data,
                message="User created successfully",
                status_code=status.HTTP_201_CREATED
            )
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only administrators can create users"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except ValidationError as e:
            return self._format_error_response(
                message="Validation error",
                errors=e.detail if hasattr(e, 'detail') else {"detail": str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except DjangoValidationError as e:
            return self._format_error_response(
                message="Validation error",
                errors={"detail": str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to create user",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return self._format_success_response(
                data=serializer.data,
                message="User retrieved successfully"
            )
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "You can only access your own profile"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return self._format_error_response(
                message="User not found",
                errors={"detail": "The requested user does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve user",
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
                message="User updated successfully"
            )
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "You can only update your own profile"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return self._format_error_response(
                message="User not found",
                errors={"detail": "The requested user does not exist"},
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
                message="Failed to update user",
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
                message="User updated successfully"
            )
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "You can only update your own profile"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return self._format_error_response(
                message="User not found",
                errors={"detail": "The requested user does not exist"},
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
                message="Failed to update user",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return self._format_success_response(
                data=None,
                message="User deleted successfully",
                status_code=status.HTTP_200_OK
            )
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only administrators can delete users"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return self._format_error_response(
                message="User not found",
                errors={"detail": "The requested user does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to delete user",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """
        Get current authenticated user's details.
        GET /api/v1/users/me/
        """
        try:
            if not request.user.is_authenticated:
                return self._format_error_response(
                    message="Authentication required",
                    errors={"detail": "You must be authenticated to access this endpoint"},
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            
            # Get the current user
            user = request.user
            serializer = UserDetailSerializer(user)
            
            return self._format_success_response(
                data=serializer.data,
                message="User details retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve user details",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='verify')
    def update_verification_status(self, request, pk=None):
        """
        Update user verification status (approve, reject, or set to pending).
        Only admins can perform this action.
        
        POST /api/v1/users/{id}/verify/
        Body: {
            "action": "approve" | "reject" | "pending",
            "rejection_note": "Optional note when rejecting"  // Only used when action is "reject"
        }
        """
        try:
            # Get the user instance
            user = self.get_object()
            
            # BUG FIX: Prevent admins from modifying admin accounts (including themselves)
            # Admins should not have their verification status changed as it can cause authentication issues
            if getattr(user, 'role_code', None) == 'admin':
                return self._format_error_response(
                    message="Cannot modify admin verification status",
                    errors={"detail": "Admin accounts cannot have their verification status modified. This prevents authentication issues."},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate action in request body
            action_value = request.data.get('action', '').lower()
            
            if not action_value:
                return self._format_error_response(
                    message="Validation error",
                    errors={"action": "This field is required"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Map action to verification status
            action_mapping = {
                'approve': User.VerificationStatus.APPROVED,
                'reject': User.VerificationStatus.REJECTED,
                'pending': User.VerificationStatus.PENDING,
            }
            
            if action_value not in action_mapping:
                return self._format_error_response(
                    message="Validation error",
                    errors={"action": f"Invalid action. Must be one of: {', '.join(action_mapping.keys())}"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Get rejection note if action is reject
            rejection_note = None
            if action_value == 'reject':
                rejection_note = request.data.get('rejection_note', '').strip()
                # Store rejection note in user model
                user.rejection_note = rejection_note if rejection_note else None
            
            role_code = getattr(user, 'role_code', None)

            # Update verification status
            user.verification_status = action_mapping[action_value]
            
            # Clear rejection note if approving or setting to pending
            if action_value != 'reject':
                user.rejection_note = None
            else:
                user.rejection_note = rejection_note if rejection_note else None
            
            user.save()
            
            # Refresh from DB to confirm the save
            user.refresh_from_db()
            
            # Create notification for the user (only for owners and gym_owners)
            # Use hybrid DB + FCM approach
            if role_code in ['owner', 'gym_owner']:
                import logging
                logger = logging.getLogger(__name__)
                
                from apps.notifications.services import NotificationService
                from apps.notifications.models import NotificationType
                
                # Map action to notification type
                type_mapping = {
                    'approve': NotificationType.VERIFICATION_APPROVED,
                    'reject': NotificationType.VERIFICATION_REJECTED,
                    'pending': NotificationType.VERIFICATION_PENDING,
                }
                
                title_mapping = {
                    'approve': 'Account Approved - Welcome to Vionex!',
                    'reject': 'Account Verification Rejected',
                    'pending': 'Account Verification Pending',
                }
                
                message_mapping = {
                    'approve': 'Congratulations! Your account has been approved and verified. You can now access all features of Vionex.',
                    'reject': f'Your account verification has been rejected.{" Reason: " + rejection_note if rejection_note else ""}',
                    'pending': 'Your account verification status has been set to pending. Our team is reviewing your account.',
                }
                
                notification_type = type_mapping.get(action_value)
                if notification_type:
                    metadata = {}
                    if rejection_note:
                        metadata['rejection_note'] = rejection_note
                    
                    NotificationService.send_notification(
                        user=user,
                        type=notification_type,
                        title=title_mapping[action_value],
                        message=message_mapping[action_value],
                        metadata=metadata
                    )
            else:
                import logging
                logger = logging.getLogger(__name__)
                logger.debug(f"⏭️ Skipping notification for user {user.id} - role '{role_code}' is not owner/gym_owner")
            
            # Prepare success message
            action_messages = {
                'approve': 'User verification status approved successfully',
                'reject': 'User verification status rejected successfully',
                'pending': 'User verification status set to pending successfully',
            }
            
            return self._format_success_response(
                data={
                    "verification_status": user.verification_status.lower(),
                    "is_subscribed": user.is_subscribed,
                },
                message=action_messages[action_value],
                status_code=status.HTTP_200_OK
            )
            
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only administrators can update verification status"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return self._format_error_response(
                message="User not found",
                errors={"detail": "The requested user does not exist"},
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
                message="Failed to update verification status",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='assign-role')
    def assign_role(self, request, pk=None):
        """
        Assign a custom role to a user.
        Only admins can perform this action.
        
        POST /api/v1/users/{id}/assign-role/
        Body: {"role_id": 1} or {"role_id": null} to remove role
        """
        try:
            from apps.users.models import Role, get_or_create_system_role
            
            # Get the user instance
            user = self.get_object()
            
            # Prevent changing role for superusers - they must always have admin role
            if user.is_superuser:
                admin_role = get_or_create_system_role('admin')
                role_id = request.data.get('role_id')
                
                # If trying to assign a different role, reject it
                if role_id is not None and role_id != admin_role.id:
                    return self._format_error_response(
                        message="Validation error",
                        errors={"role_id": "Superusers must always have the admin role. Cannot assign a different role."},
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
                
                # If trying to remove role, reject it
                if role_id is None:
                    return self._format_error_response(
                        message="Validation error",
                        errors={"role_id": "Superusers must always have the admin role. Cannot remove role."},
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
                
                # If assigning admin role (which is correct), proceed
                role = admin_role
            else:
                # Validate role_id in request body
                role_id = request.data.get('role_id')
                
                if role_id is None:
                    # Remove role assignment
                    user.custom_role = None
                    user.save()
                    serializer = UserListSerializer(user)
                    return self._format_success_response(
                        data=serializer.data,
                        message="Role removed from user successfully"
                    )
                
                # Validate role exists
                try:
                    role = Role.objects.get(id=role_id, is_active=True)
                except Role.DoesNotExist:
                    return self._format_error_response(
                        message="Validation error",
                        errors={"role_id": "Role not found or is inactive"},
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            
            # Assign role to user
            user.custom_role = role
            user.save()
            
            # Serialize the updated user
            serializer = UserListSerializer(user)
            
            return self._format_success_response(
                data=serializer.data,
                message=f"Role '{role.name}' assigned to user successfully"
            )
            
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only administrators can assign roles"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return self._format_error_response(
                message="User not found",
                errors={"detail": "The requested user does not exist"},
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
                message="Failed to assign role",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='bulk-assign-role')
    def bulk_assign_role(self, request):
        """
        Assign a role to multiple users at once.
        Only admins can perform this action.
        
        POST /api/v1/users/bulk-assign-role/
        Body: {
            "user_ids": [1, 2, 3],
            "role_id": 1
        }
        """
        try:
            from apps.users.models import Role
            
            user_ids = request.data.get('user_ids', [])
            role_id = request.data.get('role_id')
            
            if not isinstance(user_ids, list) or not user_ids:
                return self._format_error_response(
                    message="Validation error",
                    errors={"user_ids": "Must be a non-empty list of user IDs"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate role exists (if role_id is provided)
            role = None
            if role_id is not None:
                try:
                    role = Role.objects.get(id=role_id, is_active=True)
                except Role.DoesNotExist:
                    return self._format_error_response(
                        message="Validation error",
                        errors={"role_id": "Role not found or is inactive"},
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            
            # Get users
            users = User.objects.filter(id__in=user_ids)
            if users.count() != len(user_ids):
                return self._format_error_response(
                    message="Validation error",
                    errors={"user_ids": "One or more user IDs are invalid"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Assign role to all users
            updated_count = users.update(custom_role=role)
            
            return self._format_success_response(
                data={
                    "updated_count": updated_count,
                    "role_id": role_id,
                    "role_name": role.name if role else None
                },
                message=f"Role assigned to {updated_count} user(s) successfully"
            )
            
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only administrators can assign roles"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to assign roles",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='suspend')
    def suspend(self, request, pk=None):
        """
        Suspend a user account.
        Only admins can perform this action.
        
        POST /api/v1/users/{id}/suspend/
        Body: {
            "reason": "Optional reason for suspension"
        }
        """
        try:
            from django.utils import timezone
            
            # Get the user instance
            user = self.get_object()
            
            # Prevent suspending admin accounts
            if getattr(user, 'role_code', None) == 'admin' or user.is_superuser or user.is_staff:
                return self._format_error_response(
                    message="Cannot suspend admin account",
                    errors={"detail": "Admin accounts cannot be suspended"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if already suspended
            if user.is_suspended:
                return self._format_error_response(
                    message="User already suspended",
                    errors={"detail": "This user account is already suspended"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Get suspension reason from request body
            suspension_reason = request.data.get('reason', '').strip()
            
            # Suspend the user
            user.is_suspended = True
            user.suspension_reason = suspension_reason if suspension_reason else None
            user.suspended_at = timezone.now()
            user.save()
            
            # Refresh from DB to confirm the save
            user.refresh_from_db()
            
            return self._format_success_response(
                data={
                    "is_suspended": user.is_suspended,
                    "suspended_at": user.suspended_at.isoformat() if user.suspended_at else None,
                    "suspension_reason": user.suspension_reason
                },
                message="User account suspended successfully",
                status_code=status.HTTP_200_OK
            )
            
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only administrators can suspend users"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return self._format_error_response(
                message="User not found",
                errors={"detail": "The requested user does not exist"},
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
                message="Failed to suspend user",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        """
        Activate (unsuspend) a user account.
        Only admins can perform this action.
        
        POST /api/v1/users/{id}/activate/
        """
        try:
            # Get the user instance
            user = self.get_object()
            
            # Check if already active
            if not user.is_suspended:
                return self._format_error_response(
                    message="User already active",
                    errors={"detail": "This user account is not suspended"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Activate the user
            user.is_suspended = False
            user.suspension_reason = None
            user.suspended_at = None
            user.save()
            
            # Refresh from DB to confirm the save
            user.refresh_from_db()
            
            return self._format_success_response(
                data={
                    "is_suspended": user.is_suspended,
                    "suspended_at": None,
                    "suspension_reason": None
                },
                message="User account activated successfully",
                status_code=status.HTTP_200_OK
            )
            
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only administrators can activate users"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return self._format_error_response(
                message="User not found",
                errors={"detail": "The requested user does not exist"},
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
                message="Failed to activate user",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
