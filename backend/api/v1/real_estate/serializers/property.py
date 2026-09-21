from rest_framework import serializers
from django.contrib.gis.geos import Point
import logging
import json
from apps.real_estate.models import Property, PropertyGallery, ListingStatus
from .property_type import PropertyTypeListSerializer
from .purpose import PurposeListSerializer
from .furnishing_status import FurnishingStatusListSerializer
from .completion_status import CompletionStatusListSerializer
from .occupant_type import OccupantTypeListSerializer
from .amenity import AmenityListSerializer

logger = logging.getLogger(__name__)


def get_storage_key(file_field):
    """Return the provider-agnostic object key stored for a file field."""
    return getattr(file_field, "name", None) if file_field else None


class GalleryImagesToDeleteField(serializers.ListField):
    """Custom field that handles JSON strings from form-data"""
    
    def to_internal_value(self, data):
        # Handle JSON string from form-data
        if isinstance(data, str):
            data = data.strip()
            # Try parsing as JSON
            if data.startswith('[') and data.endswith(']'):
                try:
                    data = json.loads(data)
                except (json.JSONDecodeError, ValueError):
                    # If JSON parsing fails, try comma-separated
                    try:
                        data = [int(x.strip()) for x in data.strip('[]').split(',') if x.strip()]
                        return data
                    except (ValueError, TypeError):
                        pass
        
        # Handle dict (DRF sometimes converts lists to dicts)
        if isinstance(data, dict):
            try:
                # Sort by key and extract values
                sorted_keys = sorted([int(k) for k in data.keys() if str(k).isdigit()])
                data = [data[str(k)] for k in sorted_keys]
            except (ValueError, KeyError, TypeError):
                data = list(data.values())
        
        # Call parent to handle list validation
        return super().to_internal_value(data)


class MainImageField(serializers.ImageField):
    """Custom ImageField that returns the stored object key for reading."""
    
    def to_representation(self, value):
        return get_storage_key(value)


class OwnerSerializer(serializers.Serializer):
    """Serializer for owner details"""
    id = serializers.IntegerField()
    name = serializers.CharField(source='full_name', allow_null=True)
    email = serializers.EmailField()
    phone_number = serializers.CharField(source='mobile_number', allow_null=True, allow_blank=True)
    whatsapp_number = serializers.CharField(allow_null=True, allow_blank=True)

    def to_representation(self, instance):
        """Strip spaces from phone_number and whatsapp_number when returning"""
        representation = super().to_representation(instance)
        if representation.get('phone_number'):
            representation['phone_number'] = representation['phone_number'].replace(' ', '')
        if representation.get('whatsapp_number'):
            representation['whatsapp_number'] = representation['whatsapp_number'].replace(' ', '')
        return representation


class PropertyGallerySerializer(serializers.ModelSerializer):
    """Serializer for PropertyGallery - read-only for responses"""
    image = serializers.SerializerMethodField()

    class Meta:
        model = PropertyGallery
        fields = ("id", "image")
        read_only_fields = ("id",)

    def get_image(self, obj):
        """Return the stored object key for the image."""
        return get_storage_key(obj.image)


class PropertyGalleryCreateSerializer(serializers.Serializer):
    """Nested serializer for creating gallery images (new images only)"""
    image = serializers.ImageField(required=True)


class PropertyApproveRejectSerializer(serializers.ModelSerializer):
    """Minimal serializer for approve/reject responses"""
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)

    class Meta:
        model = Property
        fields = ("id", "title", "description", "owner_name", "is_approved", "is_active", "listing_status")
        read_only_fields = ("id", "title", "description", "owner_name", "is_approved", "is_active", "listing_status")


class PropertyListingStatusSerializer(serializers.ModelSerializer):
    """Serializer for updating listing status"""
    
    class Meta:
        model = Property
        fields = ("id", "title", "listing_status", "is_approved")
        read_only_fields = ("id", "title", "is_approved")
    
    def validate_listing_status(self, value):
        """
        Validate listing_status can only be changed when property is approved.
        Exception: Can always set to OFF_MARKET.
        """
        instance = getattr(self, 'instance', None)
        
        if instance:
            # If property is not approved, only allow OFF_MARKET
            if not instance.is_approved and value != ListingStatus.OFF_MARKET:
                raise serializers.ValidationError(
                    "Listing status can only be changed when property is approved. "
                    "Unapproved properties must have OFF_MARKET status."
                )
        
        return value


class PropertyListSerializer(serializers.ModelSerializer):
    property_type_name = serializers.SerializerMethodField()
    purpose_name = serializers.SerializerMethodField()
    occupant_type = OccupantTypeListSerializer(read_only=True)
    distance_km = serializers.SerializerMethodField()
    rejection_note = serializers.SerializerMethodField()
    main_image = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()
    user_profile_picture = serializers.SerializerMethodField()
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = (
            "id",
            "title",
            "property_type_name",
            "purpose_name",
            "price",
            "currency",
            "rent_period",
            "created_at",
            "is_approved",
            "is_active",
            "listing_status",
            "is_deleted",
            "deleted_at",
            "bedrooms",
            "bathrooms",
            "occupant_type",
            "place",
            "main_image",
            "distance_km",
            "rejection_note",
            "expires_at",
            "days_until_expiry",
            "user_profile_picture",
            "user_full_name",
            "views_count"
        )
        read_only_fields = ("id", "property_type_name", "purpose_name", "created_at", "is_approved", "is_active", "distance_km", "rejection_note", "is_deleted", "deleted_at", "main_image", "expires_at", "days_until_expiry", "user_profile_picture", "user_full_name", "views_count")

    def get_property_type_name(self, obj):
        """Return just the name of the property type"""
        return obj.property_type.name if obj.property_type else None

    def get_purpose_name(self, obj):
        """Return just the name of the purpose"""
        return obj.purpose.name if obj.purpose else None

    def get_main_image(self, obj):
        """Return the stored object key for the main image."""
        return get_storage_key(obj.main_image)

    def get_distance_km(self, obj):
        """
        Return distance in kilometers from the search location.
        Only available when lat/lng query parameters are provided.
        """
        # Check if distance annotation exists (from radius search)
        if hasattr(obj, 'distance') and obj.distance is not None:
            # Convert Distance object to kilometers
            # Distance object has .km attribute
            return round(float(obj.distance.km), 2)  # Round to 2 decimal places
        return None

    def get_rejection_note(self, obj):
        """
        Return rejection note only if property is not approved.
        """
        if not obj.is_approved and obj.rejection_note:
            return obj.rejection_note
        return None
    
    def get_days_until_expiry(self, obj):
        """Calculate days remaining until expiration"""
        if obj.expires_at:
            from django.utils import timezone
            delta = obj.expires_at - timezone.now()
            return max(0, delta.days)
        return None

    def get_user_profile_picture(self, obj):
        """Return the stored object key for the owner's profile picture."""
        return get_storage_key(getattr(obj.owner, "profile_picture", None))

    def get_user_full_name(self, obj):
        """Return the owner's display name (company name for companies)"""
        if obj.owner:
            seller_types = getattr(obj.owner, "SellerTypes", None)
            if seller_types and obj.owner.seller_type == seller_types.COMPANY:
                return obj.owner.company_name or obj.owner.full_name
            return obj.owner.full_name
        return None

    def to_representation(self, instance):
        """
        Override to conditionally exclude distance_km field when lat/lng are not provided,
        and conditionally include views_count based on user role and ownership.
        """
        data = super().to_representation(instance)
        
        # Check if request has lat/lng parameters (radius search)
        request = self.context.get('request')
        if request:
            lat = request.query_params.get('lat', None)
            lng = request.query_params.get('lng', None)
            
            # Remove distance_km field if lat and lng are not provided
            if not (lat and lng):
                data.pop('distance_km', None)
            
            # Conditionally include views_count based on user role and ownership
            user = getattr(request, 'user', None)
            if user and user.is_authenticated:
                user_role = getattr(user, 'role_code', None)
                # Include views_count if user is admin
                if user_role == 'admin':
                    # Keep views_count in response
                    pass
                # Include views_count if user is owner and viewing their own property
                elif user_role == 'owner' and instance.owner == user:
                    # Keep views_count in response
                    pass
                else:
                    # Remove views_count for other authenticated users (seekers, etc.)
                    data.pop('views_count', None)
            else:
                # Remove views_count for unauthenticated/public users
                data.pop('views_count', None)
        else:
            # If no request context, remove distance_km and views_count
            data.pop('distance_km', None)
            data.pop('views_count', None)
        
        return data




class PropertyDetailSerializer(serializers.ModelSerializer):
    property_type = PropertyTypeListSerializer(read_only=True)
    purpose = PurposeListSerializer(read_only=True)
    furnishing_status = FurnishingStatusListSerializer(read_only=True)
    completion_status = CompletionStatusListSerializer(read_only=True)
    occupant_type = OccupantTypeListSerializer(read_only=True)
    amenities = AmenityListSerializer(many=True, read_only=True)
    main_image = MainImageField(required=False, allow_null=True, help_text="Main image file for the property")
    gallery_images = PropertyGallerySerializer(many=True, read_only=True)
    owner = OwnerSerializer(read_only=True)
    rejection_note = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()
    
    # Location fields - accept as latitude/longitude, store as PointField
    latitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    longitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    location_latitude = serializers.SerializerMethodField()
    location_longitude = serializers.SerializerMethodField()
    
    # Write-only fields for relationships
    property_type_id = serializers.IntegerField(write_only=True, required=False)
    purpose_id = serializers.IntegerField(write_only=True, required=False)
    furnishing_status_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    completion_status_id = serializers.IntegerField(write_only=True, required=False)
    occupant_type_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    amenity_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    # Write-only field for creating/updating gallery images
    gallery_images_data = PropertyGalleryCreateSerializer(many=True, write_only=True, required=False)
    # Write-only field for deleting specific gallery images by ID
    gallery_images_to_delete = GalleryImagesToDeleteField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True,
        help_text="List of gallery image IDs to delete (can be JSON string, array, or comma-separated)"
    )

    class Meta:
        model = Property
        fields = (
            "id",
            "title",
            "description",
            "property_type",
            "property_type_id",
            "purpose",
            "purpose_id",
            "furnishing_status",
            "furnishing_status_id",
            "completion_status",
            "completion_status_id",
            "occupant_type",
            "occupant_type_id",
            "occupants_count",
            "address",
            "place",
            "building_name",
            "floor_number",
            "unit_number",
            "latitude",
            "longitude",
            "location_latitude",
            "location_longitude",
            "nationality",
            "bedrooms",
            "bathrooms",
            "area_sqm",
            "price",
            "currency",
            "price_per_sqft",
            "rent_period",
            "handover_date",
            "developer_name",
            "project_name",
            "amenities",
            "amenity_ids",
            "main_image",
            "social_media",
            "gallery_images",
            "gallery_images_data",
            "gallery_images_to_delete",
            "owner",
            "is_approved",
            "is_active",
            "listing_status",
            "rejection_note",
            "views_count",
            "created_at",
            "updated_at",
            "expires_at",
            "approved_at",
            "days_until_expiry",
        )
        read_only_fields = (
            "id",
            "gallery_images",
            "owner",
            "price_per_sqft",
            "views_count",
            "location_latitude",
            "location_longitude",
            "is_active",
            "created_at",
            "updated_at",
            "expires_at",
            "approved_at",
            "days_until_expiry",
        )

    def get_location_latitude(self, obj):
        """Return latitude from PointField location"""
        if obj.location:
            return obj.location.y  # PointField uses (longitude, latitude) but .y is latitude
        return None

    def get_location_longitude(self, obj):
        """Return longitude from PointField location"""
        if obj.location:
            return obj.location.x  # PointField uses (longitude, latitude) but .x is longitude
        return None

    def get_rejection_note(self, obj):
        """
        Return rejection note only if property is not approved.
        """
        if not obj.is_approved and obj.rejection_note:
            return obj.rejection_note
        return None
    
    def get_days_until_expiry(self, obj):
        """Calculate days remaining until expiration"""
        if obj.expires_at:
            from django.utils import timezone
            delta = obj.expires_at - timezone.now()
            return max(0, delta.days)
        return None

    def to_internal_value(self, data):
        """Handle multipart/form-data parsing for gallery_images_data with support for ID field"""
        import json
        from django.http import QueryDict
        
        # Handle gallery_images_to_delete - MUST parse JSON string BEFORE ListField validation
        if hasattr(data, 'get'):
            gallery_images_to_delete_raw = data.get('gallery_images_to_delete')
            if gallery_images_to_delete_raw is not None:
                parsed_list = None
                
                # If it's a string, try to parse it as JSON
                if isinstance(gallery_images_to_delete_raw, str):
                    # Strip whitespace
                    gallery_images_to_delete_raw = gallery_images_to_delete_raw.strip()
                    # Try parsing as JSON
                    try:
                        parsed = json.loads(gallery_images_to_delete_raw)
                        if isinstance(parsed, list):
                            parsed_list = parsed
                    except (json.JSONDecodeError, ValueError, TypeError):
                        # If JSON parsing fails, try comma-separated values
                        try:
                            # Handle comma-separated: "456, 457"
                            parsed_list = [int(x.strip()) for x in gallery_images_to_delete_raw.split(',') if x.strip()]
                        except (ValueError, TypeError):
                            pass
                
                # If it's already a list, use it directly
                elif isinstance(gallery_images_to_delete_raw, list):
                    parsed_list = gallery_images_to_delete_raw
                
                # If we successfully parsed/obtained a list, set it in the data
                if parsed_list is not None:
                    if isinstance(data, QueryDict):
                        data._mutable = True
                        # Store the parsed list as an attribute for later use (before super().to_internal_value)
                        data._gallery_images_to_delete_parsed = parsed_list
                        # Completely remove the key from QueryDict's internal _list structure
                        if hasattr(data, '_list'):
                            # Filter out all entries with this key
                            data._list = [(k, v) for k, v in data._list if k != 'gallery_images_to_delete']
                        # Clear the cached dict representation
                        if hasattr(data, '_dict'):
                            data._dict = None
                        # Set it using setlist which properly handles lists in QueryDict
                        # Convert to strings since QueryDict stores everything as strings
                        data.setlist('gallery_images_to_delete', [str(item) for item in parsed_list])
                    elif isinstance(data, dict):
                        # For regular dict (JSON request), set directly
                        data['gallery_images_to_delete'] = parsed_list
        
        # Handle multipart/form-data images parsing (simplified - no indices, no IDs)
        if hasattr(data, 'getlist'):
            from django.http import QueryDict
            
            # Check for gallery_images_data files (multiple files with same field name)
            gallery_files = data.getlist('gallery_images_data')
            
            if gallery_files:
                # Filter only actual file objects
                gallery_list = []
                for file_obj in gallery_files:
                    if file_obj and hasattr(file_obj, 'read'):
                        gallery_list.append({'image': file_obj})
                
                # Set the gallery_images_data list
                if gallery_list:
                    if isinstance(data, QueryDict):
                        data._mutable = True
                        # Remove old entries
                        if 'gallery_images_data' in data:
                            # Remove all occurrences
                            while 'gallery_images_data' in data:
                                data.pop('gallery_images_data')
                        # Set as list
                        data['gallery_images_data'] = gallery_list
                    elif isinstance(data, dict):
                        data['gallery_images_data'] = gallery_list
        
        # Store gallery_images_data before calling super() as it might get lost during nested serializer validation
        gallery_images_raw = data.get('gallery_images_data') if 'gallery_images_data' in data else None
        
        # Also store gallery_images_to_delete to ensure it's preserved as a list
        gallery_images_to_delete_raw = data.get('gallery_images_to_delete')
        # Check if we parsed it earlier
        parsed_gallery_delete = getattr(data, '_gallery_images_to_delete_parsed', None)
        
        result = super().to_internal_value(data)
        
        # Restore gallery_images_data if it was lost
        if hasattr(result, 'keys'):
            if 'gallery_images_data' not in result and gallery_images_raw:
                result['gallery_images_data'] = gallery_images_raw
            
            # Handle gallery_images_to_delete - use parsed version if available
            if parsed_gallery_delete is not None:
                # Use the parsed list we created earlier
                result['gallery_images_to_delete'] = parsed_gallery_delete
            elif 'gallery_images_to_delete' in result:
                value = result['gallery_images_to_delete']
                # If it's a dict (with numeric string keys), convert to list
                if isinstance(value, dict):
                    try:
                        # Sort by key and extract values
                        sorted_keys = sorted([int(k) for k in value.keys() if str(k).isdigit()])
                        result['gallery_images_to_delete'] = [int(value[str(k)]) for k in sorted_keys]
                    except (ValueError, KeyError, TypeError):
                        # If conversion fails, try to get values directly
                        try:
                            result['gallery_images_to_delete'] = [int(v) for v in value.values()]
                        except (ValueError, TypeError):
                            result['gallery_images_to_delete'] = list(value.values())
                # If it's already a list, ensure all items are integers
                elif isinstance(value, list):
                    try:
                        result['gallery_images_to_delete'] = [int(item) for item in value]
                    except (ValueError, TypeError):
                        result['gallery_images_to_delete'] = value
            # If it was in original data but not in result, restore it
            elif gallery_images_to_delete_raw is not None:
                if isinstance(gallery_images_to_delete_raw, list):
                    result['gallery_images_to_delete'] = gallery_images_to_delete_raw
        
        return result

    def validate_gallery_images_to_delete(self, value):
        """Validate gallery_images_to_delete field - handles JSON strings, lists, dicts, and single values"""
        if value is None:
            return value
        
        import json
        
        # If it's a string, try to parse as JSON first
        if isinstance(value, str):
            value = value.strip()
            if value.startswith('[') and value.endswith(']'):
                try:
                    value = json.loads(value)
                except (json.JSONDecodeError, ValueError):
                    # If JSON parsing fails, try comma-separated
                    try:
                        value = [int(x.strip()) for x in value.strip('[]').split(',') if x.strip()]
                        return value
                    except (ValueError, TypeError):
                        pass
        
        # If it's a dict (DRF sometimes converts lists to dicts with numeric string keys), convert to list
        if isinstance(value, dict):
            try:
                # Sort by key and extract values
                sorted_keys = sorted([int(k) for k in value.keys() if str(k).isdigit()])
                value = [value[str(k)] for k in sorted_keys]
            except (ValueError, KeyError, TypeError):
                # If conversion fails, try to get values directly
                try:
                    value = [int(v) for v in value.values()]
                except (ValueError, TypeError):
                    value = list(value.values())
        
        # If it's already a list, ensure all items are integers
        if isinstance(value, list):
            try:
                return [int(item) for item in value if item is not None and str(item).strip()]
            except (ValueError, TypeError) as e:
                raise serializers.ValidationError(
                    f"All items in gallery_images_to_delete must be integers. Error: {str(e)}"
                )
        
        # If it's a single value, convert to list
        if isinstance(value, (int, str)):
            try:
                return [int(value)]
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    "gallery_images_to_delete must be a list of integers or a single integer"
                )
        
        raise serializers.ValidationError(
            f"gallery_images_to_delete must be a list of integers. Received type: {type(value).__name__}, value: {value}"
        )

    def validate_social_media(self, value):
        """Validate that social_media is a dictionary"""
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("social_media must be a dictionary/object")
        return value or {}

    def validate_listing_status(self, value):
        """
        Validate listing_status can only be changed when property is approved.
        For unapproved properties, listing_status must be OFF_MARKET.
        """
        # Get the instance if it exists (for updates)
        instance = getattr(self, 'instance', None)
        
        if instance and instance.pk:
            # For updates: only allow changing listing_status if property is approved
            if not instance.is_approved and value != ListingStatus.OFF_MARKET:
                raise serializers.ValidationError(
                    "Listing status can only be changed when property is approved. "
                    "Unapproved properties must have OFF_MARKET status."
                )
        else:
            # For new instances: if not approved, must be OFF_MARKET
            # Check if is_approved is in initial_data
            is_approved = self.initial_data.get('is_approved', False)
            if not is_approved and value != ListingStatus.OFF_MARKET:
                raise serializers.ValidationError(
                    "New unapproved properties must have OFF_MARKET status."
                )
        
        return value

    def update(self, instance, validated_data):
        amenity_ids = validated_data.pop('amenity_ids', None)
        gallery_images_data = validated_data.pop('gallery_images_data', None)
        gallery_images_to_delete = validated_data.pop('gallery_images_to_delete', None)
        latitude = validated_data.pop('latitude', None)
        longitude = validated_data.pop('longitude', None)
        
        # Set is_approved to False when property is updated
        instance.is_approved = False
        # Clear rejection note when property is updated
        instance.rejection_note = None
        
        # Handle location PointField conversion
        if latitude is not None and longitude is not None:
            instance.location = Point(float(longitude), float(latitude))  # Point expects (lon, lat)
        elif latitude is None and longitude is None:
            # If both are None, keep existing location
            pass
        else:
            # If only one is provided, clear location
            instance.location = None
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if amenity_ids is not None:
            instance.amenities.set(amenity_ids)
        
        # Handle gallery images deletion first
        if gallery_images_to_delete is not None and len(gallery_images_to_delete) > 0:
            # Delete only the specified gallery images
            instance.gallery_images.filter(id__in=gallery_images_to_delete).delete()
        
        # Handle gallery images - only add new images (no updates, no IDs)
        if gallery_images_data is not None:
            for image_data in gallery_images_data:
                if isinstance(image_data, dict) and 'image' in image_data:
                    image_file = image_data['image']
                    # Always create new image
                    PropertyGallery.objects.create(
                        property=instance,
                        image=image_file
                    )
        
        return instance


class PropertyCreateSerializer(serializers.ModelSerializer):
    property_type_id = serializers.IntegerField()
    purpose_id = serializers.IntegerField()
    completion_status_id = serializers.IntegerField()
    furnishing_status_id = serializers.IntegerField(required=False, allow_null=True)
    occupant_type_id = serializers.IntegerField(required=False, allow_null=True)
    amenity_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    main_image = serializers.ImageField(required=False, allow_null=True)
    # Location fields - accept as latitude/longitude, store as PointField
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    # Write-only field for creating gallery images
    gallery_images_data = PropertyGalleryCreateSerializer(many=True, required=False, write_only=True)
    # Read-only field to return gallery images in response
    gallery_images_list = PropertyGallerySerializer(many=True, read_only=True, source='gallery_images')

    def to_internal_value(self, data):
        """Handle multipart/form-data parsing for gallery_images_data (simplified - no indices, no IDs)"""
        # Handle multipart/form-data images parsing
        if hasattr(data, 'getlist'):
            from django.http import QueryDict
            
            # Check for gallery_images_data files (multiple files with same field name)
            gallery_files = data.getlist('gallery_images_data')
            
            if gallery_files:
                # Filter only actual file objects
                gallery_list = []
                for file_obj in gallery_files:
                    if file_obj and hasattr(file_obj, 'read'):
                        gallery_list.append({'image': file_obj})
                
                # Set the gallery_images_data list
                if gallery_list:
                    if isinstance(data, QueryDict):
                        data._mutable = True
                        # Remove old entries
                        if 'gallery_images_data' in data:
                            # Remove all occurrences
                            while 'gallery_images_data' in data:
                                data.pop('gallery_images_data')
                        # Set as list
                        data['gallery_images_data'] = gallery_list
                    elif isinstance(data, dict):
                        data['gallery_images_data'] = gallery_list
        
        # Store gallery_images_data before calling super() as it might get lost during nested serializer validation
        gallery_images_raw = data.get('gallery_images_data') if 'gallery_images_data' in data else None
        
        result = super().to_internal_value(data)
        if hasattr(result, 'keys'):
            if 'gallery_images_data' not in result and gallery_images_raw:
                result['gallery_images_data'] = gallery_images_raw
        return result


    class Meta:
        model = Property
        fields = (
            "id",
            "title",
            "description",
            "property_type_id",
            "purpose_id",
            "furnishing_status_id",
            "completion_status_id",
            "occupant_type_id",
            "occupants_count",
            "nationality",
            "address",
            "place",
            "building_name",
            "floor_number",
            "unit_number",
            "latitude",
            "longitude",
            "bedrooms",
            "bathrooms",
            "area_sqm",
            "price",
            "currency",
            "rent_period",
            "handover_date",
            "developer_name",
            "project_name",
            "amenity_ids",
            "main_image",
            "social_media",
            "gallery_images_data",
            "gallery_images_list",
            "is_approved",
            "is_active",
            "listing_status",
        )
        read_only_fields = ("id", "gallery_images_list", "is_approved", "is_active")

    def validate_property_type_id(self, value):
        from apps.real_estate.models import PropertyType
        try:
            PropertyType.objects.get(id=value)
        except PropertyType.DoesNotExist:
            raise serializers.ValidationError("Invalid property type")
        return value

    def validate_purpose_id(self, value):
        from apps.real_estate.models import Purpose
        try:
            Purpose.objects.get(id=value)
        except Purpose.DoesNotExist:
            raise serializers.ValidationError("Invalid purpose")
        return value

    def validate_completion_status_id(self, value):
        from apps.real_estate.models import CompletionStatus
        try:
            CompletionStatus.objects.get(id=value)
        except CompletionStatus.DoesNotExist:
            raise serializers.ValidationError("Invalid completion status")
        return value

    def validate_furnishing_status_id(self, value):
        if value is not None:
            from apps.real_estate.models import FurnishingStatus
            try:
                FurnishingStatus.objects.get(id=value)
            except FurnishingStatus.DoesNotExist:
                raise serializers.ValidationError("Invalid furnishing status")
        return value

    def validate_occupant_type_id(self, value):
        if value is not None:
            from apps.real_estate.models import OccupantType
            try:
                OccupantType.objects.get(id=value)
            except OccupantType.DoesNotExist:
                raise serializers.ValidationError("Invalid occupant type")
        return value

    def validate_amenity_ids(self, value):
        if value:
            from apps.real_estate.models import Amenity
            amenities = Amenity.objects.filter(id__in=value)
            if amenities.count() != len(value):
                raise serializers.ValidationError("One or more amenities are invalid")
        return value

    def validate_currency(self, value):
        if value and len(value) > 10:
            raise serializers.ValidationError("Currency code must be 10 characters or less")
        return value

    def validate_rent_period(self, value):
        if value and len(value) > 20:
            raise serializers.ValidationError("Rent period must be 20 characters or less")
        return value

    def validate_floor_number(self, value):
        if value and len(value) > 50:
            raise serializers.ValidationError("Floor number must be 50 characters or less")
        return value

    def validate_unit_number(self, value):
        if value and len(value) > 50:
            raise serializers.ValidationError("Unit number must be 50 characters or less")
        return value

    def validate_place(self, value):
        if value and len(value) > 200:
            raise serializers.ValidationError("Place must be 200 characters or less")
        return value

    def validate_building_name(self, value):
        if value and len(value) > 200:
            raise serializers.ValidationError("Building name must be 200 characters or less")
        return value

    def validate_developer_name(self, value):
        if value and len(value) > 200:
            raise serializers.ValidationError("Developer name must be 200 characters or less")
        return value

    def validate_project_name(self, value):
        if value and len(value) > 200:
            raise serializers.ValidationError("Project name must be 200 characters or less")
        return value

    def validate_title(self, value):
        if value and len(value) > 200:
            raise serializers.ValidationError("Title must be 200 characters or less")
        return value

    def validate_social_media(self, value):
        """Validate that social_media is a dictionary"""
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("social_media must be a dictionary/object")
        return value or {}

    def validate_listing_status(self, value):
        """
        Validate listing_status for new properties.
        For unapproved properties, listing_status must be OFF_MARKET.
        """
        # For new instances: if not approved, must be OFF_MARKET
        # Check if is_approved is in initial_data
        is_approved = self.initial_data.get('is_approved', False)
        if not is_approved and value != ListingStatus.OFF_MARKET:
            raise serializers.ValidationError(
                "New unapproved properties must have OFF_MARKET status."
            )
        return value

    def create(self, validated_data):
        from django.db import IntegrityError, DataError
        from django.core.exceptions import ValidationError as DjangoValidationError
        
        amenity_ids = validated_data.pop('amenity_ids', [])
        gallery_images_data = validated_data.pop('gallery_images_data', [])
        latitude = validated_data.pop('latitude', None)
        longitude = validated_data.pop('longitude', None)
        
        # Handle location PointField conversion
        if latitude is not None and longitude is not None:
            validated_data['location'] = Point(float(longitude), float(latitude))  # Point expects (lon, lat)
        elif latitude is None and longitude is None:
            # If both are None, location will be None (already handled by blank=True, null=True)
            pass
        else:
            # If only one is provided, set location to None
            validated_data['location'] = None
        
        try:
            property_obj = Property.objects.create(**validated_data)
        except (IntegrityError, DataError) as e:
            # Extract field name from error message if possible
            error_msg = str(e)
            import re
            
            # Try to extract column name from PostgreSQL error
            # Pattern: "value too long for type character varying(100)" 
            # or "column "column_name" ... value too long"
            column_match = re.search(r'column\s+"?(\w+)"?', error_msg, re.IGNORECASE)
            field_name = column_match.group(1) if column_match else None
            
            if 'value too long' in error_msg.lower() or 'character varying(100)' in error_msg:
                # Check each field length in validated_data
                long_fields = {}
                for key, value in validated_data.items():
                    if isinstance(value, str):
                        long_fields[key] = len(value)
                
                # Also check if it's a related field issue
                error_detail = f"Database constraint error: A field exceeds 100 characters limit."
                if field_name:
                    error_detail += f" Problematic column: '{field_name}'. "
                    error_detail += "This column may still exist in the database but was removed from the model. "
                    error_detail += "Please run: python manage.py migrate"
                else:
                    error_detail += " This is likely a database schema mismatch. "
                    error_detail += "Please ensure all migrations are applied: python manage.py migrate"
                
                if long_fields:
                    error_detail += f" Fields in request: {long_fields}"
                
                raise serializers.ValidationError(error_detail)
            else:
                raise serializers.ValidationError(
                    f"Database error: {error_msg}. "
                    f"Please check that all migrations have been applied."
                )
        
        if amenity_ids:
            property_obj.amenities.set(amenity_ids)
        
        # Create gallery images
        for image_data in gallery_images_data:
            if isinstance(image_data, dict) and 'image' in image_data:
                PropertyGallery.objects.create(
                    property=property_obj,
                    image=image_data['image']
                )
        
        return property_obj

    def update(self, instance, validated_data):
        """
        Update method for PropertyCreateSerializer.
        Note: This is typically not used as PropertyDetailSerializer handles updates.
        Kept for consistency and potential edge cases.
        """
        amenity_ids = validated_data.pop('amenity_ids', None)
        gallery_images_data = validated_data.pop('gallery_images_data', None)
        latitude = validated_data.pop('latitude', None)
        longitude = validated_data.pop('longitude', None)
        
        # Set is_approved to False when property is updated
        instance.is_approved = False
        # Clear rejection note when property is updated
        instance.rejection_note = None
        
        # Handle location PointField conversion
        if latitude is not None and longitude is not None:
            instance.location = Point(float(longitude), float(latitude))  # Point expects (lon, lat)
        elif latitude is None and longitude is None:
            # If both are None, keep existing location
            pass
        else:
            # If only one is provided, clear location
            instance.location = None
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if amenity_ids is not None:
            instance.amenities.set(amenity_ids)
        
        # Handle gallery images - only add new images (no updates, no IDs)
        if gallery_images_data is not None:
            for image_data in gallery_images_data:
                if isinstance(image_data, dict) and 'image' in image_data:
                    image_file = image_data['image']
                    # Always create new image
                    PropertyGallery.objects.create(
                        property=instance,
                        image=image_file
                    )
        
        return instance
