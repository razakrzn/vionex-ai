from rest_framework import serializers
from apps.users.models import User, get_or_create_system_role
from apps.countries.models import Country


def get_storage_key(file_field):
    """Return the provider-agnostic object key stored for a file field."""
    return getattr(file_field, "name", None) if file_field else None


class UserDetailSerializer(serializers.ModelSerializer):
    role = serializers.CharField(required=False, allow_null=True, write_only=True)
    profile_picture = serializers.ImageField(required=False, allow_null=True, write_only=False, use_url=False)
    document_uploads = serializers.FileField(required=False, allow_null=True, write_only=False, use_url=False)
    country = serializers.IntegerField(required=False, allow_null=True, write_only=True, source='country_id')
    country_name = serializers.CharField(source='country.name', read_only=True)
    country_code = serializers.CharField(source='country.code', read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "role",
            "mobile_number",
            "whatsapp_number",
            "full_name",
            "address",
            "seller_type",
            "verification_status",
            "rejection_note",
            "company_name",
            "website_url",
            "license_number",
            "emirates_id_number",
            "about_me",
            "country",
            "country_name",
            "country_code",
            "state",
            "city",
            "is_mobile_verified",
            "is_email_verified",
            "profile_picture",
            "document_uploads",
            "is_subscribed",
            "is_suspended",
            "suspension_reason",
            "suspended_at",
            "referral_code",
            "date_joined",
            "last_login",
        )
        read_only_fields = (
            "id",
            "is_mobile_verified",
            "is_email_verified",
            "is_subscribed",
            "is_suspended",
            "suspension_reason",
            "suspended_at",
            "date_joined",
            "last_login",
            "country_name",
            "country_code",
            "verification_status",
            "referral_code",
        )

    def validate_mobile_number(self, value):
        """Strip spaces from mobile_number"""
        if value:
            return value.replace(' ', '')
        return value

    def validate_whatsapp_number(self, value):
        """Strip spaces from whatsapp_number"""
        if value:
            return value.replace(' ', '')
        return value

    def validate_country(self, value):
        """Validate that country exists if provided"""
        if value is not None:
            try:
                Country.objects.get(id=value)
            except Country.DoesNotExist:
                raise serializers.ValidationError("Country with this ID does not exist.")
        return value

    def validate_role(self, value):
        """Validate role if provided"""
        if value is not None:
            valid_role_codes = ['owner', 'seeker', 'gym_owner', 'admin']
            if value not in valid_role_codes:
                raise serializers.ValidationError(
                    f"Invalid role. Must be one of: {', '.join(valid_role_codes)}"
                )
        return value

    def update(self, instance, validated_data):
        """
        Update user instance.
        If user is rejected and updating their own details, change verification_status to PENDING.
        Handle role_code updates by updating custom_role.
        """
        request = self.context.get('request')
        
        # Handle role update separately (it's not a direct model field)
        role_code = validated_data.pop('role', None)
        if role_code is not None:
            # Capture old role_code before updating
            old_role_code = instance.role_code
            
            # Only allow users to update their own role (not admins changing others)
            # Prevent non-admins from assigning admin role
            if role_code == 'admin':
                if not (request and request.user.is_authenticated and 
                       (request.user.is_superuser or 
                        getattr(request.user, 'role_code', None) == 'admin')):
                    raise serializers.ValidationError(
                        {"role_code": "Only administrators can assign the admin role."}
                    )
            
            # Get or create the role and assign it
            role_obj = get_or_create_system_role(role_code)
            instance.custom_role = role_obj
            
            # If changing from seeker to owner/gym_owner, set verification_status to PENDING
            if old_role_code == 'seeker' and role_code in ['owner', 'gym_owner']:
                instance.verification_status = User.VerificationStatus.PENDING
                instance.rejection_note = None  # Clear rejection note when changing role
        
        # Check if user is rejected and updating their own details (not an admin updating someone else)
        # Only apply this logic if:
        # 1. User's current status is REJECTED
        # 2. User is updating their own profile (not an admin updating someone else)
        # 3. The user being updated is not an admin (admins shouldn't be rejected)
        # 4. Role is not being changed (role change is handled above)
        if (role_code is None and
            instance.verification_status == User.VerificationStatus.REJECTED and 
            request and request.user.is_authenticated and
            request.user.id == instance.id and
            getattr(instance, "role_code", None) != 'admin'):
            # User is rejected and updating their own details
            # Change verification status to PENDING
            instance.verification_status = User.VerificationStatus.PENDING
            instance.rejection_note = None  # Clear rejection note when resubmitting
        
        # Update all validated fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

    def to_representation(self, instance):
        """
        Remove seller-specific fields if user role is seeker
        Remove verification_status for admins
        Strip spaces from mobile_number and whatsapp_number
        Return profile_picture and document_uploads as stored object keys
        Only show is_subscribed for current user or admin users
        """
        representation = super().to_representation(instance)
        representation['role'] = getattr(instance, "role_code", None)
        
        # Strip spaces from phone numbers
        if representation.get('mobile_number'):
            representation['mobile_number'] = representation['mobile_number'].replace(' ', '')
        if representation.get('whatsapp_number'):
            representation['whatsapp_number'] = representation['whatsapp_number'].replace(' ', '')
        
        # Ensure file fields serialize as provider-agnostic storage keys.
        if 'profile_picture' in representation and representation['profile_picture']:
            representation['profile_picture'] = get_storage_key(instance.profile_picture)
        
        # Ensure file fields serialize as provider-agnostic storage keys.
        if 'document_uploads' in representation and representation['document_uploads']:
            representation['document_uploads'] = get_storage_key(instance.document_uploads)
        
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
                'country_name',
                'country_code',
                'state',
                'city',
            ]
            for field in fields_to_remove:
                representation.pop(field, None)
        
        return representation
