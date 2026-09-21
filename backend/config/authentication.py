from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework.exceptions import AuthenticationFailed
from apps.users.models import User


class CustomJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication based on verification_status.
    Allows authentication for:
    - Admins: Always
    - Seekers: Only APPROVED
    - Owners/Gym Owners: All statuses (REJECTED/PENDING = limited, APPROVED = full)
    """
    
    def get_user(self, validated_token):
        """
        Override to handle authentication based on user role and verification_status:
        - Admins: Always allowed
        - Seekers: Must be APPROVED
        - Owners and Gym Owners: All statuses allowed (REJECTED/PENDING = limited, APPROVED = full)
        """
        try:
            user_id = validated_token.get('user_id')
        except KeyError:
            raise InvalidToken('Token contained no recognizable user identification')

        try:
            user = User.objects.get(**{'id': user_id})
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found', code='user_not_found')

        # Check if user is suspended (admins cannot be suspended)
        if getattr(user, 'is_suspended', False) and getattr(user, 'role_code', None) != 'admin':
            raise AuthenticationFailed('Account suspended', code='account_suspended')

        # Admins: Always allow
        if getattr(user, 'role_code', None) == 'admin':
            return user
        
        # Seekers: Must be APPROVED
        if getattr(user, 'role_code', None) == 'seeker':
            if user.verification_status != User.VerificationStatus.APPROVED:
                raise AuthenticationFailed('Account verification required', code='verification_required')
            return user
        
        # Owners and Gym Owners: Allow all statuses
        if getattr(user, 'role_code', None) in ['owner', 'gym_owner']:
            return user  # All statuses allowed

        return user
