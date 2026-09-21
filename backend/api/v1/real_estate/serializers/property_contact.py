from rest_framework import serializers
from apps.real_estate.models import PropertyContact, Property
from apps.users.models import User


class PropertyContactCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating property contact requests"""
    property_id = serializers.IntegerField(write_only=True, required=True)
    
    class Meta:
        model = PropertyContact
        fields = ('property_id', 'contact_method')
        read_only_fields = ('seeker', 'created_at')
    
    def validate_property_id(self, value):
        """Validate that the property exists"""
        try:
            Property.objects.get(pk=value)
        except Property.DoesNotExist:
            raise serializers.ValidationError("Property does not exist.")
        return value
    
    def validate_contact_method(self, value):
        """Validate contact method"""
        valid_methods = [choice[0] for choice in PropertyContact.CONTACT_METHOD_CHOICES]
        if value not in valid_methods:
            raise serializers.ValidationError(
                f"Invalid contact method. Must be one of: {', '.join(valid_methods)}"
            )
        return value
    
    def create(self, validated_data):
        """Create contact request with seeker from request user"""
        property_id = validated_data.pop('property_id')
        property_obj = Property.objects.get(pk=property_id)
        
        # Get seeker from request context
        seeker = self.context['request'].user
        
        # Create the contact request
        contact = PropertyContact.objects.create(
            seeker=seeker,
            property=property_obj,
            contact_method=validated_data['contact_method']
        )
        return contact


class PropertyContactListSerializer(serializers.ModelSerializer):
    """Serializer for listing property contacts"""
    seeker_name = serializers.CharField(source='seeker.full_name', read_only=True)
    seeker_email = serializers.EmailField(source='seeker.email', read_only=True)
    seeker_phone = serializers.CharField(source='seeker.mobile_number', read_only=True)
    property_title = serializers.CharField(source='property.title', read_only=True)
    property_id = serializers.IntegerField(source='property.id', read_only=True)
    owner_name = serializers.CharField(source='property.owner.full_name', read_only=True)
    owner_email = serializers.EmailField(source='property.owner.email', read_only=True)
    owner_phone = serializers.CharField(source='property.owner.mobile_number', read_only=True)
    
    class Meta:
        model = PropertyContact
        fields = (
            'id',
            'seeker_name',
            'seeker_email',
            'seeker_phone',
            'property_id',
            'property_title',
            'owner_name',
            'owner_email',
            'owner_phone',
            'contact_method',
            'created_at'
        )
        read_only_fields = fields

