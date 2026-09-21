from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils.dateparse import parse_date
from datetime import datetime
from apps.ads.models import Ad, AdGallery
from .serializers import (
    AdListSerializer,
    AdDetailSerializer,
    AdCreateSerializer,
)


class BaseViewSet(viewsets.ModelViewSet):
    """Base ViewSet with common response formatting"""
    permission_classes = [IsAuthenticated]
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        response_data = {
            "success": True,
            "message": message,
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }
        # Only include data key if data is not None
        if data is not None:
            response_data["data"] = data
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
            serializer = self.get_serializer(queryset, many=True)
            return self._format_success_response(
                data=serializer.data,
                message=f"{self.queryset.model.__name__}s retrieved successfully"
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
            
            # Refresh instance with prefetching
            instance = Ad.objects.prefetch_related('gallery_images').get(pk=instance.pk)
            
            # Use the detail serializer for the response
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


class AdViewSet(BaseViewSet):
    queryset = Ad.objects.prefetch_related('gallery_images').all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """
        Allow unauthenticated access for list and retrieve actions (to view approved ads)
        Require authentication for all other actions
        """
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return AdCreateSerializer
        elif self.action == "list":
            return AdListSerializer
        return AdDetailSerializer

    def get_queryset(self):
        """Filter ads based on query parameters"""
        queryset = Ad.objects.prefetch_related('gallery_images').all().order_by('-created_date')
        
        # For unauthenticated users, only show approved ads
        if not self.request.user.is_authenticated:
            queryset = queryset.filter(verification_status=Ad.VerificationStatus.APPROVED)
        
        # Filter by verification_status
        verification_status = self.request.query_params.get('verification_status', None)
        if verification_status:
            queryset = queryset.filter(verification_status=verification_status)
        
        # Filter by billing_cycle
        billing_cycle = self.request.query_params.get('billing_cycle', None)
        if billing_cycle:
            queryset = queryset.filter(billing_cycle=billing_cycle)
        
        # Filter by location (partial match)
        location = self.request.query_params.get('location', None)
        if location:
            queryset = queryset.filter(location__icontains=location)
        
        return queryset

    def get_object(self):
        """
        Override to allow unauthenticated users to retrieve approved ads only
        """
        obj = super().get_object()
        
        # If user is not authenticated, only allow access to approved ads
        if not self.request.user.is_authenticated:
            if obj.verification_status != Ad.VerificationStatus.APPROVED:
                raise NotFound("Ad not found")
        
        return obj

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an ad"""
        try:
            ad_obj = self.get_object()
            
            # Check if already approved
            if ad_obj.verification_status == Ad.VerificationStatus.APPROVED:
                return self._format_error_response(
                    message="Ad is already approved",
                    errors={"detail": "This ad has already been approved"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            ad_obj.verification_status = Ad.VerificationStatus.APPROVED
            ad_obj.save(update_fields=['verification_status'])
            
            serializer = self.get_serializer(ad_obj)
            return self._format_success_response(
                data=serializer.data,
                message="Ad approved successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Ad not found",
                errors={"detail": "The requested ad does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to approve ad",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an ad"""
        try:
            ad_obj = self.get_object()
            
            # Check if already rejected
            if ad_obj.verification_status == Ad.VerificationStatus.REJECTED:
                return self._format_error_response(
                    message="Ad is already rejected",
                    errors={"detail": "This ad has already been rejected"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            ad_obj.verification_status = Ad.VerificationStatus.REJECTED
            ad_obj.save(update_fields=['verification_status'])
            
            serializer = self.get_serializer(ad_obj)
            return self._format_success_response(
                data=serializer.data,
                message="Ad rejected successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Ad not found",
                errors={"detail": "The requested ad does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to reject ad",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


