import django_filters
from apps.offers.models import Offer


class OfferFilter(django_filters.FilterSet):
    """
    Filter for Offer model
    """
    # Role filter - filter by role code
    role = django_filters.CharFilter(field_name='custom_role__code', lookup_expr='iexact')
    
    # Price filters
    min_price = django_filters.NumberFilter(field_name='price_per_listing', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price_per_listing', lookup_expr='lte')
    
    # Validity filters
    min_validity_months = django_filters.NumberFilter(field_name='validity_months', lookup_expr='gte')
    max_validity_months = django_filters.NumberFilter(field_name='validity_months', lookup_expr='lte')
    
    # Cashback filters
    min_cashback = django_filters.NumberFilter(field_name='cashback', lookup_expr='gte')
    max_cashback = django_filters.NumberFilter(field_name='cashback', lookup_expr='lte')
    
    class Meta:
        model = Offer
        fields = [
            'role',
            'min_price', 'max_price',
            'min_validity_months', 'max_validity_months',
            'min_cashback', 'max_cashback',
        ]
