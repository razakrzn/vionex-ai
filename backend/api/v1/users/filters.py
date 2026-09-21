import django_filters
from apps.users.models import User


class UserFilter(django_filters.FilterSet):
    """
    Advanced filtering for User model
    """
    # Role filter
    role = django_filters.CharFilter(
        field_name='custom_role__code',
        help_text="Filter by role code (custom_role.code), e.g. owner, seeker, gym_owner, admin"
    )
    
    # Verification status filter
    verification_status = django_filters.ChoiceFilter(
        choices=User.VerificationStatus.choices,
        help_text="Filter by verification status: PENDING, APPROVED, or REJECTED"
    )
    
    # Seller type filter
    seller_type = django_filters.ChoiceFilter(
        choices=User.SellerTypes.choices,
        help_text="Filter by seller type: INDIVIDUAL, COMPANY, AGENT, or ADVERTISER"
    )
    
    # Location filters
    country_id = django_filters.NumberFilter(
        field_name='country_id',
        help_text="Filter by country ID"
    )
    state = django_filters.CharFilter(
        field_name='state',
        lookup_expr='icontains',
        help_text="Filter by state/emirate name (case-insensitive partial match)"
    )
    city = django_filters.CharFilter(
        field_name='city',
        lookup_expr='icontains',
        help_text="Filter by city name (case-insensitive partial match)"
    )
    
    # Custom role filter
    custom_role_id = django_filters.NumberFilter(
        field_name='custom_role_id',
        help_text="Filter by custom role ID"
    )
    
    # Mobile verification filter
    is_mobile_verified = django_filters.BooleanFilter(
        help_text="Filter by mobile verification status: true or false"
    )
    
    # Search filters (text search - for specific field filtering)
    email = django_filters.CharFilter(
        field_name='email',
        lookup_expr='icontains',
        help_text="Search by email (case-insensitive partial match)"
    )
    
    full_name = django_filters.CharFilter(
        field_name='full_name',
        lookup_expr='icontains',
        help_text="Search by full name (case-insensitive partial match)"
    )
    
    mobile_number = django_filters.CharFilter(
        field_name='mobile_number',
        lookup_expr='icontains',
        help_text="Search by mobile number (case-insensitive partial match)"
    )
    
    whatsapp_number = django_filters.CharFilter(
        field_name='whatsapp_number',
        lookup_expr='icontains',
        help_text="Search by WhatsApp number (case-insensitive partial match)"
    )
    
    address = django_filters.CharFilter(
        field_name='address',
        lookup_expr='icontains',
        help_text="Search by address (case-insensitive partial match)"
    )
    
    company_name = django_filters.CharFilter(
        field_name='company_name',
        lookup_expr='icontains',
        help_text="Search by company name (case-insensitive partial match)"
    )
    
    license_number = django_filters.CharFilter(
        field_name='license_number',
        lookup_expr='icontains',
        help_text="Search by license number (case-insensitive partial match)"
    )
    
    emirates_id_number = django_filters.CharFilter(
        field_name='emirates_id_number',
        lookup_expr='icontains',
        help_text="Search by Emirates ID number (case-insensitive partial match)"
    )
    
    # Agents filter (owners with seller_type=AGENT)
    is_agent = django_filters.BooleanFilter(
        method='filter_agents',
        help_text="Filter for agents (owners with seller_type=AGENT): true or false"
    )
    
    # Company filter (owners with seller_type=COMPANY)
    is_company = django_filters.BooleanFilter(
        method='filter_company',
        help_text="Filter for companies (owners with seller_type=COMPANY): true or false"
    )
    
    # Individual filter (owners with seller_type=INDIVIDUAL)
    is_individual = django_filters.BooleanFilter(
        method='filter_individual',
        help_text="Filter for individuals (owners with seller_type=INDIVIDUAL): true or false"
    )
    
    # Rejection note filter
    has_rejection_note = django_filters.BooleanFilter(
        method='filter_rejection_note',
        help_text="Filter users with rejection notes: true or false"
    )
    
    def filter_agents(self, queryset, name, value):
        """
        Filter users who are agents (owners with seller_type=AGENT).
        - is_agent=true: returns owners with seller_type=AGENT
        - is_agent=false: returns all other users
        """
        if value is None:
            return queryset
        
        # Convert string "true"/"false" to boolean
        if isinstance(value, str):
            bool_value = value.lower() in ('true', '1', 'yes', 'on')
        else:
            bool_value = bool(value)
        
        if bool_value:
            # Return owners with seller_type=AGENT
            return queryset.filter(
                custom_role__code='owner',
                seller_type=User.SellerTypes.AGENT
            )
        else:
            # Return all users except agents
            from django.db.models import Q
            return queryset.exclude(
                Q(custom_role__code='owner', seller_type=User.SellerTypes.AGENT)
            )
    
    def filter_company(self, queryset, name, value):
        """
        Filter users who are companies (owners with seller_type=COMPANY).
        - is_company=true: returns owners with seller_type=COMPANY
        - is_company=false: returns all other users
        """
        if value is None:
            return queryset
        
        # Convert string "true"/"false" to boolean
        if isinstance(value, str):
            bool_value = value.lower() in ('true', '1', 'yes', 'on')
        else:
            bool_value = bool(value)
        
        if bool_value:
            # Return owners with seller_type=COMPANY
            return queryset.filter(
                custom_role__code='owner',
                seller_type=User.SellerTypes.COMPANY
            )
        else:
            # Return all users except companies
            from django.db.models import Q
            return queryset.exclude(
                Q(custom_role__code='owner', seller_type=User.SellerTypes.COMPANY)
            )
    
    def filter_individual(self, queryset, name, value):
        """
        Filter users who are individuals (owners with seller_type=INDIVIDUAL).
        - is_individual=true: returns owners with seller_type=INDIVIDUAL
        - is_individual=false: returns all other users
        """
        if value is None:
            return queryset
        
        # Convert string "true"/"false" to boolean
        if isinstance(value, str):
            bool_value = value.lower() in ('true', '1', 'yes', 'on')
        else:
            bool_value = bool(value)
        
        if bool_value:
            # Return owners with seller_type=INDIVIDUAL
            return queryset.filter(
                custom_role__code='owner',
                seller_type=User.SellerTypes.INDIVIDUAL
            )
        else:
            # Return all users except individuals
            from django.db.models import Q
            return queryset.exclude(
                Q(custom_role__code='owner', seller_type=User.SellerTypes.INDIVIDUAL)
            )
    
    def filter_rejection_note(self, queryset, name, value):
        """
        Filter users based on whether they have a rejection note.
        - has_rejection_note=true: users with rejection_note (not null and not empty)
        - has_rejection_note=false: users without rejection_note (null or empty)
        """
        from django.db.models import Q
        
        if value is None:
            return queryset
        
        # Convert string "true"/"false" to boolean
        if isinstance(value, str):
            bool_value = value.lower() in ('true', '1', 'yes', 'on')
        else:
            bool_value = bool(value)
        
        if bool_value:
            # Return users that have a rejection note
            return queryset.exclude(
                Q(rejection_note__isnull=True) | Q(rejection_note='')
            )
        else:
            # Return users that don't have a rejection note
            return queryset.filter(
                Q(rejection_note__isnull=True) | Q(rejection_note='')
            )
    
    class Meta:
        model = User
        fields = [
            'role',
            'verification_status',
            'seller_type',
            'is_agent',
            'is_company',
            'is_individual',
            'country_id',
            'state',
            'city',
            'custom_role_id',
            'is_mobile_verified',
            'email',
            'full_name',
            'mobile_number',
            'whatsapp_number',
            'address',
            'company_name',
            'license_number',
            'emirates_id_number',
            'has_rejection_note',
        ]
