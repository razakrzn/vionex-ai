from rest_framework import serializers
import json
import logging
from apps.fitness.models import Gym, GymImage
from .gym_type import GymTypeListSerializer
from .facility import FacilityListSerializer
from .membership_package import MembershipPackageListSerializer

logger = logging.getLogger(__name__)


def get_storage_key(file_field):
    """Return the provider-agnostic object key stored for a file field."""
    return getattr(file_field, "name", None) if file_field else None


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


class GymImageSerializer(serializers.ModelSerializer):
    """Serializer for GymImage - read-only for responses"""
    image = serializers.SerializerMethodField()

    class Meta:
        model = GymImage
        fields = ("id", "image")
        read_only_fields = ("id",)

    def get_image(self, obj):
        """Return the stored object key for the image."""
        return get_storage_key(obj.image)


class GymImageCreateSerializer(serializers.Serializer):
    """Nested serializer for creating gallery images (new images only)"""
    image = serializers.ImageField(required=True)


class PackagesDataField(serializers.ListField):
    """Custom field that handles JSON strings from form-data for packages_data"""
    
    def to_internal_value(self, data):
        # Handle list with single string element (QueryDict returns list)
        if isinstance(data, list):
            if len(data) == 1 and isinstance(data[0], str):
                # Extract the string and process it immediately
                data_str = data[0].strip()
                if data_str.startswith('[') and data_str.endswith(']'):
                    try:
                        parsed = json.loads(data_str)
                        if isinstance(parsed, list):
                            # Validate each item is a dict
                            validated_list = []
                            for idx, item in enumerate(parsed):
                                if isinstance(item, dict):
                                    validated_list.append(item)
                                else:
                                    logger.warning(f"[PackagesDataField] Item[{idx}] is not a dict, skipping: {item}, type={type(item)}")
                            # Call parent to handle list validation
                            return super().to_internal_value(validated_list)
                        else:
                            logger.warning(f"[PackagesDataField] Parsed JSON is not a list: {parsed}, type={type(parsed)}")
                            return super().to_internal_value([])
                    except (json.JSONDecodeError, ValueError) as e:
                        logger.error(f"[PackagesDataField] JSON parse error: {e}, data: {data_str[:100]}")
                        return super().to_internal_value([])
                else:
                    logger.warning(f"[PackagesDataField] String from list doesn't look like JSON array: {data_str[:50]}")
                    return super().to_internal_value([])
            else:
                # Multiple items in list - check if they're all dicts or strings
                validated_list = []
                for idx, item in enumerate(data):
                    if isinstance(item, dict):
                        validated_list.append(item)
                    elif isinstance(item, str):
                        # If item is a string, try to parse it as JSON
                        try:
                            parsed_item = json.loads(item)
                            if isinstance(parsed_item, dict):
                                validated_list.append(parsed_item)
                            elif isinstance(parsed_item, list):
                                # If it's a list, extract dicts from it
                                for sub_item in parsed_item:
                                    if isinstance(sub_item, dict):
                                        validated_list.append(sub_item)
                            else:
                                logger.warning(f"[PackagesDataField] List item[{idx}] parsed but not a dict or list: {parsed_item}")
                        except (json.JSONDecodeError, ValueError) as e:
                            logger.warning(f"[PackagesDataField] List item[{idx}] is a string but not valid JSON: {item}, error: {e}")
                    else:
                        logger.warning(f"[PackagesDataField] List item[{idx}] is not a dict or string, skipping: {item}, type={type(item)}")
                return super().to_internal_value(validated_list)
        
        # Handle JSON string from form-data (direct string, not in list)
        if isinstance(data, str):
            data = data.strip()
            # Try parsing as JSON
            if data.startswith('[') and data.endswith(']'):
                try:
                    parsed = json.loads(data)
                    if isinstance(parsed, list):
                        # Validate each item is a dict
                        validated_list = []
                        for idx, item in enumerate(parsed):
                            if isinstance(item, dict):
                                validated_list.append(item)
                            else:
                                logger.warning(f"[PackagesDataField] Item[{idx}] is not a dict, skipping: {item}, type={type(item)}")
                        # Call parent to handle list validation
                        return super().to_internal_value(validated_list)
                    else:
                        logger.warning(f"[PackagesDataField] Parsed JSON is not a list: {parsed}, type={type(parsed)}")
                        return super().to_internal_value([])
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"[PackagesDataField] JSON parse error: {e}, data: {data[:100]}")
                    return super().to_internal_value([])
            else:
                logger.warning(f"[PackagesDataField] String doesn't start/end with brackets: {data[:50]}")
                return super().to_internal_value([])
        
        # Handle dict (DRF sometimes converts lists to dicts with numeric keys)
        if isinstance(data, dict):
            try:
                # Check if it's a dict with numeric string keys (like {"0": {...}, "1": {...}})
                if all(str(k).isdigit() for k in data.keys() if k):
                    # Sort by key and extract values
                    sorted_keys = sorted([int(k) for k in data.keys() if str(k).isdigit()])
                    data = [data[str(k)] for k in sorted_keys]
                    # Recursively process the extracted list
                    return self.to_internal_value(data)
                else:
                    # Not numeric keys, try to get values
                    data = list(data.values())
                    return self.to_internal_value(data)
            except (ValueError, KeyError, TypeError) as e:
                logger.error(f"[PackagesDataField] Dict conversion error: {e}")
                return super().to_internal_value([])
        
        # If we get here, something unexpected happened
        logger.error(f"[PackagesDataField] Unexpected data type: {data}, type: {type(data)}")
        return super().to_internal_value([])


class GalleryImagesToDeleteField(serializers.ListField):
    """Custom field that handles JSON strings from form-data"""
    
    def to_internal_value(self, data):
        # Handle list with single string element (QueryDict returns list)
        if isinstance(data, list) and len(data) == 1 and isinstance(data[0], str):
            # Extract the string and process it
            data = data[0]
        
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


class PackagesToDeleteField(serializers.ListField):
    """Custom field that handles JSON strings from form-data for packages_to_delete"""
    
    def to_internal_value(self, data):
        # Handle list with single string element (QueryDict returns list)
        if isinstance(data, list) and len(data) == 1 and isinstance(data[0], str):
            # Extract the string and process it
            data = data[0]
        
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


class FacilityIdsField(serializers.ListField):
    """Custom field that handles JSON strings from form-data for facility_ids"""
    
    def to_internal_value(self, data):
        # Handle list with single string element (QueryDict returns list)
        if isinstance(data, list) and len(data) == 1 and isinstance(data[0], str):
            # Extract the string and process it
            data = data[0]
        
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


class OffDayField(serializers.JSONField):
    """Custom JSONField that handles JSON strings from form-data for off_day"""
    
    def to_internal_value(self, data):
        # Handle None or empty string - return empty list to match model default
        if data is None or (isinstance(data, str) and not data.strip()):
            return []
        
        # If already a list, return it
        if isinstance(data, list):
            return data
        
        # Handle JSON string from form-data
        if isinstance(data, str):
            data = data.strip()
            # Try parsing as JSON
            try:
                parsed = json.loads(data)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, ValueError, TypeError):
                # If JSON parsing fails, try comma-separated values
                try:
                    # Remove brackets if present and split by comma
                    cleaned = data.strip('[]')
                    parsed_list = [x.strip().strip('"\'') for x in cleaned.split(',') if x.strip()]
                    return parsed_list
                except (ValueError, TypeError):
                    pass
        
        # Handle dict (DRF sometimes converts lists to dicts)
        if isinstance(data, dict):
            try:
                # Sort by key and extract values
                sorted_keys = sorted([int(k) for k in data.keys() if str(k).isdigit()])
                return [data[str(k)] for k in sorted_keys]
            except (ValueError, KeyError, TypeError):
                return list(data.values())
        
        # Call parent for default JSONField validation
        return super().to_internal_value(data)


class SocialMediaField(serializers.JSONField):
    """Custom JSONField that handles JSON strings from form-data for social_media"""
    
    def to_internal_value(self, data):
        # Handle None or empty string - return empty dict to match model default
        if data is None or (isinstance(data, str) and not data.strip()):
            return {}
        
        # If already a dict, return it
        if isinstance(data, dict):
            return data
        
        # Handle JSON string from form-data
        if isinstance(data, str):
            data = data.strip()
            # Try parsing as JSON
            try:
                parsed = json.loads(data)
                if isinstance(parsed, dict):
                    return parsed
                else:
                    # Not a dict, return empty dict
                    logger.warning(f"[SocialMediaField] Parsed JSON is not a dict: {parsed}, type={type(parsed)}")
                    return {}
            except (json.JSONDecodeError, ValueError, TypeError) as e:
                # If JSON parsing fails, return empty dict
                logger.error(f"[SocialMediaField] JSON parse error: {e}, data: {data[:100]}")
                return {}
        
        # Handle list (sometimes QueryDict wraps single string in a list)
        if isinstance(data, list):
            if len(data) == 1 and isinstance(data[0], str):
                # Recursively process the string
                return self.to_internal_value(data[0])
            else:
                # Multiple items or non-string items, return empty dict
                logger.warning(f"[SocialMediaField] Unexpected list format: {data}")
                return {}
        
        # Call parent for default JSONField validation
        return super().to_internal_value(data)


class GymListSerializer(serializers.ModelSerializer):
    gym_type_name = serializers.SerializerMethodField()
    rejection_note = serializers.SerializerMethodField()
    main_image = MainImageField(read_only=True)
    distance_km = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()

    class Meta:
        model = Gym
        fields = (
            "id",
            "name",
            "gym_type_name",
            "address",
            "gender_allowed",
            "is_approved",
            "is_active",
            "opening_time",
            "closing_time",
            "is_24_hours",
            "off_day",
            "main_image",
            "rejection_note",
            "distance_km",
            "created_at",
            "expires_at",
            "days_until_expiry",
            "views_count",
        )
        read_only_fields = ("id", "gym_type_name", "is_approved", "is_active", "main_image", "rejection_note", "distance_km", "created_at", "expires_at", "days_until_expiry", "views_count")

    def get_gym_type_name(self, obj):
        """Return just the name of the gym type"""
        return obj.gym_type.name if obj.gym_type else None

    def get_rejection_note(self, obj):
        """Return rejection note only if gym is not approved."""
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

    def get_distance_km(self, obj):
        """Return distance if it was calculated (from radius search)"""
        # Check if distance was calculated and stored in request
        request = self.context.get('request')
        if request and hasattr(request, '_gym_distances'):
            return request._gym_distances.get(obj.id, None)
        return None

    def to_representation(self, instance):
        """
        Override to conditionally include distance_km only when lat/lng are provided,
        and conditionally include views_count based on user role and ownership.
        """
        data = super().to_representation(instance)
        
        # Only include distance_km if lat and lng query parameters are provided
        request = self.context.get('request')
        if request:
            lat = request.query_params.get('lat', None)
            lng = request.query_params.get('lng', None)
            
            # Remove distance_km from response if lat/lng are not provided
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
                # Include views_count if user is gym_owner and viewing their own gym
                elif user_role == 'gym_owner' and instance.owner == user:
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


class GymDetailSerializer(serializers.ModelSerializer):
    gym_type = GymTypeListSerializer(read_only=True)
    facilities = FacilityListSerializer(many=True, read_only=True)
    main_image = MainImageField(required=False, allow_null=True, help_text="Main image file for the gym")
    gallery_images = GymImageSerializer(many=True, read_only=True)
    owner = OwnerSerializer(read_only=True)
    rejection_note = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()
    off_day = OffDayField(required=False, allow_null=True)
    social_media = SocialMediaField(required=False, allow_null=True)
    packages = MembershipPackageListSerializer(many=True, read_only=True)
    
    # Write-only fields for relationships
    gym_type_id = serializers.IntegerField(write_only=True, required=False)
    facility_ids = FacilityIdsField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True,
        help_text="List of facility IDs (can be JSON string, array, or comma-separated)"
    )
    # Write-only field for creating/updating gallery images
    gallery_images_data = GymImageCreateSerializer(many=True, write_only=True, required=False)
    # Write-only field for deleting specific gallery images by ID
    gallery_images_to_delete = GalleryImagesToDeleteField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True,
        help_text="List of gallery image IDs to delete (can be JSON string, array, or comma-separated)"
    )
    # Write-only field for creating/updating membership packages
    packages_data = PackagesDataField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True,
        write_only=True,
        help_text="List of membership packages to create or update. Include 'id' to update existing package, omit 'id' to create new."
    )
    # Write-only field for deleting membership packages
    packages_to_delete = PackagesToDeleteField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        write_only=True,
        help_text="List of membership package IDs to delete (can be JSON string, array, or comma-separated)"
    )

    class Meta:
        model = Gym
        fields = (
            "id",
            "name",
            "gym_type",
            "gym_type_id",
            "description",
            "address",
            "latitude",
            "longitude",
            "facilities",
            "facility_ids",
            "opening_time",
            "closing_time",
            "is_24_hours",
            "off_day",
            "gender_allowed",
            "social_media",
            "main_image",
            "gallery_images",
            "gallery_images_data",
            "gallery_images_to_delete",
            "packages",
            "packages_data",
            "packages_to_delete",
            "owner",
            "is_approved",
            "is_active",
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
            "views_count",
            "is_active",
            "created_at",
            "updated_at",
            "expires_at",
            "approved_at",
            "days_until_expiry",
        )

    def get_rejection_note(self, obj):
        """Return rejection note only if gym is not approved."""
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

    def validate_social_media(self, value):
        """Validate that social_media is a dictionary"""
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("social_media must be a dictionary/object")
        return value or {}

    def validate_off_day(self, value):
        """Validate that off_day is a list"""
        if value is not None and not isinstance(value, list):
            raise serializers.ValidationError("off_day must be a list/array")
        return value or []

    def validate_packages_data(self, value):
        """Validate membership packages data for updates"""
        if value is None:
            return []
        
        if not isinstance(value, list):
            raise serializers.ValidationError("packages_data must be a list")
        
        for idx, package in enumerate(value):
            if not isinstance(package, dict):
                raise serializers.ValidationError(f"Package at index {idx} must be a dictionary")
            
            package_id = package.get('id')
            is_update = package_id is not None
            
            # For updates, only title is required; for creates, all fields are required
            if is_update:
                # Updating existing package - only title is required
                if 'title' not in package:
                    raise serializers.ValidationError(f"Package at index {idx} missing required field: title")
                
                # Validate title is not empty if provided
                if package.get('title') and not str(package['title']).strip():
                    raise serializers.ValidationError(f"Package at index {idx} title cannot be empty")
                
                # Validate price if provided
                if 'price' in package:
                    try:
                        price = float(package['price'])
                        if price < 0:
                            raise serializers.ValidationError(f"Package at index {idx} price must be non-negative")
                    except (ValueError, TypeError):
                        raise serializers.ValidationError(f"Package at index {idx} has invalid price: {package.get('price')}")
                
                # Validate duration if provided
                if 'duration' in package:
                    duration_value = package.get('duration')
                    if duration_value and not isinstance(duration_value, str):
                        raise serializers.ValidationError(f"Package at index {idx} duration must be a string")
                    if duration_value and not str(duration_value).strip():
                        raise serializers.ValidationError(f"Package at index {idx} duration cannot be empty")
            else:
                # Creating new package - all fields are required
                required_fields = ['title', 'price', 'duration']
                for field in required_fields:
                    if field not in package:
                        raise serializers.ValidationError(f"Package at index {idx} missing required field: {field}")
                
                # Validate title is not empty
                if not package['title'] or not str(package['title']).strip():
                    raise serializers.ValidationError(f"Package at index {idx} title cannot be empty")
                
                # Validate price is a valid decimal
                try:
                    price = float(package['price'])
                    if price < 0:
                        raise serializers.ValidationError(f"Package at index {idx} price must be non-negative")
                except (ValueError, TypeError):
                    raise serializers.ValidationError(f"Package at index {idx} has invalid price: {package.get('price')}")
                
                # Validate duration is a non-empty string
                duration_value = package.get('duration')
                if not duration_value or not isinstance(duration_value, str) or not str(duration_value).strip():
                    raise serializers.ValidationError(f"Package at index {idx} duration must be a non-empty string")
        
        return value

    def to_internal_value(self, data):
        """Handle multipart/form-data parsing for gallery_images_data and gallery_images_to_delete"""
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
        
        # Handle packages_data - parse JSON string if needed
        if hasattr(data, 'get'):
            packages_data_value = data.get('packages_data')
            if packages_data_value is not None:
                if isinstance(packages_data_value, str):
                    packages_data_value = packages_data_value.strip()
                    try:
                        parsed = json.loads(packages_data_value)
                        if isinstance(parsed, list):
                            if isinstance(data, QueryDict):
                                data._mutable = True
                            result['packages_data'] = parsed
                    except (json.JSONDecodeError, ValueError, TypeError):
                        pass
        
        # Note: packages_to_delete is now handled by PackagesToDeleteField custom field
        
        return result

    def update(self, instance, validated_data):
        facility_ids = validated_data.pop('facility_ids', None)
        gallery_images_data = validated_data.pop('gallery_images_data', None)
        gallery_images_to_delete = validated_data.pop('gallery_images_to_delete', None)
        packages_data = validated_data.pop('packages_data', None)
        packages_to_delete = validated_data.pop('packages_to_delete', None)
        
        # Set is_approved to False when gym is updated
        instance.is_approved = False
        # Clear rejection note when gym is updated
        instance.rejection_note = None
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if facility_ids is not None:
            instance.facilities.set(facility_ids)
        
        # Handle gallery images deletion first
        if gallery_images_to_delete is not None and len(gallery_images_to_delete) > 0:
            # Delete only the specified gallery images
            instance.gallery_images.filter(id__in=gallery_images_to_delete).delete()
        
        # Handle gallery images - only add new images
        if gallery_images_data is not None:
            for image_data in gallery_images_data:
                if isinstance(image_data, dict) and 'image' in image_data:
                    image_file = image_data['image']
                    # Always create new image
                    GymImage.objects.create(
                        gym=instance,
                        image=image_file
                    )
        
        # Handle membership packages deletion first
        if packages_to_delete is not None and len(packages_to_delete) > 0:
            # Delete only packages that belong to this gym
            instance.packages.filter(id__in=packages_to_delete).delete()
        
        # Handle membership packages - create or update
        if packages_data is not None:
            from apps.fitness.models import MembershipPackage
            for package_data in packages_data:
                package_id = package_data.get('id')
                
                if package_id:
                    # Update existing package - only update fields that are provided
                    try:
                        package = instance.packages.get(id=package_id)
                        # Only update fields that are provided
                        if 'title' in package_data:
                            package.title = package_data['title']
                        if 'price' in package_data:
                            package.price = package_data['price']
                        if 'duration' in package_data:
                            package.duration = package_data['duration']
                        if 'description' in package_data:
                            package.description = package_data['description']
                        package.save()
                    except MembershipPackage.DoesNotExist:
                        # Package ID provided but doesn't exist or doesn't belong to this gym
                        # Skip it or raise error - for now we'll skip
                        pass
                else:
                    # Create new package - all fields required
                    MembershipPackage.objects.create(
                        gym=instance,
                        title=package_data['title'],
                        price=package_data['price'],
                        duration=package_data['duration'],
                        description=package_data.get('description', '')
                    )
        
        return instance


class GymCreateSerializer(serializers.ModelSerializer):
    gym_type_id = serializers.IntegerField()
    facility_ids = FacilityIdsField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        help_text="List of facility IDs (can be JSON string, array, or comma-separated)"
    )
    main_image = serializers.ImageField(required=False, allow_null=True)
    off_day = OffDayField(required=False, allow_null=True)
    social_media = SocialMediaField(required=False, allow_null=True)
    # Write-only field for creating gallery images
    gallery_images_data = GymImageCreateSerializer(many=True, required=False, write_only=True)
    # Read-only field to return gallery images in response
    gallery_images_list = GymImageSerializer(many=True, read_only=True, source='gallery_images')
    # Write-only field for creating membership packages
    packages_data = PackagesDataField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True,
        write_only=True,
        help_text="List of membership packages to create with the gym"
    )

    class Meta:
        model = Gym
        fields = (
            "id",
            "name",
            "gym_type_id",
            "description",
            "address",
            "latitude",
            "longitude",
            "facility_ids",
            "opening_time",
            "closing_time",
            "is_24_hours",
            "off_day",
            "gender_allowed",
            "social_media",
            "main_image",
            "gallery_images_data",
            "gallery_images_list",
            "packages_data",
            "is_approved",
            "is_active",
        )
        read_only_fields = ("id", "gallery_images_list", "is_approved", "is_active")

    def validate_gym_type_id(self, value):
        from apps.fitness.models import GymType
        try:
            GymType.objects.get(id=value)
        except GymType.DoesNotExist:
            raise serializers.ValidationError("Invalid gym type")
        return value

    def validate_social_media(self, value):
        """Validate that social_media is a dictionary"""
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("social_media must be a dictionary/object")
        return value or {}

    def validate_off_day(self, value):
        """Validate that off_day is a list"""
        if value is not None and not isinstance(value, list):
            raise serializers.ValidationError("off_day must be a list/array")
        return value or []

    def validate_packages_data(self, value):
        """Validate membership packages data"""
        if value is None:
            return []
        
        if not isinstance(value, list):
            raise serializers.ValidationError("packages_data must be a list")
        
        required_fields = ['title', 'price', 'duration']
        for idx, package in enumerate(value):
            if not isinstance(package, dict):
                raise serializers.ValidationError(f"Package at index {idx} must be a dictionary")
            
            # Check required fields
            for field in required_fields:
                if field not in package:
                    raise serializers.ValidationError(f"Package at index {idx} missing required field: {field}")
            
            # Validate title is not empty
            if not package['title'] or not str(package['title']).strip():
                raise serializers.ValidationError(f"Package at index {idx} title cannot be empty")
            
            # Validate price is a valid decimal
            try:
                price = float(package['price'])
                if price < 0:
                    raise serializers.ValidationError(f"Package at index {idx} price must be non-negative")
            except (ValueError, TypeError):
                raise serializers.ValidationError(f"Package at index {idx} has invalid price: {package.get('price')}")
            
            # Validate duration is a non-empty string
            duration_value = package.get('duration')
            if not duration_value or not isinstance(duration_value, str) or not str(duration_value).strip():
                raise serializers.ValidationError(f"Package at index {idx} duration must be a non-empty string")
        
        return value

    def to_internal_value(self, data):
        """Handle multipart/form-data parsing for time, boolean, and gallery images"""
        import json
        from django.http import QueryDict
        
        # Handle multipart/form-data images parsing
        if hasattr(data, 'getlist'):
            # Check for gallery_images_data files (multiple files with same field name)
            gallery_files = data.getlist('gallery_images_data')
            
            # Also check for indexed format: gallery_images_data[0][image]
            gallery_list = []
            if gallery_files:
                # Filter only actual file objects
                for file_obj in gallery_files:
                    if file_obj and hasattr(file_obj, 'read'):
                        gallery_list.append({'image': file_obj})
            
            # Check for indexed format: gallery_images_data[0][image], gallery_images_data[1][image], etc.
            if isinstance(data, QueryDict):
                data._mutable = True
                index = 0
                while True:
                    image_key = f'gallery_images_data[{index}][image]'
                    if image_key in data:
                        file_obj = data.get(image_key)
                        if file_obj and hasattr(file_obj, 'read'):
                            gallery_list.append({'image': file_obj})
                        index += 1
                    else:
                        break
            
            # Set the gallery_images_data list (only if we have valid files)
            if gallery_list:
                if isinstance(data, QueryDict):
                    if not data._mutable:
                        data._mutable = True
                    # Remove old entries
                    if 'gallery_images_data' in data:
                        while 'gallery_images_data' in data:
                            data.pop('gallery_images_data')
                    # Remove indexed entries
                    index = 0
                    while True:
                        image_key = f'gallery_images_data[{index}][image]'
                        if image_key in data:
                            data.pop(image_key)
                            index += 1
                        else:
                            break
                    # Set as list
                    data['gallery_images_data'] = gallery_list
                elif isinstance(data, dict):
                    data['gallery_images_data'] = gallery_list
            elif isinstance(data, QueryDict) and 'gallery_images_data' in data:
                # If gallery_images_data exists but has no valid files, remove it to avoid validation errors
                if not data._mutable:
                    data._mutable = True
                while 'gallery_images_data' in data:
                    data.pop('gallery_images_data')
        
        # Handle time fields - ensure proper format
        if hasattr(data, 'get'):
            for time_field in ['opening_time', 'closing_time']:
                time_value = data.get(time_field)
                if time_value and isinstance(time_value, str):
                    # Strip whitespace
                    time_value = time_value.strip()
                    # If format is HH:MM, ensure it's valid
                    if ':' in time_value:
                        parts = time_value.split(':')
                        if len(parts) == 2:
                            # Format as HH:MM:SS
                            try:
                                hours = int(parts[0])
                                minutes = int(parts[1])
                                if 0 <= hours <= 23 and 0 <= minutes <= 59:
                                    time_value = f"{hours:02d}:{minutes:02d}:00"
                                    if isinstance(data, QueryDict):
                                        data._mutable = True
                                    data[time_field] = time_value
                            except (ValueError, IndexError):
                                pass
        
        # Handle boolean field - is_24_hours
        if hasattr(data, 'get'):
            is_24_hours_value = data.get('is_24_hours')
            if is_24_hours_value is not None:
                if isinstance(is_24_hours_value, str):
                    is_24_hours_value = is_24_hours_value.strip().lower()
                    # Convert string to boolean
                    if is_24_hours_value in ('true', '1', 'yes', 'on'):
                        is_24_hours_value = True
                    elif is_24_hours_value in ('false', '0', 'no', 'off', ''):
                        is_24_hours_value = False
                    else:
                        is_24_hours_value = bool(is_24_hours_value)
                    
                    if isinstance(data, QueryDict):
                        data._mutable = True
                    data['is_24_hours'] = is_24_hours_value
        
        # Handle gender_allowed - trim whitespace
        if hasattr(data, 'get'):
            gender_allowed_value = data.get('gender_allowed')
            if gender_allowed_value and isinstance(gender_allowed_value, str):
                gender_allowed_value = gender_allowed_value.strip()
                if isinstance(data, QueryDict):
                    data._mutable = True
                data['gender_allowed'] = gender_allowed_value
        
        # Handle packages_data - the custom PackagesDataField will handle parsing
        # Note: facility_ids is now handled by FacilityIdsField custom field
        # The custom PackagesDataField.to_internal_value() will be called by DRF
        # and will handle the JSON string parsing automatically
        
        # Note: off_day is now handled by OffDayField custom field
        # Note: social_media is now handled by SocialMediaField custom field
        
        # Store gallery_images_data before calling super() as it might get lost during nested serializer validation
        gallery_images_raw = data.get('gallery_images_data') if 'gallery_images_data' in data else None
        
        result = super().to_internal_value(data)
        
        # Restore gallery_images_data if it was lost
        if hasattr(result, 'keys'):
            if 'gallery_images_data' not in result and gallery_images_raw:
                result['gallery_images_data'] = gallery_images_raw
        
        return result

    def create(self, validated_data):
        facility_ids = validated_data.pop('facility_ids', None)
        gallery_images_data = validated_data.pop('gallery_images_data', None)
        packages_data = validated_data.pop('packages_data', None)
        
        # Set owner to current user
        validated_data['owner'] = self.context['request'].user
        
        gym = Gym.objects.create(**validated_data)
        
        if facility_ids:
            gym.facilities.set(facility_ids)
        
        # Handle gallery images
        if gallery_images_data:
            for image_data in gallery_images_data:
                if isinstance(image_data, dict) and 'image' in image_data:
                    image_file = image_data['image']
                    # Skip if image file is empty or None
                    if image_file and hasattr(image_file, 'read'):
                        GymImage.objects.create(
                            gym=gym,
                            image=image_file
                        )
        
        # Create membership packages
        if packages_data:
            from apps.fitness.models import MembershipPackage
            for package_data in packages_data:
                MembershipPackage.objects.create(
                    gym=gym,
                    title=package_data['title'],
                    price=package_data['price'],
                    duration=package_data['duration'],
                    description=package_data.get('description', '')
                )
        
        return gym


class GymApproveRejectSerializer(serializers.ModelSerializer):
    """Minimal serializer for approve/reject responses"""
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)

    class Meta:
        model = Gym
        fields = ("id", "name", "description", "owner_name", "is_approved", "is_active")
        read_only_fields = ("id", "name", "description", "owner_name", "is_approved", "is_active")
