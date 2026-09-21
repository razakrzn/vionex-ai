from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from api.v1.users.permissions import IsAdminOnly
from rest_framework.filters import SearchFilter, OrderingFilter
from django.http import QueryDict
from django.db.models import Q, Case, When, IntegerField
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime
from math import radians, cos, sin, asin, sqrt
from apps.fitness.models import GymType, Facility, Gym, GymImage
from apps.users.models import User
from apps.notifications.models import NotificationType
from apps.notifications.services import NotificationService
from apps.payments.utils import can_user_create_property
from .filters import GymFilter
from .serializers import (
    GymTypeListSerializer,
    GymTypeDetailSerializer,
    GymTypeCreateSerializer,
    FacilityListSerializer,
    FacilityDetailSerializer,
    FacilityCreateSerializer,
    GymListSerializer,
    GymDetailSerializer,
    GymCreateSerializer,
    GymApproveRejectSerializer,
)


class BaseViewSet(viewsets.ModelViewSet):
    """Base ViewSet with common response formatting"""
    permission_classes = [IsAuthenticated]
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK, extra_meta=None):
        """Helper method to format success responses"""
        meta = {
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        if extra_meta:
            meta.update(extra_meta)

        response_data = {
            "success": True,
            "message": message,
        }
        if data is not None:
            response_data["data"] = data
        response_data["status_code"] = status_code
        response_data["meta"] = meta

        return Response(response_data, status=status_code)

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
                    message=f"{self.queryset.model.__name__}s retrieved successfully",
                    extra_meta={"pagination": pagination_meta},
                )
            serializer = self.get_serializer(queryset, many=True)
            return self._format_success_response(
                data=serializer.data,
                message=f"{self.queryset.model.__name__}s retrieved successfully",
            )
        except Exception as e:
            return self._format_error_response(
                message=f"Failed to retrieve {self.queryset.model.__name__.lower()}s",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            instance = serializer.instance
            model_class = self.queryset.model
            instance = model_class.objects.get(pk=instance.pk)
            original_action = self.action
            self.action = 'retrieve'
            try:
                response_serializer = self.get_serializer(instance)
            finally:
                self.action = original_action
            return self._format_success_response(
                data=response_serializer.data,
                message=f"{self.queryset.model.__name__} created successfully",
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
                message=f"Failed to create {self.queryset.model.__name__.lower()}",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return self._format_success_response(
                data=serializer.data,
                message=f"{self.queryset.model.__name__} retrieved successfully"
            )
        except NotFound:
            return self._format_error_response(
                message=f"{self.queryset.model.__name__} not found",
                errors={"detail": f"The requested {self.queryset.model.__name__.lower()} does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message=f"Failed to retrieve {self.queryset.model.__name__.lower()}",
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
                message=f"{self.queryset.model.__name__} updated successfully"
            )
        except NotFound:
            return self._format_error_response(
                message=f"{self.queryset.model.__name__} not found",
                errors={"detail": f"The requested {self.queryset.model.__name__.lower()} does not exist"},
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
                message=f"Failed to update {self.queryset.model.__name__.lower()}",
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
                message=f"{self.queryset.model.__name__} updated successfully"
            )
        except NotFound:
            return self._format_error_response(
                message=f"{self.queryset.model.__name__} not found",
                errors={"detail": f"The requested {self.queryset.model.__name__.lower()} does not exist"},
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
                message=f"Failed to update {self.queryset.model.__name__.lower()}",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return self._format_success_response(
                data=None,
                message=f"{self.queryset.model.__name__} deleted successfully",
                status_code=status.HTTP_200_OK
            )
        except NotFound:
            return self._format_error_response(
                message=f"{self.queryset.model.__name__} not found",
                errors={"detail": f"The requested {self.queryset.model.__name__.lower()} does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message=f"Failed to delete {self.queryset.model.__name__.lower()}",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GymTypeViewSet(BaseViewSet):
    queryset = GymType.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """
        Permissions:
        - list, retrieve: Anyone can view (AllowAny)
        - create, update, partial_update, destroy: Only admins (IsAdminOnly)
        """
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminOnly()]

    def get_queryset(self):
        return GymType.objects.all().order_by('name')

    def get_serializer_class(self):
        if self.action == "create":
            return GymTypeCreateSerializer
        elif self.action == "list":
            return GymTypeListSerializer
        return GymTypeDetailSerializer


class FacilityViewSet(BaseViewSet):
    queryset = Facility.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """
        Permissions:
        - list, retrieve: Anyone can view (AllowAny)
        - create, update, partial_update, destroy: Only admins (IsAdminOnly)
        """
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminOnly()]

    def get_queryset(self):
        return Facility.objects.all().order_by('name')

    def get_serializer_class(self):
        if self.action == "create":
            return FacilityCreateSerializer
        elif self.action == "list":
            return FacilityListSerializer
        return FacilityDetailSerializer


class GymViewSet(BaseViewSet):
    queryset = Gym.objects.select_related(
        'gym_type', 'owner'
    ).prefetch_related('facilities', 'gallery_images', 'packages').all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = GymFilter
    
    search_fields = [
        'name',
        'description',
        'address',
        'gym_type__name',
    ]
    
    ordering_fields = [
        'name',
        'created_at',
        'updated_at',
        'views_count',
    ]
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'increment_views']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return GymCreateSerializer
        elif self.action == "list":
            return GymListSerializer
        return GymDetailSerializer

    def get_queryset(self):
        queryset = Gym.objects.select_related(
            'gym_type', 'owner'
        ).prefetch_related('facilities', 'gallery_images', 'packages').all()
        
        # Role-based filtering
        if not self.request.user.is_authenticated:
            # Unauthenticated users: only active and approved gyms
            queryset = queryset.filter(is_active=True, is_approved=True)
        elif getattr(self.request.user, 'role_code', None) == 'admin':
            # Admin: return all gyms (no filtering)
            pass
        elif getattr(self.request.user, 'role_code', None) == 'gym_owner':
            # Gym Owner: return ONLY their own gyms
            queryset = queryset.filter(owner=self.request.user)
        else:
            # Seeker (or any other role): return active and approved gyms
            queryset = queryset.filter(is_active=True, is_approved=True)
        
        # Handle radius search (lat, lng, radius in km)
        # Query params: lat, lng, radius (in km, default: 5 km)
        lat = self.request.query_params.get('lat', None)
        lng = self.request.query_params.get('lng', None)
        radius = self.request.query_params.get('radius', None)
        
        if lat and lng:
            try:
                lat = float(lat)
                lng = float(lng)
                # Default radius is 5 km if not provided
                radius_km = float(radius) if radius else 5.0
                
                # Filter gyms that have coordinates
                queryset = queryset.exclude(latitude__isnull=True, longitude__isnull=True)
                
                # Calculate distances and filter by radius
                # Using haversine formula since we're using FloatFields, not PointField
                gyms_with_distance = []
                distance_map = {}  # Store distances by gym ID
                
                for gym in queryset:
                    if gym.latitude and gym.longitude:
                        # Haversine formula to calculate distance
                        lat1, lon1, lat2, lon2 = map(radians, [lat, lng, gym.latitude, gym.longitude])
                        dlat = lat2 - lat1
                        dlon = lon2 - lon1
                        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                        c = 2 * asin(sqrt(a))
                        distance_km = 6371 * c  # Earth radius in kilometers
                        
                        if distance_km <= radius_km:
                            distance_km_rounded = round(distance_km, 2)
                            distance_map[gym.id] = distance_km_rounded
                            gyms_with_distance.append((distance_km, gym))
                
                # Sort by distance and get IDs
                gyms_with_distance.sort(key=lambda x: x[0])
                gym_ids = [gym.id for _, gym in gyms_with_distance]
                
                # Store distance map in request for serializer access
                self.request._gym_distances = distance_map
                
                # Return queryset ordered by distance (closest first)
                # Preserve select_related and prefetch_related
                if gym_ids:
                    preserved = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(gym_ids)])
                    queryset = Gym.objects.select_related(
                        'gym_type', 'owner'
                    ).prefetch_related('facilities', 'gallery_images', 'packages').filter(
                        id__in=gym_ids
                    ).order_by(preserved)
                else:
                    # No gyms within radius, return empty queryset
                    queryset = Gym.objects.none()
                    
            except (ValueError, TypeError) as e:
                # Invalid coordinates or radius, skip radius filtering
                # Clear any distance map if it was set
                if hasattr(self.request, '_gym_distances'):
                    delattr(self.request, '_gym_distances')
                pass
        else:
            # No lat/lng provided, clear any previous distance map
            if hasattr(self.request, '_gym_distances'):
                delattr(self.request, '_gym_distances')
        
        return queryset

    def get_object(self):
        obj = super().get_object()
        if not self.request.user.is_authenticated and not obj.is_approved:
            raise NotFound("Gym not found")
        return obj

    def create(self, request, *args, **kwargs):
        from django.conf import settings
        
        # Check verification status for gym owners
        if getattr(request.user, 'role_code', None) == 'gym_owner':
            if request.user.verification_status == 'REJECTED' or not request.user.is_active:
                return self._format_error_response(
                    message="Account verification required",
                    errors={"verification": "Your account verification is required to create gyms. Please contact support if you believe this is an error."},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            if request.user.verification_status == 'PENDING':
                return self._format_error_response(
                    message="Account verification pending",
                    errors={"verification": "Your account verification is pending. Please wait for admin approval before creating gyms."},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            # Subscription is REQUIRED before gym creation
            can_create, message = can_user_create_property(request.user)
            if not can_create:
                return self._format_error_response(
                    message=message,
                    errors={"payment": message},
                    status_code=status.HTTP_402_PAYMENT_REQUIRED
                )
        
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            instance = serializer.instance
            
            # Handle subscription tracking for gym creation
            if getattr(request.user, 'role_code', None) == 'gym_owner':
                from apps.payments.models import Subscription
                
                # Increment subscription usage_count
                if hasattr(request.user, 'subscription'):
                    subscription = request.user.subscription
                    subscription.increment_usage()
                
                # NOTE: Gym is_active is now based on admin approval and expires_at field
                # Gyms are inactive by default until admin approves them
                # When admin approves, expires_at is set and gym becomes active
                # Subscription status no longer directly affects gym is_active status
            
            instance = Gym.objects.select_related(
                'gym_type', 'owner'
            ).prefetch_related('facilities', 'gallery_images', 'packages').get(pk=instance.pk)
            response_serializer = GymDetailSerializer(instance)

            # Notify admins when a gym_owner creates a new gym
            try:
                if getattr(request.user, "role_code", None) == "gym_owner":
                    admin_users = User.objects.filter(custom_role__code="admin")
                    for admin in admin_users:
                        NotificationService.send_notification(
                            user=admin,
                            type=NotificationType.NEW_GYM_CREATED,
                            title="New Gym Added",
                            message=(
                                f"{request.user.full_name or request.user.email} "
                                f"has added a new gym: {instance.name}"
                            ),
                            metadata={
                                "gym_id": instance.id,
                                "gym_name": instance.name,
                                "owner_id": request.user.id,
                                "owner_email": request.user.email,
                            },
                            related_object_type="gym",
                            related_object_id=instance.id,
                        )
            except Exception as e:
                import logging as _logging
                _logging.getLogger(__name__).error(
                    f"Failed to notify admins about new gym: {str(e)}"
                )

            return self._format_success_response(
                data=response_serializer.data,
                message="Gym created successfully",
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
                message="Failed to create gym",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            # Check if user owns the gym (unless admin)
            if getattr(request.user, 'role_code', None) != 'admin' and instance.owner != request.user:
                raise PermissionDenied("You can only update your own gyms")
            serializer = self.get_serializer(instance, data=request.data, partial=False)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return self._format_success_response(
                data=None,
                message="Gym updated successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Gym not found",
                errors={"detail": "The requested gym does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except PermissionDenied as e:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": str(e)},
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
                message="Failed to update gym",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def partial_update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            if getattr(request.user, 'role_code', None) != 'admin' and instance.owner != request.user:
                raise PermissionDenied("You can only update your own gyms")
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return self._format_success_response(
                data=None,
                message="Gym updated successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Gym not found",
                errors={"detail": "The requested gym does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except PermissionDenied as e:
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": str(e)},
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
                message="Failed to update gym",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def increment_views(self, request, pk=None):
        """
        Increment view count for a gym.
        Prevents double-counting by throttling views per user/IP (10 minutes).
        Uses atomic operations to prevent race conditions.
        """
        from apps.real_estate.utils import should_increment_view, increment_view_count_atomic
        
        try:
            gym_obj = self.get_object()
            
            # Check if this view should be counted (throttling: 10 minutes per user/IP)
            if not should_increment_view(request, 'gym', gym_obj.id, throttle_hours=30/60):
                # View already counted recently, return current count without incrementing
                return self._format_success_response(
                    data={"views_count": gym_obj.views_count, "already_counted": True},
                    message="View already counted recently"
                )
            
            # Increment view count atomically to prevent race conditions
            new_count = increment_view_count_atomic(gym_obj)
            
            return self._format_success_response(
                data={"views_count": new_count, "already_counted": False},
                message="View count incremented successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Gym not found",
                errors={"detail": "The requested gym does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to increment view count",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        """Approve a gym (admin only)"""
        if getattr(request.user, 'role_code', None) != 'admin':
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only admins can approve gyms"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        try:
            gym_obj = self.get_object()
            if gym_obj.is_approved:
                serializer = GymApproveRejectSerializer(gym_obj)
                return self._format_error_response(
                    message="Gym is already approved",
                    errors={"detail": "This gym has already been approved"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            gym_obj.is_approved = True
            gym_obj.rejection_note = None
            
            # Set approved_at and expires_at if not already set
            from django.utils import timezone
            from datetime import timedelta
            from django.conf import settings
            
            if not gym_obj.approved_at:
                gym_obj.approved_at = timezone.now()
                
                # Set expiration date using paid validity period
                # Paid gym - use paid validity period
                validity_days = getattr(settings, 'PAID_VALIDITY_DAYS', 90)
                
                gym_obj.expires_at = timezone.now() + timedelta(days=validity_days)
            
            # Set gym as active when approved (if expires_at is in the future)
            if gym_obj.expires_at and gym_obj.expires_at > timezone.now():
                gym_obj.is_active = True
            
            gym_obj.save(update_fields=['is_approved', 'rejection_note', 'approved_at', 'expires_at', 'is_active'])
            
            # Create notification for the gym owner using hybrid DB + FCM approach
            from apps.notifications.services import NotificationService
            from apps.notifications.models import NotificationType
            
            NotificationService.send_notification(
                user=gym_obj.owner,
                type=NotificationType.GYM_APPROVED,
                title='Gym Approved',
                message=f'Your gym "{gym_obj.name}" has been approved and is now visible to all users.',
                metadata={
                    'gym_id': gym_obj.id,
                    'gym_name': gym_obj.name,
                },
                related_object_type='gym',
                related_object_id=gym_obj.id
            )
            
            serializer = GymApproveRejectSerializer(gym_obj)
            return self._format_success_response(
                data=serializer.data,
                message="Gym approved successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Gym not found",
                errors={"detail": "The requested gym does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to approve gym",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        """Reject a gym (admin only)"""
        if getattr(request.user, 'role_code', None) != 'admin':
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only admins can reject gyms"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        try:
            gym_obj = self.get_object()
            rejection_note = request.data.get('rejection_note', '').strip() if request.data else None
            gym_obj.is_approved = False
            gym_obj.rejection_note = rejection_note if rejection_note else None
            gym_obj.save(update_fields=['is_approved', 'rejection_note'])
            
            # Create notification for the gym owner using hybrid DB + FCM approach
            from apps.notifications.services import NotificationService
            from apps.notifications.models import NotificationType
            
            metadata = {
                'gym_id': gym_obj.id,
                'gym_name': gym_obj.name,
            }
            if rejection_note:
                metadata['rejection_note'] = rejection_note
            
            NotificationService.send_notification(
                user=gym_obj.owner,
                type=NotificationType.GYM_REJECTED,
                title='Gym Rejected',
                message=f'Your gym "{gym_obj.name}" has been rejected.{" Reason: " + rejection_note if rejection_note else " Please review the gym details and try again."}',
                metadata=metadata,
                related_object_type='gym',
                related_object_id=gym_obj.id
            )
            
            serializer = GymApproveRejectSerializer(gym_obj)
            return self._format_success_response(
                data=serializer.data,
                message="Gym rejected successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Gym not found",
                errors={"detail": "The requested gym does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to reject gym",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
