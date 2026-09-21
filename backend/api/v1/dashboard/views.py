from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError
from datetime import datetime
from apps.dashboard.permissions import CanViewDashboard, IsAdminOnly
from apps.dashboard.models import DashboardModule
from .serializers.module_management import (
    DashboardModuleSerializer,
    DashboardModuleDetailSerializer,
    DashboardModuleCreateSerializer,
)
from .serializers import WalletAdjustmentSerializer
from apps.payments.models import Wallet, WalletTransaction
from api.v1.payments.serializers import WalletTransactionSerializer


class DashboardViewSet(viewsets.ViewSet):
    """
    ViewSet for dashboard-related endpoints.
    All authenticated users can access modules endpoint (filtered by permissions).
    Stats endpoint requires admin authentication.
    """
    permission_classes = [CanViewDashboard]

    def get_permissions(self):
        """
        Override to set different permissions for different actions.
        Stats, Visitor Logs, and Payment History endpoints require admin, modules endpoint allows all authenticated users.
        """
        if self.action in ['get_stats', 'wallet_adjust', 'visitor_logs', 'payment_history']:
            return [IsAdminOnly()]

        return [CanViewDashboard()]

    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK, extra_meta=None):
        """Helper method to format success responses"""
        meta = {
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
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

    def _child_id_to_model_permission(self, child_id, app_label):
        """
        Convert child module ID to expected permission codename.
        Examples: 'properties' -> 'view_property', 'asset_types' -> 'view_assettype'
        """
        # Common mappings for known cases
        mappings = {
            'properties': 'property',
            'asset_types': 'assettype',
            'property_types': 'propertytype',
            'purposes': 'purpose',
            'furnishing_statuses': 'furnishingstatus',
            'completion_statuses': 'completionstatus',
            'amenities': 'amenity',
            'occupant_types': 'occupanttype',
            'gyms': 'gym',
            'gym_types': 'gymtype',
            'facilities': 'facility',
            'membership_packages': 'membershippackage',
        }
        
        if child_id in mappings:
            model_name = mappings[child_id]
        else:
            # Try to infer: remove plural, remove underscores
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
                model_name = model_name[:-1]  # properties -> property
            
            # Remove underscores
            model_name = model_name.replace('_', '')
        
        return f"{app_label}.view_{model_name.lower()}"

    def _user_has_module_access(self, user, module_instance):
        """
        Check if user has access to a module based on:
        1. Admin role (always has access)
        2. If module has children: check if user has access to ANY child
        3. If module has NO children: require explicit permissions
        
        For child modules, check if user has the specific permission for that model.
        
        Args:
            user: The user object
            module_instance: DashboardModule instance
        """
        # Admins always have access
        if getattr(user, 'role_code', None) == 'admin':
            return True
        
        # Check if module has children
        has_children = module_instance.children.filter(is_active=True).exists()
        
        if has_children:
            # Parent module: check if user has access to ANY child
            children = module_instance.children.filter(is_active=True)
            for child in children:
                if self._user_has_module_access(user, child):
                    return True
            return False
        else:
            # Module without children: require explicit permissions
            # For child modules, prioritize checking the specific model permission
            if module_instance.parent:
                # Get parent's app_label from its permissions
                parent_perms = module_instance.parent.permissions.all()
                if parent_perms.exists():
                    app_label = parent_perms.first().content_type.app_label
                    # Check if user has the specific permission for this child's model
                    # This is the PRIMARY check for child modules
                    expected_perm = self._child_id_to_model_permission(module_instance.id, app_label)
                    if user.has_perm(expected_perm):
                        return True
                    # For child modules, don't fall back to assigned permissions
                    # They must have the specific model permission
                    return False
            
            # For non-child modules, check assigned permissions
            module_permissions = module_instance.get_permissions_list()
            
            # If no permissions required, only admins have access (already handled above)
            if not module_permissions:
                return False
            
            # Check Django permissions (includes custom role permissions via user.has_perm)
            if any(user.has_perm(perm) for perm in module_permissions):
                return True
            
            return False

    def _get_permission_flags(self, user, module_permissions):
        """
        Check user permissions and return flags for can_view, can_create, can_update, can_delete.
        
        Args:
            user: The user object
            module_permissions: List of permission strings (e.g., ['fitness.view_gym', 'fitness.add_gym'])
        
        Returns:
            dict with can_view, can_create, can_update, can_delete boolean flags
        """
        # Admins have all permissions
        if getattr(user, 'role_code', None) == 'admin':
            return {
                'can_view': True,
                'can_create': True,
                'can_update': True,
                'can_delete': True
            }
        
        # If no permissions required, only admins have access (already handled above)
        # Regular users need explicit permissions - return all False
        if not module_permissions:
            return {
                'can_view': False,
                'can_create': False,
                'can_update': False,
                'can_delete': False
            }
        
        # Check each permission type
        can_view = False
        can_create = False
        can_update = False
        can_delete = False
        
        for perm in module_permissions:
            # Check if user has this permission
            if user.has_perm(perm):
                # Extract codename from permission string (format: app_label.codename)
                if '.' in perm:
                    codename = perm.split('.', 1)[1]
                else:
                    codename = perm
                
                # Determine permission type from codename
                if codename.startswith('view_'):
                    can_view = True
                elif codename.startswith('add_'):
                    can_create = True
                elif codename.startswith('change_'):
                    can_update = True
                elif codename.startswith('delete_'):
                    can_delete = True
        
        return {
            'can_view': can_view,
            'can_create': can_create,
            'can_update': can_update,
            'can_delete': can_delete
        }

    def _format_module_data(self, user, module, include_children=True):
        """
        Format a module with permission flags.
        
        Args:
            user: The user object
            module: DashboardModule instance
            include_children: Whether to include children
        
        Returns:
            Formatted module dict
        """
        # Check if module has children
        has_children = module.children.filter(is_active=True).exists()
        
        module_data = {
            'id': module.id,
            'name': module.name,
            'label': module.label,
            'icon': module.icon,
            'path': module.path,
            'order': module.order,
            'is_active': module.is_active,
        }
        
        if include_children:
            children = module.children.filter(is_active=True).order_by('order', 'name')
            if children.exists():
                # Filter children based on user permissions
                accessible_children = [
                    self._format_child_module_data(user, child)
                    for child in children
                    if self._user_has_module_access(user, child)
                ]
                
                if accessible_children:
                    module_data['children'] = accessible_children
                    # Parent with children: don't include permissions
                    return module_data
        
        # Module without children: include permissions
        module_permissions = module.get_permissions_list()
        permission_flags = self._get_permission_flags(user, module_permissions)
        module_data['permissions'] = permission_flags
        
        return module_data

    def _format_child_module_data(self, user, child_module):
        """
        Format a child module with permission flags.
        
        Args:
            user: The user object
            child_module: DashboardModule instance (child)
        
        Returns:
            Formatted child module dict
        """
        child_permissions = child_module.get_permissions_list()
        permission_flags = self._get_permission_flags(user, child_permissions)
        
        return {
            'id': child_module.id,
            'label': child_module.label,
            'path': child_module.path,
            'order': child_module.order,
            'permissions': permission_flags
        }

    @action(detail=False, methods=['get'], url_path='test-permissions')
    def test_permissions(self, request):
        """
        Debug endpoint to test permission checking for the current user.
        Useful for debugging permission issues.
        
        GET /api/v1/dashboard/test-permissions/
        """
        try:
            user = request.user
            
            # Test common permissions
            test_perms = [
                'fitness.view_gym',
                'fitness.add_gym',
                'fitness.change_gym',
                'fitness.delete_gym',
                'real_estate.view_property',
                'real_estate.add_property',
            ]
            
            results = {}
            for perm in test_perms:
                has_permission = user.has_perm(perm)
                
                # Get role permission details
                role_permission_details = []
                if user.custom_role and user.custom_role.is_active:
                    if '.' in perm:
                        app_label, codename = perm.split('.', 1)
                    else:
                        codename = perm
                        app_label = None
                    
                    role_perms = user.custom_role.permissions.filter(codename=codename)
                    if app_label:
                        role_perms = role_perms.filter(content_type__app_label=app_label)
                    
                    role_permission_details = [
                        {
                            'id': p.id,
                            'codename': p.codename,
                            'app_label': p.content_type.app_label,
                            'name': p.name
                        }
                        for p in role_perms
                    ]
                
                results[perm] = {
                    'has_perm': has_permission,
                    'custom_role': user.custom_role.name if user.custom_role else None,
                    'role_permissions_found': role_permission_details
                }
            
            return self._format_success_response(
                data={
                    'user_id': user.id,
                    'user_email': user.email,
                    'user_role': getattr(user, 'role_code', None),
                    'custom_role': user.custom_role.name if user.custom_role else None,
                    'permission_tests': results
                },
                message="Permission test results"
            )
            
        except Exception as e:
            return self._format_error_response(
                message="Failed to test permissions",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='stats')
    def get_stats(self, request):
        """
        Get dashboard statistics.
        Only accessible by admin users.
        
        GET /api/v1/dashboard/stats/
        """
        try:
            from apps.users.models import User
            from apps.countries.models import Country
            from apps.real_estate.models import (
                Property, AssetType, PropertyType, Purpose,
                FurnishingStatus, CompletionStatus, OccupantType, Amenity
            )
            from apps.ads.models import Ad, AdGallery
            from apps.fitness.models import (
                Gym, GymType, Facility, GymImage, MembershipPackage
            )
            from apps.payments.models import (
                Payment, Subscription, SubscriptionPlan, PaymentTransaction, PaymentStatus, PaymentConfiguration
            )
            from apps.analytics.models import UserVisit
            from django.utils import timezone
            from datetime import timedelta
            
            # Get statistics
            today = timezone.now().date()
            last_30_days = today - timedelta(days=30)

            stats = {
                "users": {
                    "total_visits": UserVisit.objects.count(), # Total sessions (30-min window)
                    "daily_active_users": UserVisit.objects.filter(timestamp__date=today).values('user', 'ip_address').distinct().count(),
                    "monthly_active_users": UserVisit.objects.filter(timestamp__date__gte=last_30_days).values('user', 'ip_address').distinct().count(),
                    "total_registered": User.objects.count(),
                    "owners": User.objects.filter(custom_role__code='owner').count(),
                    "gym_owners": User.objects.filter(custom_role__code='gym_owner').count(),
                    "seekers": User.objects.filter(custom_role__code='seeker').count(),
                    "admins": User.objects.filter(custom_role__code='admin').count(),
                    "pending_verification": User.objects.filter(
                        custom_role__code__in=['owner', 'gym_owner'],
                        verification_status='PENDING'
                    ).count(),
                },
                "locations": {
                    "countries": Country.objects.count(),
                },
                "real_estate": {
                    "properties": {
                        "total": Property.objects.count(),
                        "active": Property.objects.filter(is_active=True).count(),
                        "for_rent": Property.objects.filter(purpose__name='For Rent').count(),
                        "for_sale": Property.objects.filter(purpose__name='For Sale').count(),
                        "off_plan": Property.objects.filter(purpose__name='Off-Plan').count(),
                    },
                    "asset_types": AssetType.objects.count(),
                    "property_types": PropertyType.objects.count(),
                    "purposes": Purpose.objects.count(),
                    "furnishing_statuses": FurnishingStatus.objects.count(),
                    "completion_statuses": CompletionStatus.objects.count(),
                    "occupant_types": OccupantType.objects.count(),
                    "amenities": Amenity.objects.count(),
                },
                "ads": {
                    "total": Ad.objects.count(),
                    "pending": Ad.objects.filter(verification_status=Ad.VerificationStatus.PENDING).count(),
                    "approved": Ad.objects.filter(verification_status=Ad.VerificationStatus.APPROVED).count(),
                    "rejected": Ad.objects.filter(verification_status=Ad.VerificationStatus.REJECTED).count(),
                    "gallery_images": AdGallery.objects.count(),
                },
                "fitness": {
                    "gyms": {
                        "total": Gym.objects.count(),
                        "active": Gym.objects.filter(is_active=True).count(),
                        "approved": Gym.objects.filter(is_approved=True).count(),
                        "pending": Gym.objects.filter(is_approved=False).count(),
                        "by_gender": {
                            "mixed": Gym.objects.filter(gender_allowed='MIXED').count(),
                            "male": Gym.objects.filter(gender_allowed='MALE').count(),
                            "female": Gym.objects.filter(gender_allowed='FEMALE').count(),
                        },
                        "gallery_images": GymImage.objects.count(),
                    },
                    "gym_types": GymType.objects.count(),
                    "facilities": Facility.objects.count(),
                    "membership_packages": MembershipPackage.objects.count(),
                },
                "payments": {
                    # Combine Payment (for INDIVIDUAL sellers) and Subscription (for COMPANY/AGENT/ADVERTISER/gym_owner sellers)
                    "total_payments": Payment.objects.count() + Subscription.objects.count(),
                    "pending_payments": (
                        Payment.objects.filter(status=PaymentStatus.PENDING).count() +
                        Subscription.objects.filter(status=PaymentStatus.PENDING).count()
                    ),
                    "completed_payments": (
                        Payment.objects.filter(status=PaymentStatus.COMPLETED).count() +
                        Subscription.objects.filter(status=PaymentStatus.COMPLETED).count()
                    ),
                    "failed_payments": (
                        Payment.objects.filter(status=PaymentStatus.FAILED).count() +
                        Subscription.objects.filter(status=PaymentStatus.FAILED).count()
                    ),
                    "total_revenue": float(
                        sum(Payment.objects.filter(status=PaymentStatus.COMPLETED).values_list('amount', flat=True) or [0]) +
                        sum(Subscription.objects.filter(status=PaymentStatus.COMPLETED).values_list('amount', flat=True) or [0])
                    ),
                    "subscriptions": {
                        "total": Subscription.objects.count(),
                        "active": Subscription.objects.filter(is_active=True, status=PaymentStatus.COMPLETED).count(),
                        "expired": Subscription.objects.filter(is_active=False).count(),
                        "pending": Subscription.objects.filter(status=PaymentStatus.PENDING).count(),
                    },
                    "subscription_plans": {
                        "total": SubscriptionPlan.objects.count(),
                        "active": SubscriptionPlan.objects.filter(is_active=True).count(),
                        "by_seller_type": {
                            "individual": SubscriptionPlan.objects.filter(role='owner', seller_type=SubscriptionPlan.SellerType.INDIVIDUAL, is_active=True).count(),
                            "agent": SubscriptionPlan.objects.filter(role='owner', seller_type=SubscriptionPlan.SellerType.AGENT, is_active=True).count(),
                            "company": SubscriptionPlan.objects.filter(role='owner', seller_type=SubscriptionPlan.SellerType.COMPANY, is_active=True).count(),
                        },
                    },
                    "transactions": PaymentTransaction.objects.count(),
                    "configuration": {
                        "active_config": PaymentConfiguration.objects.filter(is_active=True).exists(),
                    }
                }
            }
            
            return self._format_success_response(
                data=stats,
                message="Dashboard statistics retrieved successfully"
            )
            
        except PermissionDenied:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only administrators can access dashboard statistics"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve dashboard statistics",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



    @action(detail=False, methods=['post'], url_path='wallet-adjust')
    def wallet_adjust(self, request):
        """
        Admin-only endpoint to manually adjust wallet points.
        POST /api/v1/dashboard/wallet-adjust/
        """
        serializer = WalletAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_id = serializer.validated_data['user_id']
        amount = serializer.validated_data['amount']
        adjustment_type = serializer.validated_data['adjustment_type']
        description = serializer.validated_data.get('description') or ''

        try:
            from apps.users.models import User
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return self._format_error_response(
                message="User not found",
                errors={"user_id": "No user found with the provided ID"},
                status_code=status.HTTP_404_NOT_FOUND
            )

        wallet = Wallet.get_or_create_wallet(user)

        try:
            if adjustment_type == WalletAdjustmentSerializer.AdjustmentType.CREDIT:
                transaction = wallet.add_points(
                    amount=amount,
                    transaction_type=WalletTransaction.TransactionType.ADJUSTMENT,
                    description=description or "Admin wallet credit adjustment",
                    created_by=request.user
                )
            else:
                transaction = wallet.deduct_points(
                    amount=amount,
                    transaction_type=WalletTransaction.TransactionType.ADJUSTMENT,
                    description=description or "Admin wallet debit adjustment",
                    created_by=request.user
                )
        except ValueError as exc:
            return self._format_error_response(
                message="Wallet adjustment failed",
                errors={"detail": str(exc)},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        response_data = {
            "user_id": user.id,
            "wallet_id": wallet.id,
            "balance": float(wallet.balance),
            "currency": wallet.currency,
            "transaction": WalletTransactionSerializer(transaction).data,
        }

        return self._format_success_response(
            data=response_data,
            message="Wallet adjusted successfully",
            status_code=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], url_path='visitor-logs')
    def visitor_logs(self, request):
        """
        Get detailed visitor logs.
        Only accessible by admin users.
        
        GET /api/v1/dashboard/visitor-logs/
        """
        from apps.analytics.models import UserVisit
        from .serializers import UserVisitSerializer
        from config.pagination import StandardResultsSetPagination

        queryset = UserVisit.objects.select_related('user').all()
        
        # Simple filtering by date if provided
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(timestamp__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__date__lte=end_date)

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        
        if page is not None:
            serializer = UserVisitSerializer(page, many=True)
            pagination_meta = {
                "count": paginator.page.paginator.count,
                "total_pages": paginator.page.paginator.num_pages,
                "current_page": paginator.page.number,
                "next": paginator.get_next_link(),
                "previous": paginator.get_previous_link(),
            }
            return self._format_success_response(
                data=serializer.data,
                message="Visitor logs retrieved successfully",
                extra_meta={"pagination": pagination_meta}
            )

        serializer = UserVisitSerializer(queryset, many=True)
        return self._format_success_response(
            data=serializer.data,
            message="Visitor logs retrieved successfully"
        )

    @action(detail=False, methods=['get'], url_path='payment-history')
    def payment_history(self, request):
        """
        Get all payment history (both Payment and Subscription records).
        Only accessible by admin users.
        
        GET /api/v1/dashboard/payment-history/
        Query params:
            - status: Filter by status (PENDING, COMPLETED, FAILED, CANCELLED)
            - payment_type: Filter by type ('payment' or 'subscription')
            - user_id: Filter by user ID
            - start_date: Filter by start date (YYYY-MM-DD)
            - end_date: Filter by end date (YYYY-MM-DD)
        """
        try:
            from apps.payments.models import Payment, Subscription, PaymentStatus
            from apps.users.models import User
            from config.pagination import StandardResultsSetPagination
            from django.utils import timezone
            
            # Get query parameters
            status_filter = request.query_params.get('status')
            payment_type_filter = request.query_params.get('payment_type')
            user_id_filter = request.query_params.get('user_id')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Build payment queryset
            payments = Payment.objects.select_related('user').all()
            if status_filter:
                payments = payments.filter(status=status_filter)
            if user_id_filter:
                try:
                    payments = payments.filter(user_id=int(user_id_filter))
                except (ValueError, TypeError):
                    pass
            if start_date:
                payments = payments.filter(created_at__date__gte=start_date)
            if end_date:
                payments = payments.filter(created_at__date__lte=end_date)
            
            # Build subscription queryset
            subscriptions = Subscription.objects.select_related('user', 'plan').all()
            if status_filter:
                subscriptions = subscriptions.filter(status=status_filter)
            if user_id_filter:
                try:
                    subscriptions = subscriptions.filter(user_id=int(user_id_filter))
                except (ValueError, TypeError):
                    pass
            if start_date:
                subscriptions = subscriptions.filter(created_at__date__gte=start_date)
            if end_date:
                subscriptions = subscriptions.filter(created_at__date__lte=end_date)
            
            # Combine and format payment data
            payment_list = []
            for payment in payments:
                user = payment.user
                user_role = getattr(user, 'role_code', None)
                payment_list.append({
                    'id': payment.id,
                    'type': 'payment',
                    'user_id': user.id,
                    'user_email': user.email,
                    'user_full_name': getattr(user, 'full_name', None) or f"{user.first_name} {user.last_name}".strip() or user.email,
                    'user_role': user_role,
                    'seller_type': user.seller_type if user_role == 'owner' else None,
                    'amount': float(payment.amount),
                    'currency': payment.currency,
                    'status': payment.status,
                    'property_id': payment.property_id,
                    'created_at': payment.created_at.isoformat() if payment.created_at else None,
                    'completed_at': payment.completed_at.isoformat() if payment.completed_at else None,
                })
            
            # Format subscription data
            subscription_list = []
            for subscription in subscriptions:
                user = subscription.user
                user_role = getattr(user, 'role_code', None)
                subscription_list.append({
                    'id': subscription.id,
                    'type': 'subscription',
                    'user_id': user.id,
                    'user_email': user.email,
                    'user_full_name': getattr(user, 'full_name', None) or f"{user.first_name} {user.last_name}".strip() or user.email,
                    'user_role': user_role,
                    'seller_type': user.seller_type if user_role == 'owner' else None,
                    'amount': float(subscription.amount),
                    'currency': subscription.currency,
                    'status': subscription.status,
                    'is_active': subscription.is_active,
                    'plan_id': subscription.plan.id if subscription.plan else None,
                    'plan_name': subscription.plan.name if subscription.plan else None,
                    'start_date': subscription.start_date.isoformat() if subscription.start_date else None,
                    'end_date': subscription.end_date.isoformat() if subscription.end_date else None,
                    'created_at': subscription.created_at.isoformat() if subscription.created_at else None,
                    'completed_at': subscription.completed_at.isoformat() if subscription.completed_at else None,
                })
            
            # Combine both lists
            all_payments = payment_list + subscription_list
            
            # Filter by payment_type if specified
            if payment_type_filter:
                if payment_type_filter.lower() == 'payment':
                    all_payments = payment_list
                elif payment_type_filter.lower() == 'subscription':
                    all_payments = subscription_list
            
            # Sort by created_at descending (most recent first)
            all_payments.sort(key=lambda x: x['created_at'] or '', reverse=True)
            
            # Paginate
            paginator = StandardResultsSetPagination()
            page = paginator.paginate_queryset(all_payments, request)
            
            if page is not None:
                pagination_meta = {
                    "count": paginator.page.paginator.count,
                    "total_pages": paginator.page.paginator.num_pages,
                    "current_page": paginator.page.number,
                    "next": paginator.get_next_link(),
                    "previous": paginator.get_previous_link(),
                }
                return self._format_success_response(
                    data=page,
                    message="Payment history retrieved successfully",
                    extra_meta={"pagination": pagination_meta}
                )
            
            return self._format_success_response(
                data=all_payments,
                message="Payment history retrieved successfully"
            )
            
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve payment history",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DashboardModuleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing dashboard modules (CRUD operations).
    - GET (list/retrieve): All authenticated users can view modules (filtered by permissions)
    - POST/PUT/PATCH/DELETE: Only admins can create/update/delete modules
    """
    queryset = DashboardModule.objects.select_related('parent').prefetch_related(
        'permissions', 'children__permissions'
    ).all()
    
    def get_permissions(self):
        """
        Override to set different permissions for different actions.
        Read operations (list, retrieve): All authenticated users can view modules.
        Write operations (create, update, partial_update, destroy): Only admins can create/edit/delete modules.
        """
        # Read operations - all authenticated users
        if self.action in ['list', 'retrieve']:
            return [CanViewDashboard()]
        
        # Write operations - admin only
        # This includes: create, update, partial_update, destroy
        return [IsAdminOnly()]

    def get_serializer_class(self):
        if self.action == 'create':
            return DashboardModuleCreateSerializer
        elif self.action == 'list':
            return DashboardModuleSerializer
        return DashboardModuleDetailSerializer

    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK, extra_meta=None):
        """Helper method to format success responses"""
        meta = {
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
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

    def _child_id_to_model_permission(self, child_id, app_label):
        """
        Convert child module ID to expected permission codename.
        Examples: 'properties' -> 'view_property', 'asset_types' -> 'view_assettype'
        """
        # Common mappings for known cases
        mappings = {
            'properties': 'property',
            'asset_types': 'assettype',
            'property_types': 'propertytype',
            'purposes': 'purpose',
            'furnishing_statuses': 'furnishingstatus',
            'completion_statuses': 'completionstatus',
            'amenities': 'amenity',
            'occupant_types': 'occupanttype',
            'gyms': 'gym',
            'gym_types': 'gymtype',
            'facilities': 'facility',
            'membership_packages': 'membershippackage',
        }
        
        if child_id in mappings:
            model_name = mappings[child_id]
        else:
            # Try to infer: remove plural, remove underscores
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
                model_name = model_name[:-1]  # properties -> property
            
            # Remove underscores
            model_name = model_name.replace('_', '')
        
        return f"{app_label}.view_{model_name.lower()}"

    def _user_has_module_access(self, user, module_instance):
        """
        Check if user has access to a module based on:
        1. Admin role (always has access)
        2. If module has children: check if user has access to ANY child
        3. If module has NO children: require explicit permissions
        
        For child modules, check if user has the specific permission for that model.
        """
        # Admins always have access
        if getattr(user, 'role_code', None) == 'admin' or user.is_superuser or user.is_staff:
            return True
        
        # Check if module has children
        has_children = module_instance.children.filter(is_active=True).exists()
        
        if has_children:
            # Parent module: check if user has access to ANY child
            children = module_instance.children.filter(is_active=True)
            for child in children:
                if self._user_has_module_access(user, child):
                    return True
            return False
        else:
            # Module without children: require explicit permissions
            module_permissions = module_instance.get_permissions_list()
            
            # If no permissions required, only admins have access (already handled above)
            if not module_permissions:
                return False
            
            # For child modules, prioritize checking the specific model permission
            if module_instance.parent:
                # Get parent's app_label from its permissions
                parent_perms = module_instance.parent.permissions.all()
                if parent_perms.exists():
                    app_label = parent_perms.first().content_type.app_label
                    # Check if user has the specific permission for this child's model
                    # This is the PRIMARY check for child modules
                    expected_perm = self._child_id_to_model_permission(module_instance.id, app_label)
                    if user.has_perm(expected_perm):
                        return True
                    # For child modules, don't fall back to assigned permissions
                    # They must have the specific model permission
                    return False
            
            # For non-child modules, check assigned permissions
            # Check Django permissions (includes custom role permissions via user.has_perm)
            if any(user.has_perm(perm) for perm in module_permissions):
                return True
            
            return False

    def _get_permission_flags(self, user, module_permissions):
        """
        Check user permissions and return flags for can_view, can_create, can_update, can_delete.
        """
        # Admins have all permissions
        if getattr(user, 'role_code', None) == 'admin' or user.is_superuser or user.is_staff:
            return {
                'can_view': True,
                'can_create': True,
                'can_update': True,
                'can_delete': True
            }
        
        # If no permissions required, only admins have access (already handled above)
        if not module_permissions:
            return {
                'can_view': False,
                'can_create': False,
                'can_update': False,
                'can_delete': False
            }
        
        # Check each permission type
        can_view = False
        can_create = False
        can_update = False
        can_delete = False
        
        for perm in module_permissions:
            # Check if user has this permission
            if user.has_perm(perm):
                # Extract codename from permission string (format: app_label.codename)
                if '.' in perm:
                    codename = perm.split('.', 1)[1]
                else:
                    codename = perm
                
                # Determine permission type from codename
                if codename.startswith('view_'):
                    can_view = True
                elif codename.startswith('add_'):
                    can_create = True
                elif codename.startswith('change_'):
                    can_update = True
                elif codename.startswith('delete_'):
                    can_delete = True
        
        return {
            'can_view': can_view,
            'can_create': can_create,
            'can_update': can_update,
            'can_delete': can_delete
        }

    def _format_module_data(self, user, module, include_children=True):
        """
        Format a module for the listing response.
        - If module has children: show children array
        - If module has no children: just show basic module fields
        """
        module_data = {
            'id': module.id,
            'name': module.name,
            'label': module.label,
            'icon': module.icon,
            'path': module.path,
            'order': module.order,
            'is_active': module.is_active,
        }
        
        if include_children:
            children = module.children.filter(is_active=True).order_by('order', 'name')
            if children.exists():
                # Filter children based on user permissions
                accessible_children = []
                for child in children:
                    # Check if user has access to this child
                    if self._user_has_module_access(user, child):
                        child_data = self._format_child_module_data(user, child)
                        # Only add if child is accessible (child_data is not None)
                        if child_data:
                            accessible_children.append(child_data)
                
                if accessible_children:
                    module_data['children'] = accessible_children
                    return module_data

        # Module has no children or no accessible children: return basic data only
        return module_data

    def _format_child_module_data(self, user, child_module):
        """
        Format a child module.
        Checks the specific model permission for this child to decide visibility,
        but does not expose permission flags in the API response.
        """
        # Get parent's app_label to determine the correct permission
        parent = child_module.parent
        if not parent:
            return None
        
        parent_perms = parent.permissions.all()
        if not parent_perms.exists():
            return None
        
        app_label = parent_perms.first().content_type.app_label
        
        # Get the expected permission for this child's model
        expected_view_perm = self._child_id_to_model_permission(child_module.id, app_label)
        
        # Extract model name from the permission (e.g., "real_estate.view_property" -> "property")
        if '.view_' in expected_view_perm:
            model_name = expected_view_perm.split('.view_')[1]
        else:
            # Fallback: use child_id and convert to model name
            model_name = child_module.id
            if model_name.endswith('s'):
                model_name = model_name[:-1]
            model_name = model_name.replace('_', '')
        
        # Build permission flags based on actual user permissions for this specific model
        permission_flags = {
            'can_view': user.has_perm(expected_view_perm),
            'can_create': user.has_perm(f"{app_label}.add_{model_name}"),
            'can_update': user.has_perm(f"{app_label}.change_{model_name}"),
            'can_delete': user.has_perm(f"{app_label}.delete_{model_name}"),
        }
        
        # Only return child if user has at least one permission
        # This ensures we only show children the user can actually access
        if not any(permission_flags.values()):
            return None
        
        return {
            'id': child_module.id,
            'label': child_module.label,
            'path': child_module.path,
            'order': child_module.order,
        }

    def list(self, request, *args, **kwargs):
        """
        List all modules with permission flags structure.
        - Admins: See all modules with permission flags
        - Regular users: See only modules they have access to (filtered by permissions)
        """
        try:
            user = request.user
            is_admin = getattr(user, 'role_code', None) == 'admin' or user.is_superuser or user.is_staff
            
            # Get all active top-level modules (no parent)
            top_level_modules = DashboardModule.objects.filter(
                parent__isnull=True,
                is_active=True
            ).prefetch_related('permissions', 'children__permissions').order_by('order', 'name')
            
            # Format modules with permission flags
            formatted_modules = []
            
            for module in top_level_modules:
                if is_admin:
                    # Admins see all modules
                    formatted_module = self._format_module_data(user, module, include_children=True)
                    formatted_modules.append(formatted_module)
                else:
                    # Regular users: filter modules based on permissions
                    if self._user_has_module_access(user, module):
                        formatted_module = self._format_module_data(user, module, include_children=True)
                        # Only add module if it has accessible children or user has any permissions
                        has_accessible_children = 'children' in formatted_module and len(formatted_module.get('children', [])) > 0
                        has_permissions = False

                        # For leaf modules (no children included), check if user has any permissions
                        if not has_accessible_children:
                            module_permissions = module.get_permissions_list()
                            permission_flags = self._get_permission_flags(user, module_permissions)
                            has_permissions = any(permission_flags.values())
                        
                        if has_accessible_children or has_permissions:
                            formatted_modules.append(formatted_module)
            
            return self._format_success_response(
                data=formatted_modules,
                message="Modules retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve modules",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return self._format_success_response(
                data=serializer.data,
                message="Module retrieved successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Module not found",
                errors={"detail": "The requested module does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve module",
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
                message="Module created successfully",
                status_code=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            return self._format_error_response(
                message="Validation error",
                errors=e.detail if hasattr(e, 'detail') else {"detail": str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to create module",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=False)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)

            # Build simplified response: root module + its children (id & label only)
            updated_instance = serializer.instance
            root_module = updated_instance.parent or updated_instance
            children_qs = root_module.children.all().order_by('order', 'name')
            children_data = [
                {
                    "id": child.id,
                    "label": child.label,
                }
                for child in children_qs
            ]

            response_data = {
                "id": root_module.id,
                "label": root_module.label,
                "children": children_data,
            }

            return self._format_success_response(
                data=response_data,
                message=f"{root_module.label} module updated successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Module not found",
                errors={"detail": "The requested module does not exist"},
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
                message="Failed to update module",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def partial_update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)

            # Build simplified response: root module + its children (id & label only)
            updated_instance = serializer.instance
            root_module = updated_instance.parent or updated_instance
            children_qs = root_module.children.all().order_by('order', 'name')
            children_data = [
                {
                    "id": child.id,
                    "label": child.label,
                }
                for child in children_qs
            ]

            response_data = {
                "id": root_module.id,
                "label": root_module.label,
                "children": children_data,
            }

            return self._format_success_response(
                data=response_data,
                message=f"{root_module.label} module updated successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Module not found",
                errors={"detail": "The requested module does not exist"},
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
                message="Failed to update module",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            user = request.user
            
            # Check if user is admin
            is_admin = (
                getattr(user, 'role_code', None) == 'admin' or 
                getattr(user, 'is_superuser', False) or 
                getattr(user, 'is_staff', False)
            )
            
            # Check if module has children
            if instance.children.exists():
                if is_admin:
                    # Admin can delete module with children - Django CASCADE will handle children deletion
                    children_count = instance.children.count()
                    self.perform_destroy(instance)
                    return self._format_success_response(
                        data=None,
                        message=f"Module and {children_count} child module(s) deleted successfully"
                    )
                else:
                    # Non-admin users cannot delete modules with children
                    return self._format_error_response(
                        message="Cannot delete module",
                        errors={"detail": "This module has children. Please delete or reassign children first."},
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            
            # No children, proceed with deletion
            self.perform_destroy(instance)
            return self._format_success_response(
                data=None,
                message="Module deleted successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Module not found",
                errors={"detail": "The requested module does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to delete module",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

