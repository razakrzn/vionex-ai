from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime
from apps.offers.models import Offer
from .serializers import (
    OfferListSerializer,
    OfferDetailSerializer,
    OfferCreateSerializer,
    OfferUpdateSerializer,
)
from .filters import OfferFilter


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


class OfferViewSet(BaseViewSet):
    """
    ViewSet for managing offers with CRUD operations
    GET operations (list, retrieve) are read-only for all users.
    Write operations (create, update, delete) require authentication.
    """
    queryset = Offer.objects.all()
    # Set empty authentication classes by default - will be set dynamically
    authentication_classes = []
    
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = OfferFilter
    
    search_fields = [
        'price_per_listing',
        'custom_role__name',
        'custom_role__code',
    ]
    
    ordering_fields = [
        'custom_role',
        'price_per_listing',
        'validity_months',
        'cashback',
        'created_at',
        'updated_at',
    ]
    ordering = ['-created_at']

    def initialize_request(self, request, *args, **kwargs):
        """
        Override to set authentication classes based on request method
        """
        # Set authentication classes based on request method
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            # No authentication for read operations
            self.authentication_classes = []
        else:
            # Use default JWT authentication for write operations
            from config.authentication import CustomJWTAuthentication
            self.authentication_classes = [CustomJWTAuthentication]
        
        return super().initialize_request(request, *args, **kwargs)

    def get_permissions(self):
        """
        Permissions:
        - list, retrieve: Read-only for all users (AllowAny)
        - create, update, partial_update, destroy: Authenticated users only (IsAuthenticated)
        """
        # For read operations, allow anyone
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        # For write operations, require authentication
        return [IsAuthenticated()]

    def get_queryset(self):
        return Offer.objects.select_related('custom_role').all().order_by('-created_at')

    def get_serializer_class(self):
        if self.action == "create":
            return OfferCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return OfferUpdateSerializer
        elif self.action == "list":
            return OfferListSerializer
        return OfferDetailSerializer
