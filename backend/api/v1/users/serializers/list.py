from rest_framework import serializers
from apps.users.models import User
from config.storage import get_storage_url as get_storage_key


class UserListSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='role_code', read_only=True)
    verification_status = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    document_uploads = serializers.SerializerMethodField()
    country_name = serializers.CharField(source='country.name', read_only=True)
    country_code = serializers.CharField(source='country.code', read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "role",
            "mobile_number",
            "full_name",
            "address",
            "seller_type",
            "verification_status",
            "rejection_note",
            "company_name",
            "website_url",
            "license_number",
            "emirates_id_number",
            "country",
            "country_name",
            "country_code",
            "state",
            "city",
            "is_mobile_verified",
            "profile_picture",
            "document_uploads",
            "is_subscribed",
            "is_suspended",
            "date_joined",
        )
        read_only_fields = (
            "id",
            "role",
            "verification_status",
            "is_mobile_verified",
            "is_subscribed",
            "is_suspended",
            "date_joined",
            "country_name",
            "country_code",
        )

    def get_verification_status(self, obj):
        return obj.verification_status.lower() if obj.verification_status else None

    def get_profile_picture(self, obj):
        return get_storage_key(obj.profile_picture)

    def get_document_uploads(self, obj):
        return get_storage_key(obj.document_uploads)

    def to_representation(self, instance):
        """
        Remove seller-specific fields if user role is seeker
        Remove verification_status for admins
        Strip spaces from mobile_number and whatsapp_number
        Only show is_subscribed for current user or admin users
        """
        representation = super().to_representation(instance)
        
        # Strip spaces from phone numbers
        if representation.get('mobile_number'):
            representation['mobile_number'] = representation['mobile_number'].replace(' ', '')
        if representation.get('whatsapp_number'):
            representation['whatsapp_number'] = representation['whatsapp_number'].replace(' ', '')
        
        # Only show is_subscribed for current user or admin users
        request = self.context.get('request')
        should_show_is_subscribed = False
        
        if request and request.user and request.user.is_authenticated:
            # Show is_subscribed if requesting user is admin or viewing themselves
            if getattr(request.user, 'role_code', None) == 'admin' or request.user.id == instance.id:
                should_show_is_subscribed = True
        
        # Remove is_subscribed if we shouldn't show it
        if not should_show_is_subscribed:
            representation.pop('is_subscribed', None)
        
        # Remove verification_status for admins (not needed)
        if getattr(instance, "role_code", None) == 'admin':
            representation.pop('verification_status', None)
            representation.pop('rejection_note', None)
        
        if getattr(instance, "role_code", None) == 'seeker':
            # Remove seller-specific fields
            fields_to_remove = [
                'seller_type',
                'company_name',
                'website_url',
                'license_number',
                'emirates_id_number',
                'document_uploads',
                'country',
                'country_name',
                'country_code',
                'state',
                'city',
            ]
            for field in fields_to_remove:
                representation.pop(field, None)
        
        return representation
