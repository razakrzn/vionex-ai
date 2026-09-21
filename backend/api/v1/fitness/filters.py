import django_filters
from django.db.models import Q
from apps.fitness.models import Gym


class GymFilter(django_filters.FilterSet):
    """
    Advanced filtering for Gym model
    """
    # Gym type filter
    gym_type_id = django_filters.NumberFilter(field_name='gym_type_id')
    
    # Location filters
    address = django_filters.CharFilter(field_name='address', lookup_expr='icontains')
    
    # Facilities filter (multiple facilities - gym must have ALL)
    facility_ids = django_filters.BaseInFilter(field_name='facilities__id', lookup_expr='in')
    
    # Gender filter
    gender_allowed = django_filters.CharFilter(field_name='gender_allowed', lookup_expr='iexact')
    
    # Timing filters
    is_24_hours = django_filters.BooleanFilter(field_name='is_24_hours')
    
    # Status filters
    is_approved = django_filters.BooleanFilter(field_name='is_approved')
    is_active = django_filters.BooleanFilter(field_name='is_active')
    
    # Rejection note filter
    is_reject_note = django_filters.BooleanFilter(method='filter_rejection_note')
    
    def filter_rejection_note(self, queryset, name, value):
        """
        Filter gyms based on whether they have a rejection note.
        - is_reject_note=true: gyms with rejection_note (not null and not empty)
        - is_reject_note=false: gyms without rejection_note (null or empty)
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
            # Return gyms that have a rejection note (not null and not empty)
            return queryset.exclude(
                Q(rejection_note__isnull=True) | Q(rejection_note='')
            )
        else:
            # Return gyms that don't have a rejection note (null or empty)
            return queryset.filter(
                Q(rejection_note__isnull=True) | Q(rejection_note='')
            )
    
    # Owner filter
    owner_id = django_filters.NumberFilter(field_name='owner_id')
    
    # Owner name filter
    owner_name = django_filters.CharFilter(field_name='owner__full_name', lookup_expr='icontains')
    
    # Owner email filter
    owner_email = django_filters.CharFilter(field_name='owner__email', lookup_expr='icontains')
    
    class Meta:
        model = Gym
        fields = [
            'gym_type_id',
            'address',
            'facility_ids',
            'gender_allowed',
            'is_24_hours',
            'is_approved', 'is_active', 'is_reject_note',
            'owner_id', 'owner_name', 'owner_email',
        ]
