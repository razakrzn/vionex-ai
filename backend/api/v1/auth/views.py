from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView
from datetime import datetime
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
import random
import logging

from apps.users.models import User, EmailVerificationOTP, PasswordResetToken
from apps.notifications.services import NotificationService
from apps.notifications.models import NotificationType
from .serializers import (
    RegisterSerializer, 
    LoginSerializer, 
    CustomTokenRefreshSerializer,
    RequestEmailVerificationOTPSerializer,
    VerifyEmailOTPSerializer,
    ResendEmailVerificationOTPSerializer,
    PasswordResetRequestSerializer,
    PasswordResetVerifySerializer,
    PasswordResetConfirmSerializer
)

logger = logging.getLogger(__name__)

class RegisterView(views.APIView):
    """
    User registration endpoint
    """
    permission_classes = []
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }, status=status_code)

    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        response_data = {
            "success": False,
            "message": message,
            "errors": errors or {},
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }
        return Response(response_data, status=status_code)

    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def post(self, request):
        try:
            serializer = RegisterSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            # Send email verification OTP
            try:
                code = str(random.randint(100000, 999999))
                expires_at = timezone.now() + timedelta(minutes=10)
                
                EmailVerificationOTP.objects.create(
                    user=user,
                    code=code,
                    expires_at=expires_at,
                    ip_address=self._get_client_ip(request)
                )
                
                send_mail(
                    subject='Welcome to Vionex - Verify Your Email',
                    message=f'''
Hello {user.full_name or 'User'},

Welcome to Vionex! Please verify your email address to complete your registration.

Your email verification code is: {code}

This code will expire in 10 minutes.

If you did not create this account, please ignore this email.

Best regards,
Vionex Team
                    ''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.error(f"Failed to send verification email to {user.email}: {str(e)}")
                # Don't block registration if email fails
            
            # Notify admins when an owner or gym_owner registers
            try:
                role_code = getattr(user, "role_code", None)
                if role_code in ["owner", "gym_owner"]:
                    # Get all admin users (role_code = 'admin')
                    admin_users = User.objects.filter(custom_role__code="admin")
                    notification_type = (
                        NotificationType.NEW_OWNER_REGISTERED
                        if role_code == "owner"
                        else NotificationType.NEW_GYM_OWNER_REGISTERED
                    )
                    # More attractive, action-focused titles
                    title = (
                        "New Property Owner Joined"
                        if role_code == "owner"
                        else "New Gym Partner Joined"
                    )
                    for admin in admin_users:
                        NotificationService.send_notification(
                            user=admin,
                            type=notification_type,
                            title=title,
                            message=(
                                f"{user.full_name or user.email} just signed up as a "
                                f"{role_code.replace('_', ' ')}. Review their profile and verification details."
                            ),
                            metadata={
                                "user_id": user.id,
                                "email": user.email,
                                "role": role_code,
                            },
                            related_object_type="user",
                            related_object_id=user.id,
                        )
            except Exception as e:
                logger.error(f"Failed to notify admins about new registration: {str(e)}")

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            # Prepare user data (exclude password)
            user_data = {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": getattr(user, "role_code", None),
                "mobile_number": user.mobile_number,
                "whatsapp_number": user.whatsapp_number,
                "seller_type": user.seller_type,
                "company_name": user.company_name,
                "website_url": user.website_url,
                "license_number": user.license_number,
                "about_me": user.about_me,
                "is_mobile_verified": user.is_mobile_verified,
                "is_email_verified": user.is_email_verified,
                "referral_code": user.referral_code,
            }
            
            return self._format_success_response(
                data={
                    "user": user_data,
                    "tokens": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                    "email_verification_required": not user.is_email_verified,
                },
                message="User registered successfully. Please check your email to verify your account.",
                status_code=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            return self._format_error_response(
                message="Validation error",
                errors=e.detail if hasattr(e, 'detail') else {"detail": str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to register user",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomLoginView(views.APIView):
    """
    User login endpoint that returns JWT tokens
    """
    permission_classes = []
    authentication_classes = []

    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }, status=status_code)

    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        response_data = {
            "success": False,
            "message": message,
            "errors": errors or {},
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }
        return Response(response_data, status=status_code)

    def post(self, request):
        try:
            serializer = LoginSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            email = serializer.validated_data.get("email")
            password = serializer.validated_data.get("password")
            
            # Authenticate user
            user = authenticate(username=email, password=password)
            
            # If authenticate returns None, check manually
            if user is None:
                try:
                    user_obj = User.objects.get(email=email)
                    if user_obj.check_password(password):
                        # Admins: Always allow
                        if getattr(user_obj, 'role_code', None) == 'admin':
                            user = user_obj
                        # Seekers: Must be APPROVED
                        elif getattr(user_obj, 'role_code', None) == 'seeker':
                            if user_obj.verification_status != User.VerificationStatus.APPROVED:
                                return self._format_error_response(
                                    message="Account verification required",
                                    errors={"detail": "Your account verification is pending or rejected"},
                                    status_code=status.HTTP_401_UNAUTHORIZED
                                )
                            user = user_obj
                        # Owners and Gym Owners: Allow all statuses (REJECTED/PENDING = limited, APPROVED = full)
                        elif getattr(user_obj, 'role_code', None) in ['owner', 'gym_owner']:
                            user = user_obj
                        else:
                            return self._format_error_response(
                                message="Invalid credentials",
                                errors={"detail": "Email or password is incorrect"},
                                status_code=status.HTTP_401_UNAUTHORIZED
                            )
                    else:
                        return self._format_error_response(
                            message="Invalid credentials",
                            errors={"detail": "Email or password is incorrect"},
                            status_code=status.HTTP_401_UNAUTHORIZED
                        )
                except User.DoesNotExist:
                    return self._format_error_response(
                        message="Invalid credentials",
                        errors={"detail": "Email or password is incorrect"},
                        status_code=status.HTTP_401_UNAUTHORIZED
                    )
            
            # Check if user is suspended (admins cannot be suspended)
            if getattr(user, 'is_suspended', False) and getattr(user, 'role_code', None) != 'admin':
                return self._format_error_response(
                    message="Account suspended",
                    errors={"detail": "Your account has been suspended. Please contact support."},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            # Additional check after authentication
            # Admins: Always allow
            if getattr(user, 'role_code', None) == 'admin':
                pass  # Continue with login
            # Seekers: Must be APPROVED
            elif getattr(user, 'role_code', None) == 'seeker':
                if user.verification_status != User.VerificationStatus.APPROVED:
                    return self._format_error_response(
                        message="Account verification required",
                        errors={"detail": "Your account verification is pending or rejected"},
                        status_code=status.HTTP_401_UNAUTHORIZED
                    )
            # Owners and Gym Owners: Allow all statuses (REJECTED/PENDING = limited, APPROVED = full)
            elif getattr(user, 'role_code', None) in ['owner', 'gym_owner']:
                pass  # Continue with login (all statuses allowed)
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            # Prepare user data based on role
            role_code = getattr(user, 'role_code', None)
            if role_code == "admin":
                # Admin users: only basic fields
                user_data = {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": getattr(user, "role_code", None),
                }
            elif role_code == "seeker":
                # Seeker (buyer) users: basic fields only
                user_data = {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": getattr(user, "role_code", None),
                }
            elif role_code == "owner":
                # Owner (seller) users: basic fields + seller-specific (excluding removed fields)
                user_data = {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": getattr(user, "role_code", None),
                    "seller_type": user.seller_type,
                    "is_mobile_verified": user.is_mobile_verified,
                }
            elif role_code == "gym_owner":
                # Gym Owner users: basic fields
                user_data = {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": getattr(user, "role_code", None),
                    "is_mobile_verified": user.is_mobile_verified,
                }
            else:
                # Fallback for any other roles
                user_data = {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": getattr(user, "role_code", None),
                }
            
            # Add is_email_verified for all users (including admins)
            user_data["is_email_verified"] = user.is_email_verified
            
            # Add verification_status only for non-admin users (admins don't need this)
            if role_code != 'admin':
                user_data["verification_status"] = user.verification_status
                
                # Add warning message for rejected/pending owners and gym_owners
                if role_code in ['owner', 'gym_owner'] and user.verification_status in [User.VerificationStatus.REJECTED, User.VerificationStatus.PENDING]:
                    user_data["account_status"] = user.verification_status.lower()
                    if user.verification_status == User.VerificationStatus.REJECTED and user.rejection_note:
                        user_data["rejection_note"] = user.rejection_note
            
            return self._format_success_response(
                data={
                    "user": user_data,
                    "tokens": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    }
                },
                message="Login successful"
            )
        except ValidationError as e:
            return self._format_error_response(
                message="Validation error",
                errors=e.detail if hasattr(e, 'detail') else {"detail": str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to login",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomTokenRefreshView(BaseTokenRefreshView):
    """
    Custom token refresh view that handles users who were inactive but are now active.
    Allows token refresh for users who were previously rejected but are now approved.
    """
    
    serializer_class = CustomTokenRefreshSerializer
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }, status=status_code)
    
    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        response_data = {
            "success": False,
            "message": message,
            "errors": errors or {},
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }
        return Response(response_data, status=status_code)
    
    def post(self, request, *args, **kwargs):
        """
        Override post to handle token refresh with custom response format
        and allow refresh for users who were inactive but are now active
        """
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Get the refresh token
            refresh_token = serializer.validated_data.get('refresh')
            
            # Decode the refresh token to get user info
            try:
                refresh = RefreshToken(refresh_token)
                user_id = refresh.get('user_id')
                
                # Get the user - refresh from DB to ensure we have latest state
                try:
                    user = User.objects.get(id=user_id)
                    
                    # Refresh from database to ensure we have the latest state
                    # This is critical after approve/reject operations
                    user.refresh_from_db()
                    
                    # Check if user is suspended (admins cannot be suspended)
                    if getattr(user, 'is_suspended', False) and getattr(user, 'role_code', None) != 'admin':
                        return self._format_error_response(
                            message="Account suspended",
                            errors={"detail": "Your account has been suspended. Please contact support."},
                            status_code=status.HTTP_403_FORBIDDEN
                        )
                    
                    # Admins: Always allow refresh
                    role_code = getattr(user, 'role_code', None)
                    if role_code == 'admin':
                        # Generate new tokens
                        new_refresh = RefreshToken.for_user(user)
                        return self._format_success_response(
                            data={
                                "access": str(new_refresh.access_token),
                                "refresh": str(new_refresh)
                            },
                            message="Token refreshed successfully",
                            status_code=status.HTTP_200_OK
                        )
                    
                    # Seekers: Must be APPROVED
                    if role_code == 'seeker':
                        if user.verification_status != User.VerificationStatus.APPROVED:
                            return self._format_error_response(
                                message="Account verification required",
                                errors={"detail": "Your account verification is pending or rejected. Please contact support."},
                                status_code=status.HTTP_401_UNAUTHORIZED
                            )
                        # Generate new tokens
                        new_refresh = RefreshToken.for_user(user)
                        return self._format_success_response(
                            data={
                                "access": str(new_refresh.access_token),
                                "refresh": str(new_refresh)
                            },
                            message="Token refreshed successfully",
                            status_code=status.HTTP_200_OK
                        )
                    
                    # Owners and Gym Owners: Allow all statuses (REJECTED/PENDING = limited, APPROVED = full)
                    if role_code in ['owner', 'gym_owner']:
                        # Generate new tokens (all statuses allowed)
                        new_refresh = RefreshToken.for_user(user)
                    
                    return self._format_success_response(
                        data={
                            "access": str(new_refresh.access_token),
                            "refresh": str(new_refresh)
                        },
                        message="Token refreshed successfully",
                        status_code=status.HTTP_200_OK
                    )
                    
                except User.DoesNotExist:
                    return self._format_error_response(
                        message="User not found",
                        errors={"detail": "User associated with this token no longer exists"},
                        status_code=status.HTTP_401_UNAUTHORIZED
                    )
                    
            except TokenError as e:
                return self._format_error_response(
                    message="Invalid token",
                    errors={"detail": str(e)},
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
                
        except ValidationError as e:
            return self._format_error_response(
                message="Validation error",
                errors=e.detail if hasattr(e, 'detail') else {"detail": str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return self._format_error_response(
                message="Failed to refresh token",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ==================== EMAIL VERIFICATION VIEWS ====================

class RequestEmailVerificationOTPView(views.APIView):
    """
    Request OTP for email verification.
    Sends a 6-digit code to the user's email.
    """
    permission_classes = []
    authentication_classes = []
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }, status=status_code)
    
    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        return Response({
            "success": False,
            "message": message,
            "errors": errors or {},
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }, status=status_code)
    
    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def post(self, request):
        """Handle OTP request"""
        serializer = RequestEmailVerificationOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email=email)
            
            # Check if already verified
            if user.is_email_verified:
                return self._format_success_response(
                    data={"already_verified": True},
                    message="Email is already verified"
                )
            
            # Generate 6-digit OTP
            code = str(random.randint(100000, 999999))
            expires_at = timezone.now() + timedelta(minutes=10)  # 10 minutes expiry
            
            # Create OTP record
            EmailVerificationOTP.objects.create(
                user=user,
                code=code,
                expires_at=expires_at,
                ip_address=self._get_client_ip(request)
            )
            
            # Send email
            try:
                send_mail(
                    subject='Your Vionex Email Verification Code',
                    message=f'''
Hello {user.full_name or 'User'},

Your email verification code is: {code}

This code will expire in 10 minutes.

If you did not request this code, please ignore this email.

Best regards,
Vionex Team
                    ''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.error(f"Failed to send verification email to {email}: {str(e)}")
                # Don't expose email sending errors to user

            return self._format_success_response(
                data={},
                message="A verification code has been sent to your email.",
                status_code=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return self._format_error_response(
                message="Invalid user",
                errors={"email": "No account found for this email."},
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Email verification OTP request error: {str(e)}")
            return self._format_error_response(
                message="Failed to request verification code",
                errors={"detail": "An error occurred. Please try again."},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyEmailOTPView(views.APIView):
    """
    Verify email with OTP code.
    """
    permission_classes = []
    authentication_classes = []
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }, status=status_code)
    
    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        return Response({
            "success": False,
            "message": message,
            "errors": errors or {},
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }, status=status_code)
    
    def post(self, request):
        """Handle OTP verification"""
        serializer = VerifyEmailOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        
        try:
            user = User.objects.get(email=email)
            
            # Get latest valid OTP for this user
            otp = EmailVerificationOTP.objects.filter(
                user=user,
                code=code
            ).order_by('-created_at').first()
            
            if not otp or not otp.is_valid():
                # Increment attempts if OTP exists
                if otp:
                    otp.attempts += 1
                    otp.save()
                
                return self._format_error_response(
                    message="Invalid or expired code",
                    errors={"code": "This verification code is invalid or has expired. Please request a new code."},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Verify email
            user.is_email_verified = True
            user.email_verified_at = timezone.now()
            user.save()
            
            # Mark OTP as used
            otp.verified_at = timezone.now()
            otp.save()
            
            
            return self._format_success_response(
                data={"verified": True},
                message="Email verified successfully"
            )
            
        except User.DoesNotExist:
            return self._format_error_response(
                message="Invalid email or code",
                errors={"detail": "Invalid email or verification code"},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Email verification error: {str(e)}")
            return self._format_error_response(
                message="Failed to verify email",
                errors={"detail": "An error occurred. Please try again."},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ResendEmailVerificationOTPView(views.APIView):
    """
    Resend email verification OTP.
    """
    permission_classes = []
    authentication_classes = []
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }, status=status_code)
    
    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def post(self, request):
        """Handle resend OTP request"""
        serializer = ResendEmailVerificationOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email=email)
            
            # Don't reveal if already verified
            if user.is_email_verified:
                return self._format_success_response(
                    data={},
                    message="If an account exists and is unverified, a verification code has been sent."
                )
            
            # Generate new 6-digit OTP
            code = str(random.randint(100000, 999999))
            expires_at = timezone.now() + timedelta(minutes=10)
            
            # Create new OTP record
            EmailVerificationOTP.objects.create(
                user=user,
                code=code,
                expires_at=expires_at,
                ip_address=self._get_client_ip(request)
            )
            
            # Send email
            try:
                send_mail(
                    subject='Your Vionex Email Verification Code',
                    message=f'''
Hello {user.full_name or 'User'},

Your email verification code is: {code}

This code will expire in 10 minutes.

If you did not request this code, please ignore this email.

Best regards,
Vionex Team
                    ''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.error(f"Failed to resend verification email to {email}: {str(e)}")
                
        except User.DoesNotExist:
            # Don't reveal if user exists
            pass
        except Exception as e:
            logger.error(f"Resend OTP error: {str(e)}")
        
        # Always return success
        return self._format_success_response(
            data={},
            message="If an account exists and is unverified, a verification code has been sent."
        )


# ==================== PASSWORD RESET VIEWS ====================

class PasswordResetRequestView(views.APIView):
    """
    Request password reset - sends email with reset link.
    """
    permission_classes = []
    authentication_classes = []
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }, status=status_code)
    
    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        return Response({
            "success": False,
            "message": message,
            "errors": errors or {},
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }, status=status_code)
    
    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def post(self, request):
        """Handle password reset request"""
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email=email)
            
            # Generate secure token
            token = get_random_string(length=64)
            expires_at = timezone.now() + timedelta(minutes=30)  # 30 minutes expiry
            
            # Create or update reset token
            PasswordResetToken.objects.create(
                user=user,
                token=token,
                expires_at=expires_at,
                ip_address=self._get_client_ip(request)
            )
            
            # Build reset URL
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            reset_url = f"{frontend_url}/reset-password?token={token}"
            
            # Send email
            try:
                send_mail(
                    subject='Password Reset Request - Vionex',
                    message=f'''
Hello {user.full_name or 'User'},

You requested a password reset for your Vionex account.

Click the link below to reset your password:
{reset_url}

This link will expire in 30 minutes.

If you did not request this, please ignore this email and your password will remain unchanged.

Best regards,
Vionex Team
                    ''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.error(f"Failed to send password reset email to {email}: {str(e)}")
                # Don't expose email sending errors to user
                
        except User.DoesNotExist:
            # Don't reveal if user exists - security best practice
            pass
        except Exception as e:
            logger.error(f"Password reset request error: {str(e)}")
            # Don't expose internal errors
        
        # Always return success to prevent email enumeration
        return self._format_success_response(
            data={},
            message="If an account exists with this email, a password reset link has been sent.",
            status_code=status.HTTP_200_OK
        )


class PasswordResetVerifyView(views.APIView):
    """
    Verify if a password reset token is valid.
    """
    permission_classes = []
    authentication_classes = []
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }, status=status_code)
    
    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        return Response({
            "success": False,
            "message": message,
            "errors": errors or {},
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }, status=status_code)
    
    def post(self, request):
        """Verify password reset token"""
        serializer = PasswordResetVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            
            if not reset_token.is_valid():
                return self._format_error_response(
                    message="Invalid or expired token",
                    errors={"token": "This reset token is invalid or has expired"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            return self._format_success_response(
                data={"valid": True},
                message="Token is valid"
            )
            
        except PasswordResetToken.DoesNotExist:
            return self._format_error_response(
                message="Invalid token",
                errors={"token": "This reset token is invalid"},
                status_code=status.HTTP_400_BAD_REQUEST
            )


class PasswordResetConfirmView(views.APIView):
    """
    Confirm password reset with token and new password.
    """
    permission_classes = []
    authentication_classes = []
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }, status=status_code)
    
    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        return Response({
            "success": False,
            "message": message,
            "errors": errors or {},
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status_code": status_code
            }
        }, status=status_code)
    
    def post(self, request):
        """Handle password reset confirmation"""
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            
            if not reset_token.is_valid():
                return self._format_error_response(
                    message="Invalid or expired token",
                    errors={"token": "This reset token is invalid or has expired"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Update password
            user = reset_token.user
            user.set_password(new_password)
            user.save()
            
            # Mark token as used
            reset_token.used_at = timezone.now()
            reset_token.save()
            
            # Send confirmation email
            try:
                send_mail(
                    subject='Password Reset Successful - Vionex',
                    message=f'''
Hello {user.full_name or 'User'},

Your password has been successfully reset.

If you did not make this change, please contact support immediately.

Best regards,
Vionex Team
                    ''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.error(f"Failed to send password reset confirmation email: {str(e)}")
            
            return self._format_success_response(
                data={},
                message="Password has been reset successfully"
            )
            
        except PasswordResetToken.DoesNotExist:
            return self._format_error_response(
                message="Invalid token",
                errors={"token": "This reset token is invalid"},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Password reset confirm error: {str(e)}")
            return self._format_error_response(
                message="Failed to reset password",
                errors={"detail": "An error occurred. Please try again."},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
