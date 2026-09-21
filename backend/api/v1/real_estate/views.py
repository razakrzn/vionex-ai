from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.filters import SearchFilter, OrderingFilter
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.dateparse import parse_date
from django.db import models
from django.http import QueryDict
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import Distance
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime
import logging
from apps.real_estate.models import (
    AssetType,
    PropertyType,
    Purpose,
    FurnishingStatus,
    CompletionStatus,
    OccupantType,
    Amenity,
    Property,
    PropertyArchive,
    PropertyContact,
    ListingStatus,
)
from apps.users.models import User
from apps.payments.utils import can_user_create_property
from apps.notifications.models import NotificationType
from apps.notifications.services import NotificationService
from .filters import PropertyFilter
from .serializers import (
    AssetTypeListSerializer,
    AssetTypeDetailSerializer,
    AssetTypeCreateSerializer,
    PropertyTypeListSerializer,
    PropertyTypeDetailSerializer,
    PropertyTypeCreateSerializer,
    PurposeListSerializer,
    PurposeDetailSerializer,
    PurposeCreateSerializer,
    FurnishingStatusListSerializer,
    FurnishingStatusDetailSerializer,
    FurnishingStatusCreateSerializer,
    CompletionStatusListSerializer,
    CompletionStatusDetailSerializer,
    CompletionStatusCreateSerializer,
    OccupantTypeListSerializer,
    OccupantTypeDetailSerializer,
    OccupantTypeCreateSerializer,
    AmenityListSerializer,
    AmenityDetailSerializer,
    AmenityCreateSerializer,
    PropertyListSerializer,
    PropertyDetailSerializer,
    PropertyCreateSerializer,
    PropertyApproveRejectSerializer,
    PropertyListingStatusSerializer,
    PropertyContactCreateSerializer,
    PropertyContactListSerializer,
    PropertyArchiveListSerializer,
    PropertyArchiveDetailSerializer,
)


logger = logging.getLogger(__name__)


class BaseViewSet(viewsets.ModelViewSet):
    """Base ViewSet with common response formatting"""
    permission_classes = [IsAuthenticated]
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK, extra_meta=None):
        """Helper method to format success responses"""
        meta = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "status_code": status_code
        }
        # Merge in any extra metadata (e.g., pagination)
        if extra_meta:
            meta.update(extra_meta)

        response_data = {
            "success": True,
            "message": message,
            "data": data,
            "meta": meta
        }

        return Response(response_data, status=status_code)

    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        response_data = {
            "success": False,
            "message": message,
            "errors": errors or {},
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
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


class BaseReadOnlyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only base viewset that matches the API's response format.
    """

    permission_classes = [IsAuthenticated]

    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK, extra_meta=None):
        meta = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "status_code": status_code
        }
        if extra_meta:
            meta.update(extra_meta)

        response_data = {
            "success": True,
            "message": message,
            "data": data,
            "meta": meta
        }
        return Response(response_data, status=status_code)

    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        return Response(
            {
                "success": False,
                "message": message,
                "errors": errors or {},
                "meta": {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "status_code": status_code
                },
            },
            status=status_code,
        )

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
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return self._format_success_response(
                data=serializer.data,
                message=f"{self.queryset.model.__name__} retrieved successfully",
            )
        except NotFound:
            return self._format_error_response(
                message=f"{self.queryset.model.__name__} not found",
                errors={"detail": f"The requested {self.queryset.model.__name__.lower()} does not exist"},
                status_code=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return self._format_error_response(
                message=f"Failed to retrieve {self.queryset.model.__name__.lower()}",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AssetTypeViewSet(BaseViewSet):
    queryset = AssetType.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """
        Allow unauthenticated access for list and retrieve actions
        Require authentication for all other actions
        """
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """Return a fresh queryset ordered by latest created"""
        return AssetType.objects.all().order_by('-created_at')

    def get_serializer_class(self):
        if self.action == "create":
            return AssetTypeCreateSerializer
        elif self.action == "list":
            return AssetTypeListSerializer
        return AssetTypeDetailSerializer


class PropertyTypeViewSet(BaseViewSet):
    queryset = PropertyType.objects.select_related('asset_type').all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """
        Allow unauthenticated access for list and retrieve actions
        Require authentication for all other actions
        """
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return PropertyTypeCreateSerializer
        elif self.action == "list":
            return PropertyTypeListSerializer
        return PropertyTypeDetailSerializer

    def get_queryset(self):
        """Filter by asset_type if asset_type_id is provided"""
        queryset = PropertyType.objects.select_related('asset_type').all().order_by('-created_at')
        asset_type_id = self.request.query_params.get('asset_type_id', None)
        if asset_type_id:
            queryset = queryset.filter(asset_type_id=asset_type_id)
        return queryset


class PurposeViewSet(BaseViewSet):
    queryset = Purpose.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """
        Allow unauthenticated access for list and retrieve actions
        Require authentication for all other actions
        """
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """Return a fresh queryset ordered by latest created"""
        return Purpose.objects.all().order_by('-created_at')

    def get_serializer_class(self):
        if self.action == "create":
            return PurposeCreateSerializer
        elif self.action == "list":
            return PurposeListSerializer
        return PurposeDetailSerializer


class FurnishingStatusViewSet(BaseViewSet):
    queryset = FurnishingStatus.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """
        Allow unauthenticated access for list and retrieve actions
        Require authentication for all other actions
        """
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """Return a fresh queryset ordered by latest created"""
        return FurnishingStatus.objects.all().order_by('-created_at')

    def get_serializer_class(self):
        if self.action == "create":
            return FurnishingStatusCreateSerializer
        elif self.action == "list":
            return FurnishingStatusListSerializer
        return FurnishingStatusDetailSerializer


class CompletionStatusViewSet(BaseViewSet):
    queryset = CompletionStatus.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """
        Allow unauthenticated access for list and retrieve actions
        Require authentication for all other actions
        """
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """Return a fresh queryset ordered by latest created"""
        return CompletionStatus.objects.all().order_by('-created_at')

    def get_serializer_class(self):
        if self.action == "create":
            return CompletionStatusCreateSerializer
        elif self.action == "list":
            return CompletionStatusListSerializer
        return CompletionStatusDetailSerializer


class OccupantTypeViewSet(BaseViewSet):
    queryset = OccupantType.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """
        Allow unauthenticated access for list and retrieve actions
        Require authentication for all other actions
        """
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """Return a fresh queryset ordered by latest created"""
        return OccupantType.objects.all().order_by('-created_at')

    def get_serializer_class(self):
        if self.action == "create":
            return OccupantTypeCreateSerializer
        elif self.action == "list":
            return OccupantTypeListSerializer
        return OccupantTypeDetailSerializer


class AmenityViewSet(BaseViewSet):
    queryset = Amenity.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """
        Allow unauthenticated access for list and retrieve actions
        Require authentication for all other actions
        """
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """Return a fresh queryset ordered by latest created"""
        return Amenity.objects.all().order_by('-created_at')

    def get_serializer_class(self):
        if self.action == "create":
            return AmenityCreateSerializer
        elif self.action == "list":
            return AmenityListSerializer
        return AmenityDetailSerializer


class PropertyArchiveViewSet(BaseReadOnlyViewSet):
    """
    Read-only access to archived properties.

    - Admins can view all archived properties.
    - Non-admin users can only view archived properties that belong to them
      (matched via owner_info JSON: owner_info.id == request.user.id).
    """

    queryset = PropertyArchive.objects.all().order_by("-archived_at")

    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = [
        "title",
        "description",
        "address",
        "place",
        "building_name",
        "developer_name",
        "project_name",
        "property_type_name",
        "purpose_name",
    ]
    ordering_fields = [
        "archived_at",
        "deleted_at",
        "price",
        "created_at",
    ]
    ordering = ["-archived_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return PropertyArchiveListSerializer
        return PropertyArchiveDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if getattr(user, "role", None) != "admin":
            queryset = queryset.filter(owner_info__id=user.id)

        # Optional filters
        original_id = self.request.query_params.get("original_id")
        if original_id:
            queryset = queryset.filter(original_id=original_id)

        owner_id = self.request.query_params.get("owner_id")
        if owner_id and getattr(user, "role", None) == "admin":
            queryset = queryset.filter(owner_info__id=owner_id)

        archived_from = self.request.query_params.get("archived_from")
        if archived_from:
            parsed = parse_date(archived_from)
            if parsed:
                queryset = queryset.filter(archived_at__date__gte=parsed)

        archived_to = self.request.query_params.get("archived_to")
        if archived_to:
            parsed = parse_date(archived_to)
            if parsed:
                queryset = queryset.filter(archived_at__date__lte=parsed)

        return queryset

    def get_object(self):
        obj = super().get_object()
        user = self.request.user

        if getattr(user, "role", None) == "admin":
            return obj

        if (obj.owner_info or {}).get("id") != user.id:
            raise NotFound("Archived property not found")

        return obj


class PropertyViewSet(BaseViewSet):
    queryset = Property.objects.select_related(
        'property_type', 'property_type__asset_type',
        'purpose', 'furnishing_status', 'completion_status',
        'occupant_type', 'owner'
    ).prefetch_related('amenities', 'gallery_images').all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    # Add filter backends
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = PropertyFilter
    
    # Configure search fields
    search_fields = [
        'title',
        'description',
        'address',
        'place',
        'building_name',
        'property_type__name',
        'property_type__asset_type__name',
        'purpose__name',
        'developer_name',
        'project_name',
    ]
    
    # Configure ordering fields
    ordering_fields = [
        'price',
        'created_at',
        'updated_at',
        'views_count',
        'area_sqm',
    ]
    ordering = ['-created_at']  # Default ordering

    def get_permissions(self):
        """
        Allow unauthenticated access for list and retrieve actions (to view approved properties)
        Require authentication for all other actions
        """
        filter_actions = [
            'list', 'retrieve', 'nationalities',
            'filter_property_types', 'filter_asset_types', 'filter_purposes',
            'filter_furnishing_statuses', 'filter_completion_statuses',
            'filter_occupant_types', 'filter_occupants_count', 'filter_amenities',
            'filter_bedrooms', 'filter_bathrooms', 'filter_rent_periods',
            'filter_listing_statuses', 'filter_currencies', 'increment_views'
        ]
        if self.action in filter_actions:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return PropertyCreateSerializer
        elif self.action == "list":
            return PropertyListSerializer
        return PropertyDetailSerializer

    def get_queryset(self):
        """Filter properties with advanced search and radius search support"""
        # Remove deprecated parameters IMMEDIATELY to prevent any processing
        # my_properties and show_all are COMPLETELY REMOVED and IGNORED
        if hasattr(self.request, 'query_params') and isinstance(self.request.query_params, QueryDict):
            self.request.query_params._mutable = True
            if 'my_properties' in self.request.query_params:
                del self.request.query_params['my_properties']
            if 'show_all' in self.request.query_params:
                del self.request.query_params['show_all']
            self.request.query_params._mutable = False
        
        queryset = Property.objects.select_related(
            'property_type', 'property_type__asset_type',
            'purpose', 'furnishing_status', 'completion_status',
            'occupant_type', 'owner'
        ).prefetch_related('amenities', 'gallery_images').all()
        
        # Always exclude soft-deleted properties from main queries (unless explicitly requested)
        # Trash/restore endpoints will handle deleted properties separately
        queryset = queryset.filter(is_deleted=False)
        
        # Role-based filtering (my_properties and show_all parameters are COMPLETELY IGNORED)
        # This filtering is based ONLY on user role, not query parameters
        if not self.request.user.is_authenticated:
            # Unauthenticated users: only active, approved, and AVAILABLE properties
            queryset = queryset.filter(
                is_active=True, 
                is_approved=True,
                listing_status=ListingStatus.AVAILABLE
            )
        elif getattr(self.request.user, 'role_code', None) == 'admin':
            # Admin: return all non-deleted properties (no filtering)
            pass
        elif getattr(self.request.user, 'role_code', None) == 'owner':
            # Owner: return ONLY their own properties (ALWAYS, my_properties parameter is IGNORED)
            # Owners can see all their properties regardless of listing_status
            queryset = queryset.filter(owner=self.request.user)
        else:
            # Seeker (or any other role): return active, approved, and AVAILABLE properties
            queryset = queryset.filter(
                is_active=True, 
                is_approved=True,
                listing_status=ListingStatus.AVAILABLE
            )
        
        # Handle radius search (Near Me / Near specific location)
        # Query params: lat, lng, radius (in km, default: 5 km)
        # Works for any coordinates - user's current location or a specific place
        lat = self.request.query_params.get('lat', None)
        lng = self.request.query_params.get('lng', None)
        radius = self.request.query_params.get('radius', None)  # in kilometers
        
        if lat and lng:
            try:
                lat = float(lat)
                lng = float(lng)
                # Default radius is 5 km if not provided
                radius_km = float(radius) if radius else 5.0
                
                # Create point from coordinates
                search_location = Point(lng, lat, srid=4326)
                
                # Filter properties within radius (using PostGIS distance)
                queryset = queryset.filter(
                    location__distance_lte=(search_location, D(km=radius_km))
                ).annotate(
                    distance=Distance('location', search_location)
                ).order_by('distance')
            except (ValueError, TypeError) as e:
                # Invalid coordinates or radius, skip radius filtering
                pass
        
        return queryset

    def filter_queryset(self, queryset):
        """
        Override to remove deprecated my_properties and show_all parameters
        before DjangoFilterBackend processes them.
        These parameters are completely ignored - filtering is based on user role only.
        """
        # Remove deprecated parameters from request query params BEFORE filter backend processes them
        if hasattr(self.request, 'query_params') and isinstance(self.request.query_params, QueryDict):
            # Make QueryDict mutable to remove deprecated params
            self.request.query_params._mutable = True
            
            # Remove deprecated parameters (completely ignore them)
            if 'my_properties' in self.request.query_params:
                del self.request.query_params['my_properties']
            if 'show_all' in self.request.query_params:
                del self.request.query_params['show_all']
            
            # Also ensure owner_id is not set based on my_properties
            # (in case any code tries to convert my_properties to owner_id)
            # Role-based filtering in get_queryset() already handles owner filtering for owners
            
            # Make QueryDict immutable again
            self.request.query_params._mutable = False
        
        # Call parent filter_queryset which applies DjangoFilterBackend
        # At this point, my_properties and show_all are removed, so they won't be processed
        return super().filter_queryset(queryset)

    def get_object(self):
        """
        Override to allow unauthenticated users and seekers to retrieve approved and AVAILABLE properties only.
        Owners can see their own properties regardless of listing_status.
        Excludes soft-deleted properties unless explicitly accessing trash endpoints.
        """
        obj = super().get_object()
        
        # Exclude soft-deleted properties (unless this is a trash/restore action)
        if not self.action in ['restore', 'my_trash'] and obj.is_deleted:
            raise NotFound("Property not found")
        
        # Check if user is authenticated
        if not self.request.user.is_authenticated:
            # Unauthenticated users: only allow access to approved, active, and AVAILABLE properties
            if not (obj.is_approved and obj.is_active and obj.listing_status == ListingStatus.AVAILABLE):
                raise NotFound("Property not found")
        elif getattr(self.request.user, 'role_code', None) == 'admin':
            # Admin: can see all properties
            pass
        elif getattr(self.request.user, 'role_code', None) == 'owner':
            # Owner: can see their own properties regardless of listing_status
            if obj.owner != self.request.user:
                raise NotFound("Property not found")
        else:
            # Seeker (or any other role): only allow access to approved, active, and AVAILABLE properties
            if not (obj.is_approved and obj.is_active and obj.listing_status == ListingStatus.AVAILABLE):
                raise NotFound("Property not found")
        
        return obj

    def create(self, request, *args, **kwargs):
        """
        Override create to check payment status and verification status before creating property.
        Payment/subscription must be completed BEFORE property creation.
        is_approved is separate - it's for admin validation, not payment requirement.
        """
        from django.conf import settings

        # Debug logging for 413 (Payload Too Large) investigation
        # Logs request Content-Length and total uploaded file sizes.
        try:
            raw_content_length = (
                request.META.get("CONTENT_LENGTH")
                or request.headers.get("Content-Length")
            )
            content_length = int(raw_content_length) if raw_content_length else None
        except (TypeError, ValueError):
            content_length = None

        total_file_bytes = 0
        files_summary = []
        try:
            # request.FILES is a MultiValueDict; iterate to capture all files
            for field_name, file_list in request.FILES.lists():
                for upload in file_list:
                    size = getattr(upload, "size", 0) or 0
                    total_file_bytes += size
                    files_summary.append(
                        {
                            "field": field_name,
                            "name": getattr(upload, "name", None),
                            "size_bytes": size,
                        }
                    )
        except Exception as e:
            logger.exception(
                "Error while inspecting uploaded files for property create: %s", e
            )

        total_file_mb = (
            float(total_file_bytes) / (1024 * 1024) if total_file_bytes else 0.0
        )
        header_mb = (
            float(content_length) / (1024 * 1024) if content_length else None
        )

        max_file_mb = getattr(settings, "MEDIA_MAX_FILE_SIZE_MB", None)

        logger.info(
            "Property create upload debug: content_length_bytes=%s (~%.2f MB), "
            "total_file_bytes=%s (~%.2f MB), max_single_file_mb=%s, num_files=%s, files=%s",
            content_length,
            header_mb or 0.0,
            total_file_bytes,
            total_file_mb,
            max_file_mb,
            len(files_summary),
            files_summary,
        )

        # Check verification status for sellers (owners)
        if getattr(request.user, 'role_code', None) == 'owner':
            # Rejected or inactive users cannot create properties
            if request.user.verification_status == 'REJECTED' or not request.user.is_active:
                return self._format_error_response(
                    message="Account verification required",
                    errors={"verification": "Your account verification is required to create properties. Please contact support if you believe this is an error."},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            # Pending users cannot create properties until approved
            if request.user.verification_status == 'PENDING':
                return self._format_error_response(
                    message="Account verification pending",
                    errors={"verification": "Your account verification is pending. Please wait for admin approval before creating properties."},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            # Payment/subscription is REQUIRED before property creation
            # For INDIVIDUAL: Must have completed payment
            # For COMPANY/AGENT/ADVERTISER: Must have active subscription
            can_create, message = can_user_create_property(request.user)
            if not can_create:
                return self._format_error_response(
                    message=message,
                    errors={"payment": message},
                    status_code=status.HTTP_402_PAYMENT_REQUIRED
                )
        
        # Call parent create method (from BaseViewSet)
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Use perform_create which sets the owner automatically
            self.perform_create(serializer)
            instance = serializer.instance
            
            # Handle subscription tracking for property creation
            if getattr(request.user, 'role_code', None) == 'owner':
                from apps.payments.models import Subscription
                
                # Set property is_active based on subscription status
                if hasattr(request.user, 'subscription'):
                    subscription = request.user.subscription
                    # Property should be active only if subscription is valid
                    instance.is_active = subscription.is_valid()
                    instance.save(update_fields=['is_active'])
                    
                    # Increment subscription usage_count for all seller types
                    subscription.increment_usage()
                else:
                    # If no subscription, set property as inactive
                    instance.is_active = False
                    instance.save(update_fields=['is_active'])
            
            # Refresh instance - Property-specific prefetching
            instance.refresh_from_db()
            instance = Property.objects.select_related(
                'property_type', 'property_type__asset_type',
                'purpose', 'furnishing_status', 'completion_status',
                'occupant_type', 'owner'
            ).prefetch_related('amenities', 'gallery_images').get(pk=instance.pk)
            
            # Use detail serializer for response
            response_serializer = PropertyDetailSerializer(instance)

            # Notify admins when an owner creates a new property
            try:
                if getattr(request.user, "role_code", None) == "owner":
                    admin_users = User.objects.filter(custom_role__code="admin")
                    for admin in admin_users:
                        NotificationService.send_notification(
                            user=admin,
                            type=NotificationType.NEW_PROPERTY_CREATED,
                            title="New Property Added",
                            message=(
                                f"{request.user.full_name or request.user.email} "
                                f"has added a new property named {instance.title} to the platform."
                            ),
                            metadata={
                                "property_id": instance.id,
                                "property_title": instance.title,
                                "owner_id": request.user.id,
                                "owner_email": request.user.email,
                            },
                            related_object_type="property",
                            related_object_id=instance.id,
                        )
            except Exception as e:
                # Do not block property creation if notifications fail
                import logging as _logging
                _logging.getLogger(__name__).error(
                    f"Failed to notify admins about new property: {str(e)}"
                )

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

    def perform_create(self, serializer):
        """Set the owner to the current user"""
        serializer.save(owner=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy to use soft delete instead of hard delete.
        Properties are moved to trash instead of being permanently deleted.
        This method behaves the same as the soft_delete action for consistency.
        """
        try:
            instance = self.get_object()
            
            # Check if user is the property owner
            if instance.owner != request.user and getattr(request.user, 'role_code', None) != 'admin':
                return self._format_error_response(
                    message="Permission denied",
                    errors={"detail": "Only the property owner can delete this property"},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            # Check if already deleted
            if instance.is_deleted:
                return self._format_error_response(
                    message="Property already deleted",
                    errors={"detail": "This property has already been deleted"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Soft delete the property
            from django.utils import timezone
            instance.is_deleted = True
            instance.deleted_at = timezone.now()
            instance.save(update_fields=['is_deleted', 'deleted_at'])
            
            # Refresh from database
            instance.refresh_from_db()
            
            # Use detail serializer for response (same as soft_delete action)
            serializer = PropertyDetailSerializer(instance)
            
            return self._format_success_response(
                data=serializer.data,
                message="Property moved to trash successfully. It will be permanently deleted after 30 days.",
                status_code=status.HTTP_200_OK
            )
        except NotFound:
            return self._format_error_response(
                message="Property not found",
                errors={"detail": "The requested property does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to delete property",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        """Override to return no data in response"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=False)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            # Return success response with no data
            return self._format_success_response(
                data=None,
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
        """Override to return no data in response"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            # Return success response with no data
            return self._format_success_response(
                data=None,
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

    @action(detail=True, methods=['post'])
    def increment_views(self, request, pk=None):
        """
        Increment view count for a property.
        Prevents double-counting by throttling views per user/IP (10 minutes).
        Uses atomic operations to prevent race conditions.
        """
        from apps.real_estate.utils import should_increment_view, increment_view_count_atomic
        
        try:
            property_obj = self.get_object()
            
            # Check if this view should be counted (throttling: 10 minutes per user/IP)
            if not should_increment_view(request, 'property', property_obj.id, throttle_hours=30/60):
                # View already counted recently, return current count without incrementing
                return self._format_success_response(
                    data={"views_count": property_obj.views_count, "already_counted": True},
                    message="View already counted recently"
                )
            
            # Increment view count atomically to prevent race conditions
            new_count = increment_view_count_atomic(property_obj)
            
            return self._format_success_response(
                data={"views_count": new_count, "already_counted": False},
                message="View count incremented successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Property not found",
                errors={"detail": "The requested property does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to increment view count",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='nationalities')
    def nationalities(self, request):
        """
        Get all unique nationalities from properties.
        GET /api/v1/real-estate/properties/nationalities/
        
        Returns a list of all distinct nationality values that have been used in properties.
        """
        try:
            # Get all distinct, non-null, non-empty nationality values
            nationalities = Property.objects.filter(
                nationality__isnull=False,
                is_deleted=False
            ).exclude(
                nationality=''
            ).values_list('nationality', flat=True).distinct().order_by('nationality')
            
            # Convert to list and remove any remaining empty strings
            nationality_list = [n for n in nationalities if n and n.strip()]
            
            return self._format_success_response(
                data=nationality_list,
                message="Nationalities retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve nationalities",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='property-types')
    def filter_property_types(self, request):
        """Get all property types used in properties"""
        try:
            property_types = Property.objects.filter(
                property_type__isnull=False,
                is_deleted=False
            ).values('property_type_id', 'property_type__name').distinct().order_by('property_type__name')
            
            data = [{"id": pt['property_type_id'], "name": pt['property_type__name']} for pt in property_types]
            
            return self._format_success_response(
                data=data,
                message="Property types retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve property types",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='asset-types')
    def filter_asset_types(self, request):
        """Get all asset types used in properties"""
        try:
            asset_types = Property.objects.filter(
                property_type__asset_type__isnull=False,
                is_deleted=False
            ).values('property_type__asset_type_id', 'property_type__asset_type__name').distinct().order_by('property_type__asset_type__name')
            
            data = [{"id": at['property_type__asset_type_id'], "name": at['property_type__asset_type__name']} for at in asset_types]
            
            return self._format_success_response(
                data=data,
                message="Asset types retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve asset types",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='purposes')
    def filter_purposes(self, request):
        """Get all purposes used in properties"""
        try:
            purposes = Property.objects.filter(
                purpose__isnull=False,
                is_deleted=False
            ).values('purpose_id', 'purpose__name').distinct().order_by('purpose__name')
            
            data = [{"id": p['purpose_id'], "name": p['purpose__name']} for p in purposes]
            
            return self._format_success_response(
                data=data,
                message="Purposes retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve purposes",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='furnishing-statuses')
    def filter_furnishing_statuses(self, request):
        """Get all furnishing statuses used in properties"""
        try:
            furnishing_statuses = Property.objects.filter(
                furnishing_status__isnull=False,
                is_deleted=False
            ).values('furnishing_status_id', 'furnishing_status__name').distinct().order_by('furnishing_status__name')
            
            data = [{"id": fs['furnishing_status_id'], "name": fs['furnishing_status__name']} for fs in furnishing_statuses]
            
            return self._format_success_response(
                data=data,
                message="Furnishing statuses retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve furnishing statuses",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='completion-statuses')
    def filter_completion_statuses(self, request):
        """Get all completion statuses used in properties"""
        try:
            completion_statuses = Property.objects.filter(
                completion_status__isnull=False,
                is_deleted=False
            ).values('completion_status_id', 'completion_status__name').distinct().order_by('completion_status__name')
            
            data = [{"id": cs['completion_status_id'], "name": cs['completion_status__name']} for cs in completion_statuses]
            
            return self._format_success_response(
                data=data,
                message="Completion statuses retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve completion statuses",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='occupant-types')
    def filter_occupant_types(self, request):
        """Get all occupant types used in properties"""
        try:
            occupant_types = Property.objects.filter(
                occupant_type__isnull=False,
                is_deleted=False
            ).values('occupant_type_id', 'occupant_type__name').distinct().order_by('occupant_type__name')
            
            data = [{"id": ot['occupant_type_id'], "name": ot['occupant_type__name']} for ot in occupant_types]
            
            return self._format_success_response(
                data=data,
                message="Occupant types retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve occupant types",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='occupants-count')
    def filter_occupants_count(self, request):
        """Get all unique occupants count values from properties"""
        try:
            occupants_count = Property.objects.filter(
                occupants_count__isnull=False,
                is_deleted=False
            ).values_list('occupants_count', flat=True).distinct().order_by('occupants_count')
            
            data = sorted([int(oc) for oc in occupants_count if oc is not None])
            
            return self._format_success_response(
                data=data,
                message="Occupants count values retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve occupants count",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='amenities')
    def filter_amenities(self, request):
        """Get all amenities used in properties"""
        try:
            amenities = Amenity.objects.filter(
                properties__is_deleted=False
            ).distinct().values('id', 'name').order_by('name')
            
            data = [{"id": a['id'], "name": a['name']} for a in amenities]
            
            return self._format_success_response(
                data=data,
                message="Amenities retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve amenities",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='bedrooms')
    def filter_bedrooms(self, request):
        """Get all unique bedroom values from properties"""
        try:
            bedrooms = Property.objects.filter(
                bedrooms__isnull=False,
                is_deleted=False
            ).values_list('bedrooms', flat=True).distinct().order_by('bedrooms')
            
            data = sorted([int(b) for b in bedrooms if b is not None])
            
            return self._format_success_response(
                data=data,
                message="Bedroom values retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve bedroom values",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='bathrooms')
    def filter_bathrooms(self, request):
        """Get all unique bathroom values from properties"""
        try:
            bathrooms = Property.objects.filter(
                bathrooms__isnull=False,
                is_deleted=False
            ).values_list('bathrooms', flat=True).distinct().order_by('bathrooms')
            
            data = sorted([int(b) for b in bathrooms if b is not None])
            
            return self._format_success_response(
                data=data,
                message="Bathroom values retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve bathroom values",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='rent-periods')
    def filter_rent_periods(self, request):
        """Get all unique rent period values from properties"""
        try:
            rent_periods = Property.objects.filter(
                rent_period__isnull=False,
                is_deleted=False
            ).exclude(
                rent_period=''
            ).values_list('rent_period', flat=True).distinct().order_by('rent_period')
            
            data = [rp for rp in rent_periods if rp and rp.strip()]
            
            return self._format_success_response(
                data=data,
                message="Rent periods retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve rent periods",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='listing-statuses')
    def filter_listing_statuses(self, request):
        """Get all unique listing status values from properties"""
        try:
            listing_statuses = Property.objects.filter(
                listing_status__isnull=False,
                is_deleted=False
            ).exclude(
                listing_status=''
            ).values_list('listing_status', flat=True).distinct().order_by('listing_status')
            
            data = [ls for ls in listing_statuses if ls and ls.strip()]
            
            return self._format_success_response(
                data=data,
                message="Listing statuses retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve listing statuses",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='currencies')
    def filter_currencies(self, request):
        """Get all unique currency values from properties"""
        try:
            currencies = Property.objects.filter(
                currency__isnull=False,
                is_deleted=False
            ).exclude(
                currency=''
            ).values_list('currency', flat=True).distinct().order_by('currency')
            
            data = [c for c in currencies if c and c.strip()]
            
            return self._format_success_response(
                data=data,
                message="Currencies retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve currencies",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a property"""
        try:
            property_obj = self.get_object()
            
            # Check if already approved
            if property_obj.is_approved:
                serializer = PropertyApproveRejectSerializer(property_obj)
                return self._format_error_response(
                    message="Property is already approved",
                    errors={"detail": "This property has already been approved"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            property_obj.is_approved = True
            # Automatically set listing_status to AVAILABLE when approved
            property_obj.listing_status = ListingStatus.AVAILABLE
            # Clear rejection note when approving
            property_obj.rejection_note = None
            
            # Set approved_at and expires_at if not already set
            from django.utils import timezone
            from datetime import timedelta
            from django.conf import settings
            
            if not property_obj.approved_at:
                property_obj.approved_at = timezone.now()
                
                # Set expiration date using paid validity period
                # Paid property - use paid validity period
                validity_days = getattr(settings, 'PAID_VALIDITY_DAYS', 90)
                
                property_obj.expires_at = timezone.now() + timedelta(days=validity_days)
            
            property_obj.save(update_fields=['is_approved', 'listing_status', 'rejection_note', 'approved_at', 'expires_at'])
            
            # Create notification for the property owner using hybrid DB + FCM approach
            from apps.notifications.services import NotificationService
            from apps.notifications.models import NotificationType
            
            NotificationService.send_notification(
                user=property_obj.owner,
                type=NotificationType.PROPERTY_APPROVED,
                title='Property Approved',
                message=f'Your property "{property_obj.title}" has been approved and is now visible to all users.',
                metadata={
                    'property_id': property_obj.id,
                    'property_title': property_obj.title,
                },
                related_object_type='property',
                related_object_id=property_obj.id
            )
            
            serializer = PropertyApproveRejectSerializer(property_obj)
            return self._format_success_response(
                data=serializer.data,
                message="Property approved successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Property not found",
                errors={"detail": "The requested property does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to approve property",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject a property
        
        POST /api/v1/real-estate/properties/{id}/reject/
        Body: {
            "rejection_note": "Optional note explaining why the property was rejected"
        }
        
        Note: Following user verification pattern - allows rejection anytime,
        even if already rejected. Each rejection creates a new notification.
        """
        try:
            property_obj = self.get_object()
            
            # Get rejection note from request body (optional)
            rejection_note = request.data.get('rejection_note', '').strip() if request.data else None
            
            # Update property status (following user verification pattern - no duplicate check)
            property_obj.is_approved = False
            # Automatically set listing_status to OFF_MARKET when rejected
            property_obj.listing_status = ListingStatus.OFF_MARKET
            # Store rejection note in property model (like user verification pattern)
            property_obj.rejection_note = rejection_note if rejection_note else None
            property_obj.save(update_fields=['is_approved', 'listing_status', 'rejection_note'])
            
            # Always create notification (following user verification pattern)
            # This allows admin to reject again with updated notes if needed
            # Use hybrid DB + FCM approach
            from apps.notifications.services import NotificationService
            from apps.notifications.models import NotificationType
            
            metadata = {
                'property_id': property_obj.id,
                'property_title': property_obj.title,
            }
            if rejection_note:
                metadata['rejection_note'] = rejection_note
            
            NotificationService.send_notification(
                user=property_obj.owner,
                type=NotificationType.PROPERTY_REJECTED,
                title='Property Rejected',
                message=f'Your property "{property_obj.title}" has been rejected.{" Reason: " + rejection_note if rejection_note else " Please review the property details and try again."}',
                metadata=metadata,
                related_object_type='property',
                related_object_id=property_obj.id
            )
            
            serializer = PropertyApproveRejectSerializer(property_obj)
            return self._format_success_response(
                data=serializer.data,
                message="Property rejected successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Property not found",
                errors={"detail": "The requested property does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to reject property",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='contact-owner')
    def contact_owner(self, request):
        """
        Create a contact request when a seeker or owner wants to contact a property owner
        POST /api/v1/real-estate/properties/contact-owner/
        
        Body:
        {
            "property_id": 1,
            "contact_method": "call"  // or "whatsapp"
        }
        """
        try:
            serializer = PropertyContactCreateSerializer(
                data=request.data,
                context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            
            # Check if user is a seeker or owner
            role_code = getattr(request.user, 'role_code', None)
            if role_code not in ['seeker', 'owner']:
                return self._format_error_response(
                    message="Only seekers and owners can contact property owners",
                    errors={"detail": "This endpoint is only available for seekers and owners"},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            contact = serializer.save()
            
            # Return response with contact details
            response_serializer = PropertyContactListSerializer(contact)
            
            return self._format_success_response(
                data=response_serializer.data,
                message="Contact request created successfully",
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
                message="Failed to create contact request",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='my-contacts')
    def my_contacts(self, request):
        """
        Get all contact requests made by the current user (seeker or owner)
        GET /api/v1/real-estate/properties/my-contacts/
        """
        try:
            role_code = getattr(request.user, 'role_code', None)
            if role_code not in ['seeker', 'owner']:
                return self._format_error_response(
                    message="Only seekers and owners can view their contact requests",
                    errors={"detail": "This endpoint is only available for seekers and owners"},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            contacts = PropertyContact.objects.filter(
                seeker=request.user
            ).select_related('property', 'property__owner', 'seeker').order_by('-created_at')
            
            serializer = PropertyContactListSerializer(contacts, many=True)
            
            return self._format_success_response(
                data=serializer.data,
                message="Contact requests retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve contact requests",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='property-contacts/(?P<property_id>[^/.]+)')
    def property_contacts(self, request, property_id=None):
        """
        Get all contact requests for a specific property (for property owners)
        GET /api/v1/real-estate/properties/property-contacts/{property_id}/
        """
        try:
            # Get the property
            try:
                property_obj = Property.objects.get(pk=property_id)
            except Property.DoesNotExist:
                return self._format_error_response(
                    message="Property not found",
                    errors={"detail": "The requested property does not exist"},
                    status_code=status.HTTP_404_NOT_FOUND
                )
            
            # Check if user is the owner of the property
            if request.user != property_obj.owner and getattr(request.user, 'role_code', None) != 'admin':
                return self._format_error_response(
                    message="You can only view contacts for your own properties",
                    errors={"detail": "Permission denied"},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            contacts = PropertyContact.objects.filter(
                property=property_obj
            ).select_related('seeker', 'property', 'property__owner').order_by('-created_at')
            
            serializer = PropertyContactListSerializer(contacts, many=True)
            
            return self._format_success_response(
                data=serializer.data,
                message="Property contact requests retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve property contacts",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='all-contacts')
    def all_contacts(self, request):
        """
        Get all contact requests (Admin only)
        GET /api/v1/real-estate/properties/all-contacts/
        
        Query Parameters:
        - property_id: Filter by property ID
        - seeker_id: Filter by seeker ID
        - contact_method: Filter by contact method (call/whatsapp)
        - date_from: Filter contacts from this date (YYYY-MM-DD)
        - date_to: Filter contacts until this date (YYYY-MM-DD)
        """
        try:
            # Check if user is admin
            if getattr(request.user, 'role_code', None) != 'admin':
                return self._format_error_response(
                    message="Only admins can view all contact requests",
                    errors={"detail": "This endpoint is only available for admins"},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            # Start with all contacts
            contacts = PropertyContact.objects.all().select_related(
                'seeker', 'property', 'property__owner'
            ).order_by('-created_at')
            
            # Filter by property_id if provided
            property_id = request.query_params.get('property_id', None)
            if property_id:
                contacts = contacts.filter(property_id=property_id)
            
            # Filter by seeker_id if provided
            seeker_id = request.query_params.get('seeker_id', None)
            if seeker_id:
                contacts = contacts.filter(seeker_id=seeker_id)
            
            # Filter by contact_method if provided
            contact_method = request.query_params.get('contact_method', None)
            if contact_method:
                contacts = contacts.filter(contact_method=contact_method)
            
            # Filter by date range if provided
            date_from = request.query_params.get('date_from', None)
            date_to = request.query_params.get('date_to', None)
            if date_from:
                try:
                    date_from_parsed = parse_date(date_from)
                    if date_from_parsed:
                        contacts = contacts.filter(created_at__date__gte=date_from_parsed)
                except (ValueError, TypeError):
                    pass
            if date_to:
                try:
                    date_to_parsed = parse_date(date_to)
                    if date_to_parsed:
                        contacts = contacts.filter(created_at__date__lte=date_to_parsed)
                except (ValueError, TypeError):
                    pass
            
            serializer = PropertyContactListSerializer(contacts, many=True)
            
            return self._format_success_response(
                data=serializer.data,
                message=f"Retrieved {len(serializer.data)} contact request(s) successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve all contact requests",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='update-listing-status')
    def update_listing_status(self, request, pk=None):
        """
        Update the listing status of a property.
        Only property owners can update the listing status.
        
        POST /api/v1/real-estate/properties/{id}/update-listing-status/
        Body: {
            "listing_status": "AVAILABLE"  // or "SOLD", "RENTED", "OFF_MARKET"
        }
        
        Rules:
        - Only property owner can change listing_status
        - Property must be approved to set AVAILABLE, SOLD, or RENTED
        - Can always set to OFF_MARKET regardless of approval status
        """
        try:
            property_obj = self.get_object()
            
            # Check if user is the property owner
            if property_obj.owner != request.user and getattr(request.user, 'role_code', None) != 'admin':
                return self._format_error_response(
                    message="Permission denied",
                    errors={"detail": "Only the property owner can update listing status"},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            # Validate listing_status in request data
            listing_status = request.data.get('listing_status', None)
            if not listing_status:
                return self._format_error_response(
                    message="Validation error",
                    errors={"listing_status": "This field is required"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate listing_status value
            valid_statuses = [choice[0] for choice in ListingStatus.CHOICES]
            if listing_status not in valid_statuses:
                return self._format_error_response(
                    message="Validation error",
                    errors={
                        "listing_status": f"Invalid listing status. Must be one of: {', '.join(valid_statuses)}"
                    },
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate business rules
            # If property is not approved, only allow OFF_MARKET
            if not property_obj.is_approved and listing_status != ListingStatus.OFF_MARKET:
                return self._format_error_response(
                    message="Validation error",
                    errors={
                        "listing_status": "Listing status can only be changed when property is approved. "
                                         "Unapproved properties must have OFF_MARKET status."
                    },
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Track old status before updating
            old_listing_status = property_obj.listing_status

            # Update listing_status
            property_obj.listing_status = listing_status
            property_obj.save(update_fields=['listing_status'])
            
            # Refresh from database to get updated data
            property_obj.refresh_from_db()
            
            # Notify admins when an owner marks a property as SOLD
            try:
                # Only when changed from AVAILABLE -> SOLD by an owner
                if (
                    old_listing_status == ListingStatus.AVAILABLE
                    and property_obj.listing_status == ListingStatus.SOLD
                    and getattr(request.user, "role_code", None) == "owner"
                ):
                    admin_users = User.objects.filter(custom_role__code="admin")
                    for admin in admin_users:
                        NotificationService.send_notification(
                            user=admin,
                            type=NotificationType.PROPERTY_SOLD,
                            title="Property Successfully Sold",
                            message=(
                                f"Great news! The property {property_obj.title} has been sold by the owner {request.user.full_name or request.user.email} "
                                
                            ),
                            metadata={
                                "property_id": property_obj.id,
                                "property_title": property_obj.title,
                                "owner_id": request.user.id,
                                "owner_email": request.user.email,
                            },
                            related_object_type="property",
                            related_object_id=property_obj.id,
                        )
            except Exception as e:
                import logging as _logging
                _logging.getLogger(__name__).error(
                    f"Failed to notify admins about property sold status: {str(e)}"
                )

            # Use serializer for response
            serializer = PropertyListingStatusSerializer(property_obj)
            
            return self._format_success_response(
                data=serializer.data,
                message=f"Listing status updated to {listing_status} successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Property not found",
                errors={"detail": "The requested property does not exist"},
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
                message="Failed to update listing status",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='delete')
    def soft_delete(self, request, pk=None):
        """
        Soft delete a property (move to trash).
        Only property owners can delete their properties.
        
        POST /api/v1/real-estate/properties/{id}/delete/
        
        The property will be marked as deleted but not permanently removed.
        It can be restored within 30 days using the restore endpoint.
        """
        try:
            property_obj = self.get_object()
            
            # Check if user is the property owner
            if property_obj.owner != request.user and getattr(request.user, 'role_code', None) != 'admin':
                return self._format_error_response(
                    message="Permission denied",
                    errors={"detail": "Only the property owner can delete this property"},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            # Check if already deleted
            if property_obj.is_deleted:
                return self._format_error_response(
                    message="Property already deleted",
                    errors={"detail": "This property has already been deleted"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Soft delete the property
            from django.utils import timezone
            property_obj.is_deleted = True
            property_obj.deleted_at = timezone.now()
            property_obj.save(update_fields=['is_deleted', 'deleted_at'])
            
            # Refresh from database
            property_obj.refresh_from_db()
            
            # Use detail serializer for response
            serializer = PropertyDetailSerializer(property_obj)
            
            return self._format_success_response(
                data=serializer.data,
                message="Property moved to trash successfully. It will be permanently deleted after 30 days."
            )
        except NotFound:
            return self._format_error_response(
                message="Property not found",
                errors={"detail": "The requested property does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to delete property",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        """
        Restore a soft-deleted property from trash.
        Only property owners can restore their deleted properties.
        
        POST /api/v1/real-estate/properties/{id}/restore/
        
        The property will be restored and can be viewed again in the main list.
        """
        try:
            # Get object without filtering deleted items for restore action
            property_obj = Property.objects.get(pk=pk)
            
            # Check if user is the property owner
            if property_obj.owner != request.user and getattr(request.user, 'role_code', None) != 'admin':
                return self._format_error_response(
                    message="Permission denied",
                    errors={"detail": "Only the property owner can restore this property"},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            # Check if property is deleted
            if not property_obj.is_deleted:
                return self._format_error_response(
                    message="Property is not deleted",
                    errors={"detail": "This property is not in the trash"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Restore the property
            property_obj.is_deleted = False
            property_obj.deleted_at = None
            property_obj.save(update_fields=['is_deleted', 'deleted_at'])
            
            # Refresh from database
            property_obj.refresh_from_db()
            
            # Use detail serializer for response
            serializer = PropertyDetailSerializer(property_obj)
            
            return self._format_success_response(
                data=serializer.data,
                message="Property restored successfully"
            )
        except Property.DoesNotExist:
            return self._format_error_response(
                message="Property not found",
                errors={"detail": "The requested property does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to restore property",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='my-trash')
    def my_trash(self, request):
        """
        Get all soft-deleted properties for the current user (trash can).
        Only property owners can view their own deleted properties.
        
        GET /api/v1/real-estate/properties/my-trash/
        
        Returns a list of properties that have been soft-deleted.
        These properties can be restored within 30 days.
        """
        try:
            # Only owners can view their trash
            role_code = getattr(request.user, 'role_code', None)
            if role_code not in ['owner', 'admin']:
                return self._format_error_response(
                    message="Permission denied",
                    errors={"detail": "Only property owners can view their trash"},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            # Get deleted properties for the current user
            if role_code == 'admin':
                # Admin can see all deleted properties
                deleted_properties = Property.objects.filter(
                    is_deleted=True
                ).select_related(
                    'property_type', 'property_type__asset_type',
                    'purpose', 'furnishing_status', 'completion_status',
                    'occupant_type', 'owner'
                ).prefetch_related('amenities', 'gallery_images').order_by('-deleted_at')
            else:
                # Owners can only see their own deleted properties
                deleted_properties = Property.objects.filter(
                    owner=request.user,
                    is_deleted=True
                ).select_related(
                    'property_type', 'property_type__asset_type',
                    'purpose', 'furnishing_status', 'completion_status',
                    'occupant_type', 'owner'
                ).prefetch_related('amenities', 'gallery_images').order_by('-deleted_at')
            
            # Apply pagination if configured
            page = self.paginate_queryset(deleted_properties)
            if page is not None:
                serializer = PropertyListSerializer(page, many=True, context={'request': request})
                
                # Build pagination meta
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
                    message="Deleted properties retrieved successfully",
                    extra_meta={"pagination": pagination_meta},
                )
            
            # Fallback: no pagination
            serializer = PropertyListSerializer(deleted_properties, many=True, context={'request': request})
            
            return self._format_success_response(
                data=serializer.data,
                message="Deleted properties retrieved successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve deleted properties",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


