import django_filters
from django.db.models import Q
from apps.real_estate.models import Property, ListingStatus


class PropertyFilter(django_filters.FilterSet):
    """
    Advanced filtering for Property model
    """
    # Price range filters
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    
    # Property details filters
    bedrooms = django_filters.NumberFilter(field_name='bedrooms', lookup_expr='exact')
    bathrooms = django_filters.NumberFilter(field_name='bathrooms', lookup_expr='exact')
    min_bedrooms = django_filters.NumberFilter(field_name='bedrooms', lookup_expr='gte')
    min_bathrooms = django_filters.NumberFilter(field_name='bathrooms', lookup_expr='gte')
    
    # Area filters
    min_area = django_filters.NumberFilter(field_name='area_sqm', lookup_expr='gte')
    max_area = django_filters.NumberFilter(field_name='area_sqm', lookup_expr='lte')
    
    # Relationship filters
    property_type_id = django_filters.NumberFilter(field_name='property_type_id')
    asset_type_id = django_filters.NumberFilter(field_name='property_type__asset_type_id')
    purpose_id = django_filters.NumberFilter(field_name='purpose_id')
    furnishing_status_id = django_filters.NumberFilter(field_name='furnishing_status_id')
    completion_status_id = django_filters.NumberFilter(field_name='completion_status_id')
    occupant_type_id = django_filters.NumberFilter(field_name='occupant_type_id')
    occupants_count = django_filters.NumberFilter(field_name='occupants_count')
    
    # Amenities filter (multiple amenities - property must have ALL)
    amenity_ids = django_filters.BaseInFilter(field_name='amenities__id', lookup_expr='in')
    
    # Location text filter
    place = django_filters.CharFilter(field_name='place', lookup_expr='icontains')
    address = django_filters.CharFilter(field_name='address', lookup_expr='icontains')
    
    # Nationality filter
    nationality = django_filters.CharFilter(field_name='nationality', lookup_expr='iexact')
    
    # Currency filter
    currency = django_filters.CharFilter(field_name='currency', lookup_expr='iexact')
    
    # Rent period filter (for rental properties)
    rent_period = django_filters.CharFilter(field_name='rent_period', lookup_expr='iexact')
    
    # Status filters
    is_approved = django_filters.BooleanFilter(field_name='is_approved')
    is_active = django_filters.BooleanFilter(field_name='is_active')
    # Accept case-insensitive values like: sold, SOLD, off-market, off_market, off market
    listing_status = django_filters.CharFilter(method='filter_listing_status')
    
    # Rejection note filter
    is_reject_note = django_filters.BooleanFilter(method='filter_rejection_note')
    
    def filter_listing_status(self, queryset, name, value):
        """
        Filter properties by listing_status in a case-insensitive way.
        
        Accepted inputs (examples):
        - sold / SOLD
        - rented / RENTED
        - available / AVAILABLE
        - off_market / off-market / off market / OFF_MARKET
        """
        if value is None:
            return queryset
        
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                return queryset
            normalized = normalized.replace('-', '_').replace(' ', '_').upper()
        else:
            normalized = str(value).strip().replace('-', '_').replace(' ', '_').upper()
        
        allowed = {
            ListingStatus.AVAILABLE,
            ListingStatus.SOLD,
            ListingStatus.RENTED,
            ListingStatus.OFF_MARKET,
        }
        
        if normalized not in allowed:
            # Invalid filter value → return no results (safe default)
            return queryset.none()
        
        return queryset.filter(listing_status=normalized)
    
    def filter_rejection_note(self, queryset, name, value):
        """
        Filter properties based on whether they have a rejection note.
        - is_reject_note=true: properties with rejection_note (not null and not empty)
        - is_reject_note=false: properties without rejection_note (null or empty)
        """
        # Handle None case (filter not provided)
        if value is None:
            return queryset
        
        # BooleanFilter should convert string values, but handle explicitly
        # Convert string "true"/"false" to boolean
        if isinstance(value, str):
            bool_value = value.lower() in ('true', '1', 'yes', 'on')
        else:
            # For actual boolean or other types
            bool_value = bool(value)
        
        if bool_value:
            # Return properties that have a rejection note (not null and not empty)
            return queryset.exclude(
                Q(rejection_note__isnull=True) | Q(rejection_note='')
            )
        else:
            # Return properties that don't have a rejection note (null or empty)
            return queryset.filter(
                Q(rejection_note__isnull=True) | Q(rejection_note='')
            )
    
    # Owner filter
    owner_id = django_filters.NumberFilter(field_name='owner_id')
    
    # Owner seller type filter (INDIVIDUAL, COMPANY, AGENT, ADVERTISER)
    owner_seller_type = django_filters.CharFilter(field_name='owner__seller_type', lookup_expr='iexact')
    
    # Owner company name filter
    owner_company_name = django_filters.CharFilter(field_name='owner__company_name', lookup_expr='icontains')
    
    # Owner name filter (for individuals/agents)
    owner_name = django_filters.CharFilter(field_name='owner__full_name', lookup_expr='icontains')
    
    class Meta:
        model = Property
        fields = [
            'min_price', 'max_price',
            'bedrooms', 'bathrooms', 'min_bedrooms', 'min_bathrooms',
            'min_area', 'max_area',
            'property_type_id', 'asset_type_id', 'purpose_id',
            'furnishing_status_id', 'completion_status_id',
            'occupant_type_id', 'occupants_count',
            'amenity_ids', 'place', 'address', 'nationality', 'currency', 'rent_period',
            'is_approved', 'is_active', 'listing_status', 'is_reject_note', 'owner_id',
            'owner_seller_type', 'owner_company_name', 'owner_name',
        ]

