from rest_framework import viewsets, status, permissions
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from django.core.exceptions import ValidationError as DjangoValidationError
from datetime import datetime
from apps.countries.models import Country
from apps.countries.services import google_places_service, rest_countries_service
from .serializers import (
    CountryListSerializer,
    CountryDetailSerializer,
    CountryCreateSerializer,
)


class CountryViewSet(viewsets.ModelViewSet):
    queryset = Country.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """
        Custom permissions for CountryViewSet:
        - google_places_countries (POST): Authentication required
        - Everything else: AllowAny (default)
        """
        if self.action == 'google_places_countries' and self.request.method == 'POST':
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_queryset(self):
        """Return a fresh queryset ordered by latest created (using id)"""
        return Country.objects.all().order_by('-id')

    def get_serializer_class(self):
        if self.action == "create":
            return CountryCreateSerializer
        elif self.action == "list":
            return CountryListSerializer
        return CountryDetailSerializer

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
                message="Fetched countries successfully"
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to fetch countries",
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
                message="Country created successfully",
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
                message="Failed to create country",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return self._format_success_response(
                data=serializer.data,
                message="Country retrieved successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Country not found",
                errors={"detail": "The requested country does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to retrieve country",
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
                message="Country updated successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Country not found",
                errors={"detail": "The requested country does not exist"},
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
                message="Failed to update country",
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
                message="Country updated successfully"
            )
        except NotFound:
            return self._format_error_response(
                message="Country not found",
                errors={"detail": "The requested country does not exist"},
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
                message="Failed to update country",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return self._format_success_response(
                data=None,
                message="Country deleted successfully",
                status_code=status.HTTP_200_OK
            )
        except NotFound:
            return self._format_error_response(
                message="Country not found",
                errors={"detail": "The requested country does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to delete country",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get', 'post'], url_path='google-places')
    def google_places_countries(self, request):
        """
        Handle both GET and POST requests for countries from REST Countries API.
        
        GET: Fetch all countries from REST Countries API
            Query Parameters:
                search (optional): Filter countries by name or code
        
        POST: Import countries from REST Countries API
            Request Body:
                country_codes (required): List of country codes to import (e.g., ["AE", "IN", "SA"])
                or
                import_all (optional): If true, import all countries (use with caution)
        """
        if request.method == 'GET':
            # Fetch countries from API
            try:
                # Get all countries from REST Countries API
                countries = rest_countries_service.get_all_countries()
                
                # Optional search filter
                search_query = request.query_params.get('search', '').strip()
                if search_query:
                    search_lower = search_query.lower()
                    countries = [
                        country for country in countries
                        if search_lower in country['name'].lower() or 
                           search_lower in country['code'].lower()
                    ]
                
                return self._format_success_response(
                    data=countries,
                    message=f"Fetched {len(countries)} countries from REST Countries API"
                )
                
            except Exception as e:
                return self._format_error_response(
                    message="Failed to fetch countries from API",
                    errors={"detail": str(e)},
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        elif request.method == 'POST':
            # Import countries from API
            try:
                country_codes = request.data.get('country_codes', [])
                import_all = request.data.get('import_all', False)
                
                if not country_codes and not import_all:
                    return self._format_error_response(
                        message="Either 'country_codes' or 'import_all' must be provided",
                        errors={"country_codes": "This field is required if import_all is false"},
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
                
                imported_count = 0
                updated_count = 0
                errors = []
                
                if import_all:
                    # Fetch all countries
                    countries_data = rest_countries_service.get_all_countries()
                else:
                    # Fetch only specified countries
                    countries_data = []
                    for code in country_codes:
                        country_data = rest_countries_service.get_country_by_code(code)
                        if country_data:
                            countries_data.append(country_data)
                        else:
                            errors.append(f"Country with code '{code}' not found")
                
                # Import countries
                for country_data in countries_data:
                    try:
                        country, created = Country.objects.update_or_create(
                            code=country_data['code'],
                            defaults={
                                'name': country_data['name'],
                                'phone_code': country_data['phone_code'],
                                'currency': country_data['currency']
                            }
                        )
                        
                        if created:
                            imported_count += 1
                        else:
                            updated_count += 1
                            
                    except Exception as e:
                        errors.append(f"Error importing {country_data.get('name', 'Unknown')}: {str(e)}")
                
                response_data = {
                    'imported': imported_count,
                    'updated': updated_count,
                    'total': len(countries_data)
                }
                
                if errors:
                    response_data['errors'] = errors
                
                return self._format_success_response(
                    data=response_data,
                    message=f"Successfully imported {imported_count} new countries and updated {updated_count} existing countries",
                    status_code=status.HTTP_201_CREATED
                )
                
            except Exception as e:
                return self._format_error_response(
                    message="Failed to import countries from API",
                    errors={"detail": str(e)},
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )


class DynamicStateViewSet(viewsets.ViewSet):
    """
    ViewSet for fetching states/emirates dynamically from Google Places API.
    States are not stored in the database - they're fetched on-demand.
    """
    
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
    
    def list(self, request):
        """
        Get states/emirates for a country.
        
        Query Parameters:
            country_code (required): ISO 3166-1 alpha-2 country code (e.g., 'AE', 'IN', 'SA')
        """
        try:
            country_code = request.query_params.get('country_code')
            if not country_code:
                return self._format_error_response(
                    message="country_code parameter is required",
                    errors={"country_code": "This field is required"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate country exists in our database
            try:
                country = Country.objects.get(code=country_code.upper())
            except Country.DoesNotExist:
                return self._format_error_response(
                    message=f"Country with code '{country_code}' not found in database",
                    errors={"country_code": "Country must be added by admin first"},
                    status_code=status.HTTP_404_NOT_FOUND
                )
            
            # Fetch states from Google Places API
            states = google_places_service.get_states_for_country(country_code.upper())
            
            return self._format_success_response(
                data=states,
                message=f"Fetched states for {country.name} successfully"
            )
            
        except Exception as e:
            return self._format_error_response(
                message="Failed to fetch states",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DynamicCityViewSet(viewsets.ViewSet):
    """
    ViewSet for fetching cities dynamically from Google Places API.
    Cities are not stored in the database - they're fetched on-demand.
    """
    
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
    
    def list(self, request):
        """
        Get cities for a state/emirate.
        
        Query Parameters:
            country_code (required): ISO 3166-1 alpha-2 country code (e.g., 'AE', 'IN')
            state (required): Name of the state/emirate (e.g., 'Dubai', 'Abu Dhabi')
        """
        try:
            country_code = request.query_params.get('country_code')
            state_name = request.query_params.get('state')
            
            if not country_code:
                return self._format_error_response(
                    message="country_code parameter is required",
                    errors={"country_code": "This field is required"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            if not state_name:
                return self._format_error_response(
                    message="state parameter is required",
                    errors={"state": "This field is required"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate country exists in our database
            try:
                country = Country.objects.get(code=country_code.upper())
            except Country.DoesNotExist:
                return self._format_error_response(
                    message=f"Country with code '{country_code}' not found in database",
                    errors={"country_code": "Country must be added by admin first"},
                    status_code=status.HTTP_404_NOT_FOUND
                )
            
            # Fetch cities from Google Places API
            cities = google_places_service.get_cities_for_state(
                country_code.upper(),
                state_name
            )
            
            return self._format_success_response(
                data=cities,
                message=f"Fetched cities for {state_name}, {country.name} successfully"
            )
            
        except Exception as e:
            return self._format_error_response(
                message="Failed to fetch cities",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

