from django.urls import path
from .views import (
    RegisterView, 
    CustomLoginView, 
    CustomTokenRefreshView,
    RequestEmailVerificationOTPView,
    VerifyEmailOTPView,
    ResendEmailVerificationOTPView,
    PasswordResetRequestView,
    PasswordResetVerifyView,
    PasswordResetConfirmView
)

urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomLoginView.as_view(), name='login'),
    
    # Token Management
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    
    # Email Verification
    path('verify-email/request-otp/', RequestEmailVerificationOTPView.as_view(), name='request_email_verification_otp'),
    path('verify-email/verify-otp/', VerifyEmailOTPView.as_view(), name='verify_email_otp'),
    path('verify-email/resend-otp/', ResendEmailVerificationOTPView.as_view(), name='resend_email_verification_otp'),
    
    # Password Reset
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/verify/', PasswordResetVerifyView.as_view(), name='password_reset_verify'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
]
