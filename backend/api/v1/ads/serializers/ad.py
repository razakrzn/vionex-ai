from rest_framework import serializers
import json
from apps.ads.models import Ad, AdGallery
from config.storage import get_storage_url as get_storage_key


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


class LogoField(serializers.ImageField):
    """Custom ImageField that returns the Cloudinary URL for reading."""
    
    def to_representation(self, value):
        return get_storage_key(value)


class AdGallerySerializer(serializers.ModelSerializer):
    """Serializer for AdGallery - read-only for responses"""
    image = serializers.SerializerMethodField()

    class Meta:
        model = AdGallery
        fields = ("id", "image")
        read_only_fields = ("id",)

    def get_image(self, obj):
        """Return the stored object key for the image."""
        return get_storage_key(obj.image)


class AdGalleryCreateSerializer(serializers.Serializer):
    """Nested serializer for creating gallery images (new images only)"""
    image = serializers.ImageField(required=True)




class AdListSerializer(serializers.ModelSerializer):
    """Serializer for listing ads"""
    logo = LogoField(read_only=True)
    gallery_images = AdGallerySerializer(many=True, read_only=True)

    class Meta:
        model = Ad
        fields = (
            "id",
            "title",
            "brand_name",
            "logo",
            "location",
            "whatsapp_number",
            "video_url",
            "image_url",
            "total_units",
            "available_units",
            "billing_cycle",
            "verification_status",
            "published_at",
            "created_date",
            "gallery_images",
        )
        read_only_fields = ("id", "verification_status", "published_at", "created_date")

    def to_representation(self, instance):
        """Strip spaces from whatsapp_number when returning"""
        representation = super().to_representation(instance)
        if representation.get('whatsapp_number'):
            representation['whatsapp_number'] = representation['whatsapp_number'].replace(' ', '')
        return representation


class AdDetailSerializer(serializers.ModelSerializer):
    """Serializer for ad details"""
    logo = LogoField(required=False, allow_null=True, help_text="Logo image file for the ad")
    gallery_images = AdGallerySerializer(many=True, read_only=True)
    
    # Write-only field for creating/updating gallery images
    gallery_images_data = AdGalleryCreateSerializer(many=True, write_only=True, required=False)
    # Write-only field for deleting specific gallery images by ID
    gallery_images_to_delete = GalleryImagesToDeleteField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True,
        help_text="List of gallery image IDs to delete (can be JSON string, array, or comma-separated)"
    )

    class Meta:
        model = Ad
        fields = (
            "id",
            "title",
            "brand_name",
            "logo",
            "location",
            "whatsapp_number",
            "video_url",
            "image_url",
            "total_units",
            "available_units",
            "billing_cycle",
            "verification_status",
            "published_at",
            "created_date",
            "updated_at",
            "gallery_images",
            "gallery_images_data",
            "gallery_images_to_delete",
        )
        read_only_fields = (
            "id",
            "gallery_images",
            "verification_status",
            "published_at",
            "created_date",
            "updated_at",
        )

    def validate_whatsapp_number(self, value):
        """Strip spaces from whatsapp_number"""
        if value:
            return value.replace(' ', '')
        return value

    def to_representation(self, instance):
        """Strip spaces from whatsapp_number when returning"""
        representation = super().to_representation(instance)
        if representation.get('whatsapp_number'):
            representation['whatsapp_number'] = representation['whatsapp_number'].replace(' ', '')
        return representation

    def to_internal_value(self, data):
        """Handle multipart/form-data parsing for gallery_images_data"""
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
                        # Store the parsed list as an attribute for later use
                        data._gallery_images_to_delete_parsed = parsed_list
                        # Remove the key from QueryDict's internal _list structure
                        if hasattr(data, '_list'):
                            data._list = [(k, v) for k, v in data._list if k != 'gallery_images_to_delete']
                        # Clear the cached dict representation
                        if hasattr(data, '_dict'):
                            data._dict = None
                        # Set it using setlist
                        data.setlist('gallery_images_to_delete', [str(item) for item in parsed_list])
                    elif isinstance(data, dict):
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
                result['gallery_images_to_delete'] = parsed_gallery_delete
            elif 'gallery_images_to_delete' in result:
                value = result['gallery_images_to_delete']
                # If it's a dict (with numeric string keys), convert to list
                if isinstance(value, dict):
                    try:
                        sorted_keys = sorted([int(k) for k in value.keys() if str(k).isdigit()])
                        result['gallery_images_to_delete'] = [int(value[str(k)]) for k in sorted_keys]
                    except (ValueError, KeyError, TypeError):
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
        """Validate gallery_images_to_delete field"""
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
        
        # If it's a dict, convert to list
        if isinstance(value, dict):
            try:
                sorted_keys = sorted([int(k) for k in value.keys() if str(k).isdigit()])
                value = [value[str(k)] for k in sorted_keys]
            except (ValueError, KeyError, TypeError):
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

    def update(self, instance, validated_data):
        gallery_images_data = validated_data.pop('gallery_images_data', None)
        gallery_images_to_delete = validated_data.pop('gallery_images_to_delete', None)
        
        # If user is admin, keep verification_status as APPROVED (or set to APPROVED)
        # Otherwise, reset to PENDING when ad is updated
        request = self.context.get('request')
        if request and request.user.is_authenticated and getattr(request.user, 'role_code', None) == 'admin':
            instance.verification_status = instance.VerificationStatus.APPROVED
        else:
            instance.verification_status = instance.VerificationStatus.PENDING
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
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
                    AdGallery.objects.create(
                        ad=instance,
                        image=image_file
                    )
        
        return instance


class AdCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating ads"""
    title = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    brand_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    location = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    whatsapp_number = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=20)
    logo = serializers.ImageField(required=False, allow_null=True)
    video_url = serializers.URLField(required=False, allow_null=True, allow_blank=True)
    image_url = serializers.URLField(required=False, allow_null=True, allow_blank=True)
    total_units = serializers.IntegerField(required=False, allow_null=True)
    available_units = serializers.IntegerField(required=False, allow_null=True)
    billing_cycle = serializers.ChoiceField(choices=Ad.BILLING_CYCLE_CHOICES, required=False, allow_null=True, allow_blank=True)
    # Write-only field for creating gallery images
    gallery_images_data = AdGalleryCreateSerializer(many=True, required=False, write_only=True)
    # Read-only field to return gallery images in response
    gallery_images_list = AdGallerySerializer(many=True, read_only=True, source='gallery_images')

    def validate_whatsapp_number(self, value):
        """Strip spaces from whatsapp_number"""
        if value:
            return value.replace(' ', '')
        return value

    def to_internal_value(self, data):
        """Handle multipart/form-data parsing for gallery_images_data"""
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
        model = Ad
        fields = (
            "id",
            "title",
            "brand_name",
            "logo",
            "location",
            "whatsapp_number",
            "video_url",
            "image_url",
            "total_units",
            "available_units",
            "billing_cycle",
            "verification_status",
            "gallery_images_data",
            "gallery_images_list",
        )
        read_only_fields = ("id", "gallery_images_list", "verification_status")

    def create(self, validated_data):
        gallery_images_data = validated_data.pop('gallery_images_data', [])
        
        # If user is admin, set verification_status to APPROVED
        request = self.context.get('request')
        if request and request.user.is_authenticated and getattr(request.user, 'role_code', None) == 'admin':
            validated_data['verification_status'] = Ad.VerificationStatus.APPROVED
        
        try:
            ad_obj = Ad.objects.create(**validated_data)
        except Exception as e:
            raise serializers.ValidationError(
                f"Database error: {str(e)}. Please check that all migrations have been applied."
            )
        
        # Create gallery images
        for image_data in gallery_images_data:
            if isinstance(image_data, dict) and 'image' in image_data:
                AdGallery.objects.create(
                    ad=ad_obj,
                    image=image_data['image']
                )
        
        return ad_obj
