from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UnifiedPaymentViewSet,
    SubscriptionPlanViewSet,
    PaymentStatusView, 
    StripeWebhookView,
    ManualWebhookTriggerView,
    CheckoutSessionVerifyView,
    WalletViewSet,
    WalletTransactionViewSet,
    WalletPointsSettingViewSet,
    # Keep old viewsets for backward compatibility
    PaymentViewSet,
)

router = DefaultRouter()
# Register specific routes FIRST (more specific routes should come before generic ones)
# Subscription plans endpoint - must be before empty string route
router.register(r'plans', SubscriptionPlanViewSet, basename='subscription-plan')
# Wallet endpoints
router.register(r'wallets', WalletViewSet, basename='wallet')
router.register(r'wallet-transactions', WalletTransactionViewSet, basename='wallet-transaction')
router.register(r'wallet-points-setting', WalletPointsSettingViewSet, basename='wallet-points-setting')
# Unified payment endpoint - handles both payments and subscriptions (register last as catch-all)
router.register(r'', UnifiedPaymentViewSet, basename='payment')

urlpatterns = [
    # Put specific paths BEFORE router to avoid conflicts
    path('status/', PaymentStatusView.as_view(), name='payment-status'),
    # Accept webhook with or without trailing slash (Stripe CLI may send without slash)
    path('webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('webhook', StripeWebhookView.as_view(), name='stripe-webhook-no-slash'),
    path('webhook/manual-trigger/', ManualWebhookTriggerView.as_view(), name='manual-webhook-trigger'),
    path('verify-checkout-session/', CheckoutSessionVerifyView.as_view(), name='verify-checkout-session'),
    path('', include(router.urls)),
]
