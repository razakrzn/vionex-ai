from rest_framework import serializers
from apps.offers.models import Offer


class OfferListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing offers (minimal fields)
    """
    role = serializers.CharField(source='custom_role.code', read_only=True)
    total_active_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Offer
        fields = (
            "id",
            "role",
            "price_per_listing",
            "validity_months",
            "cashback",
            "total_active_count",
            "created_at",
        )
        read_only_fields = ("id", "role", "total_active_count", "created_at")
    
    def get_total_active_count(self, obj):
        """Calculate total active count based on role"""
        if not obj.custom_role or not obj.custom_role.code:
            return 0
            
        role_code = obj.custom_role.code
        
        if role_code == 'owner':
            # Count active properties
            from apps.real_estate.models import Property, ListingStatus
            return Property.objects.filter(
                is_active=True,
                is_approved=True,
                listing_status=ListingStatus.AVAILABLE,
                is_deleted=False
            ).count()
        elif role_code == 'gym_owner':
            # Count active gyms
            from apps.fitness.models import Gym
            return Gym.objects.filter(
                is_active=True,
                is_approved=True
            ).count()
        return 0


class OfferDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for offer details (all fields)
    """
    role = serializers.CharField(source='custom_role.code', read_only=True)
    total_active_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Offer
        fields = (
            "id",
            "role",
            "price_per_listing",
            "validity_months",
            "cashback",
            "total_active_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "role", "total_active_count", "created_at", "updated_at")
    
    def get_total_active_count(self, obj):
        """Calculate total active count based on role"""
        if not obj.custom_role or not obj.custom_role.code:
            return 0
            
        role_code = obj.custom_role.code
        
        if role_code == 'owner':
            # Count active properties
            from apps.real_estate.models import Property, ListingStatus
            return Property.objects.filter(
                is_active=True,
                is_approved=True,
                listing_status=ListingStatus.AVAILABLE,
                is_deleted=False
            ).count()
        elif role_code == 'gym_owner':
            # Count active gyms
            from apps.fitness.models import Gym
            return Gym.objects.filter(
                is_active=True,
                is_approved=True
            ).count()
        return 0


class OfferCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating offers
    """
    role = serializers.CharField(write_only=True, help_text="Role code (e.g., 'owner', 'gym_owner', 'seeker')")
    
    class Meta:
        model = Offer
        fields = (
            "id",
            "role",
            "custom_role",
            "price_per_listing",
            "validity_months",
            "cashback",
        )
        read_only_fields = ("id", "custom_role")
        extra_kwargs = {
            'validity_months': {'required': False}
        }
    
    def validate_role(self, value):
        """Validate role code exists"""
        from apps.users.models import Role
        if not value:
            raise serializers.ValidationError("Role code is required")
        try:
            role = Role.objects.get(code=value, is_active=True)
            return value
        except Role.DoesNotExist:
            raise serializers.ValidationError(f"Role with code '{value}' does not exist or is not active")
    
    def create(self, validated_data):
        """Create offer with role from role code"""
        from apps.users.models import Role
        
        role_code = validated_data.pop('role', None)
        if not role_code:
            raise serializers.ValidationError({"role": "Role code is required"})
        
        try:
            role = Role.objects.get(code=role_code, is_active=True)
        except Role.DoesNotExist:
            raise serializers.ValidationError({"role": f"Role with code '{role_code}' does not exist or is not active"})
        
        validated_data['custom_role'] = role
        return super().create(validated_data)

    def validate_price_per_listing(self, value):
        """Validate price per listing is positive"""
        if value <= 0:
            raise serializers.ValidationError("Price per listing must be greater than 0")
        return value

    def validate_validity_months(self, value):
        """Validate validity months is positive if provided"""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Validity months must be greater than 0")
        return value

    def validate_cashback(self, value):
        """Validate cashback is non-negative"""
        if value < 0:
            raise serializers.ValidationError("Cashback cannot be negative")
        return value


class OfferUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating offers
    """
    role = serializers.CharField(write_only=True, required=False, help_text="Role code (e.g., 'owner', 'gym_owner', 'seeker')")
    
    class Meta:
        model = Offer
        fields = (
            "id",
            "role",
            "custom_role",
            "price_per_listing",
            "validity_months",
            "cashback",
        )
        read_only_fields = ("id", "custom_role")
        extra_kwargs = {
            'validity_months': {'required': False}
        }
    
    def validate_role(self, value):
        """Validate role code exists"""
        from apps.users.models import Role
        try:
            role = Role.objects.get(code=value, is_active=True)
            return value
        except Role.DoesNotExist:
            raise serializers.ValidationError(f"Role with code '{value}' does not exist or is not active")
    
    def update(self, instance, validated_data):
        """Update offer with role from role code if provided"""
        from apps.users.models import Role
        
        role_code = validated_data.pop('role', None)
        if role_code:
            role = Role.objects.get(code=role_code, is_active=True)
            validated_data['custom_role'] = role
        
        return super().update(instance, validated_data)

    def validate_price_per_listing(self, value):
        """Validate price per listing is positive"""
        if value <= 0:
            raise serializers.ValidationError("Price per listing must be greater than 0")
        return value

    def validate_validity_months(self, value):
        """Validate validity months is positive if provided"""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Validity months must be greater than 0")
        return value

    def validate_cashback(self, value):
        """Validate cashback is non-negative"""
        if value < 0:
            raise serializers.ValidationError("Cashback cannot be negative")
        return value
