from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenRefreshSerializer as BaseTokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from apps.users.models import User
from apps.users.models import get_or_create_system_role
from apps.countries.models import Country

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, min_length=6)
    email = serializers.EmailField(required=True)
    mobile_number = serializers.CharField(required=True, max_length=20)
    whatsapp_number = serializers.CharField(required=False, max_length=20, allow_blank=True, allow_null=True)
    full_name = serializers.CharField(required=False, max_length=255, allow_blank=True, allow_null=True)
    role = serializers.ChoiceField(
        choices=["owner", "seeker", "gym_owner"],
        required=True,
        write_only=True
    )
    seller_type = serializers.ChoiceField(
        choices=User.SellerTypes.choices, 
        required=False, 
        allow_null=True
    )
    company_name = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    website_url = serializers.URLField(max_length=500, required=False, allow_blank=True, allow_null=True)
    license_number = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    emirates_id_number = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    country = serializers.IntegerField(required=False, allow_null=True, write_only=True, source='country_id')
    state = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    about_me = serializers.CharField(required=False, allow_blank=True, allow_null=True, style={'base_template': 'textarea.html'})
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    document_uploads = serializers.FileField(required=False, allow_null=True)
    referral_code = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=20,
        help_text="Referral code of the user who referred this new user"
    )

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "password",
            "password_confirm",
            "role",
            "mobile_number",
            "whatsapp_number",
            "full_name",
            "seller_type",
            "company_name",
            "website_url",
            "license_number",
            "emirates_id_number",
            "country",
            "state",
            "city",
            "about_me",
            "profile_picture",
            "document_uploads",
            "referral_code",
        )
        read_only_fields = ("id",)

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

    def validate_referral_code(self, value):
        """Validate referral code if provided"""
        if value:
            value = value.strip().upper()
            # Check if referral code exists
            try:
                referrer = User.objects.get(referral_code=value)
                
                # Prevent self-referral
                if hasattr(self, 'initial_data') and 'email' in self.initial_data:
                    if referrer.email.lower() == self.initial_data.get('email', '').lower():
                        raise serializers.ValidationError("You cannot use your own referral code")
                
                # Prevent admin referral codes (admins don't get referral rewards)
                if referrer.role_code == 'admin':
                    raise serializers.ValidationError("Admin referral codes are not valid for rewards")
                    
            except User.DoesNotExist:
                raise serializers.ValidationError("Invalid referral code")
        return value
    
    def validate(self, attrs):
        if attrs.get("password") != attrs.get("password_confirm"):
            raise serializers.ValidationError({"password": "Passwords do not match"})
        
        # Prevent admin creation through registration
        if attrs.get("role") == "admin":
            raise serializers.ValidationError({
                "role": "Admin users cannot be created through registration. Please contact an administrator."
            })
        
        # Validate full_name - required unless seller_type is COMPANY
        seller_type = attrs.get("seller_type")
        if seller_type != User.SellerTypes.COMPANY:
            if not attrs.get("full_name"):
                raise serializers.ValidationError({
                    "full_name": "Full name is required"
                })
        
        # Validate seller-specific fields if role is 'owner' (Seller)
        if attrs.get("role") == "owner":
            if not seller_type:
                raise serializers.ValidationError({
                    "seller_type": "Seller type is required for sellers"
                })
            
            # Document uploads is required for owners (sellers)
            if not attrs.get("document_uploads"):
                raise serializers.ValidationError({
                    "document_uploads": "Document uploads are required for sellers"
                })
            
            # If seller_type is COMPANY, company_name and license_number should be provided
            if seller_type == User.SellerTypes.COMPANY:
                if not attrs.get("company_name"):
                    raise serializers.ValidationError({
                        "company_name": "Company name is required for Real Estate Companies"
                    })
                if not attrs.get("license_number"):
                    raise serializers.ValidationError({
                        "license_number": "License number is required for Real Estate Companies"
                    })
            
            # If seller_type is AGENT, only license_number is required (company_name is optional)
            if seller_type == User.SellerTypes.AGENT:
                if not attrs.get("license_number"):
                    raise serializers.ValidationError({
                        "license_number": "License number is required for Agents"
                    })
        
        # Validate gym_owner-specific fields
        if attrs.get("role") == "gym_owner":
            # Document uploads is required for gym owners
            if not attrs.get("document_uploads"):
                raise serializers.ValidationError({
                    "document_uploads": "Document uploads are required for gym owners"
                })
        
        return attrs

    def to_representation(self, instance):
        """Strip spaces from mobile_number and whatsapp_number when returning, and add role"""
        representation = super().to_representation(instance)
        if representation.get('mobile_number'):
            representation['mobile_number'] = representation['mobile_number'].replace(' ', '')
        if representation.get('whatsapp_number'):
            representation['whatsapp_number'] = representation['whatsapp_number'].replace(' ', '')
        # Add role_code as role in the response
        if hasattr(instance, 'role_code'):
            representation['role'] = instance.role_code
        return representation

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        role_code = validated_data.pop("role", None) or "seeker"
        
        # Handle referral_code - link user to referrer
        referral_code = validated_data.pop("referral_code", None)
        if referral_code:
            referral_code = referral_code.strip().upper()
            try:
                referrer = User.objects.get(referral_code=referral_code)
                validated_data["referred_by"] = referrer
            except User.DoesNotExist:
                # This shouldn't happen if validation worked, but handle gracefully
                pass

        # User model no longer has role field; store role in custom_role only.
        # Set custom_role BEFORE the first save to avoid any post_save defaults overriding it.
        validated_data["custom_role"] = get_or_create_system_role(role_code)

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class CustomTokenRefreshSerializer(BaseTokenRefreshSerializer):
    """
    Custom token refresh serializer that skips the is_active check.
    We handle user status checks in the view instead.
    """
    
    def validate(self, attrs):
        """
        Override validate to skip the default is_active check.
        The default TokenRefreshSerializer checks if user.is_active is True,
        but we need to handle this based on user role in the view.
        """
        refresh = attrs['refresh']
        
        try:
            # Decode and validate the token structure
            token = RefreshToken(refresh)
            # Access the token to trigger validation
            _ = token.payload
        except TokenError as e:
            raise serializers.ValidationError({'refresh': 'Token is invalid or expired'})
        except Exception as e:
            raise serializers.ValidationError({'refresh': f'Token validation failed: {str(e)}'})
        
        # Return the validated data without checking user.is_active
        # The view will handle user status checks based on role
        return {'refresh': refresh}


# Email Verification Serializers
class RequestEmailVerificationOTPSerializer(serializers.Serializer):
    """Serializer for requesting email verification OTP"""
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        """Normalize email address"""
        return value.lower().strip()


class VerifyEmailOTPSerializer(serializers.Serializer):
    """Serializer for verifying email with OTP"""
    email = serializers.EmailField(required=True)
    code = serializers.CharField(required=True, max_length=6, min_length=6)
    
    def validate_email(self, value):
        """Normalize email address"""
        return value.lower().strip()
    
    def validate_code(self, value):
        """Validate OTP code format"""
        if not value.isdigit():
            raise serializers.ValidationError("OTP code must contain only digits")
        return value


class ResendEmailVerificationOTPSerializer(serializers.Serializer):
    """Serializer for resending email verification OTP"""
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        """Normalize email address"""
        return value.lower().strip()


# Password Reset Serializers
class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for requesting password reset"""
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        """Normalize email address"""
        return value.lower().strip()


class PasswordResetVerifySerializer(serializers.Serializer):
    """Serializer for verifying password reset token"""
    token = serializers.CharField(required=True, max_length=255)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for confirming password reset"""
    token = serializers.CharField(required=True, max_length=255)
    new_password = serializers.CharField(
        write_only=True, 
        min_length=6,
        style={'input_type': 'password'},
        help_text="New password (minimum 6 characters)"
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
        min_length=6,
        style={'input_type': 'password'},
        help_text="Confirm new password"
    )
    
    def validate(self, attrs):
        """Validate that passwords match"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password': 'Passwords do not match'
            })
        return attrs

