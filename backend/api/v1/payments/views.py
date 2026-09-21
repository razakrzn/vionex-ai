from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from datetime import datetime, timedelta
from decimal import Decimal
import stripe
import json
import time
import random
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

from apps.payments.models import Payment, Subscription, SubscriptionPlan, PaymentTransaction, PaymentStatus, Wallet, WalletTransaction, WalletPointsSetting
from apps.payments.utils import (
    get_payment_amount_for_seller_type,
    get_subscription_duration_for_seller_type,
    can_user_create_property,
    create_stripe_payment_intent
)
from apps.users.models import User
from apps.dashboard.permissions import IsAdminOnly
from .serializers import (
    PaymentCreateSerializer,
    PaymentSerializer,
    SubscriptionCreateSerializer,
    SubscriptionSerializer,
    UnifiedPaymentCreateSerializer,
    SubscriptionPlanSerializer,
    WalletSerializer,
    WalletDetailSerializer,
    WalletTransactionSerializer,
    WalletPointsSettingSerializer
)

# Initialize Stripe
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)


class UnifiedPaymentViewSet(viewsets.ModelViewSet):
    """
    Unified ViewSet for handling both payments (INDIVIDUAL sellers) and subscriptions (COMPANY/AGENT/ADVERTISER sellers).
    Automatically routes to the appropriate payment type based on user's seller_type.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        """Return payments or subscriptions based on user's seller type"""
        user = self.request.user
        if user.seller_type == User.SellerTypes.INDIVIDUAL:
            return Payment.objects.filter(user=user)
        else:
            # For subscriptions, return empty queryset (subscriptions are accessed via user.subscription)
            return Subscription.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return UnifiedPaymentCreateSerializer
        elif self.action == 'list' or self.action == 'retrieve':
            user = self.request.user
            if user.seller_type == User.SellerTypes.INDIVIDUAL:
                return PaymentSerializer
            else:
                return SubscriptionSerializer
        return PaymentSerializer

    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }, status=status_code)

    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        response_data = {
            "success": False,
            "message": message,
            "errors": errors or {},
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }
        return Response(response_data, status=status_code)

    def create(self, request, *args, **kwargs):
        """
        Unified subscription creation endpoint.
        All seller types (INDIVIDUAL, COMPANY, AGENT, ADVERTISER) and gym_owner use subscription plans.
        """
        user = request.user
        
        # Allow gym_owner to proceed without seller_type
        user_role = getattr(user, 'role_code', None)
        if not user.seller_type and user_role != 'gym_owner':
            return self._format_error_response(
                message="Seller type is required",
                errors={"seller_type": "Please set your seller type first"},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        serializer = UnifiedPaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # All seller types and gym_owner now use subscription plans
        return self._create_subscription(user, serializer.validated_data)

    def _create_stripe_coupon(self, amount_off, currency='aed'):
        """
        Create a dynamic Stripe coupon for wallet redemption.
        
        Args:
            amount_off: Amount to discount in AED (Decimal)
            currency: Currency code (default: 'aed')
        
        Returns:
            Stripe Coupon object
        """
        # Generate unique coupon ID
        coupon_id = f"wallet_{int(time.time())}_{random.randint(1000, 9999)}"
        
        try:
            # Create coupon in Stripe
            coupon = stripe.Coupon.create(
                id=coupon_id,
                amount_off=int(float(amount_off) * 100),  # Convert to cents
                currency=currency.lower(),
                duration='once',  # One-time use
                name=f"Wallet Balance Discount - {amount_off} AED"
            )
            return coupon
        except stripe.error.StripeError as e:
            logger.error(f'Error creating Stripe coupon: {str(e)}')
            raise

    def _create_subscription(self, user, validated_data):
        """Create subscription payment intent for all seller types with optional wallet redemption"""
        from decimal import Decimal
        
        plan_id = validated_data.get('plan_id')
        auto_renew = validated_data.get('auto_renew', False)
        use_wallet_balance = validated_data.get('use_wallet_balance', False)
        user_role = getattr(user, 'role_code', None)
        
        # Get default amount for subscription creation
        default_amount = Decimal('50.00')  # Default fallback
        if user.seller_type:
            default_amount = get_payment_amount_for_seller_type(user.seller_type)
        elif user_role == 'gym_owner':
            # For gym_owner, use default amount (can be configured later)
            default_amount = Decimal('50.00')
        
        # Get or create subscription
        subscription, created = Subscription.objects.get_or_create(
            user=user,
            defaults={'amount': default_amount}
        )
        
        # Set plan if provided
        if plan_id:
            try:
                plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
                
                # Validate plan matches user's role
                if user_role == 'gym_owner':
                    # For gym_owner, plan must have role='gym_owner'
                    if plan.role != 'gym_owner':
                        return self._format_error_response(
                            message="Plan role does not match your role",
                            errors={"plan_id": f"Please select a plan for gym_owner"},
                            status_code=status.HTTP_400_BAD_REQUEST
                        )
                elif user.seller_type:
                    # For owners, validate seller_type
                    seller_type_mapping = {
                        User.SellerTypes.INDIVIDUAL: SubscriptionPlan.SellerType.INDIVIDUAL,
                        User.SellerTypes.COMPANY: SubscriptionPlan.SellerType.COMPANY,
                        User.SellerTypes.AGENT: SubscriptionPlan.SellerType.AGENT,
                        User.SellerTypes.ADVERTISER: SubscriptionPlan.SellerType.AGENT,  # Advertisers use Agent plans
                    }
                    expected_seller_type = seller_type_mapping.get(user.seller_type)

                    if plan.role == 'owner':
                        if not plan.seller_type:
                            return self._format_error_response(
                                message="Plan seller_type is not configured",
                                errors={"plan_id": "Selected plan is missing seller_type"},
                                status_code=status.HTTP_400_BAD_REQUEST
                            )
                        if expected_seller_type and plan.seller_type != expected_seller_type:
                            return self._format_error_response(
                                message=f"Plan seller_type '{plan.seller_type}' does not match your seller type",
                                errors={"plan_id": f"Please select a plan for {user.seller_type}"},
                                status_code=status.HTTP_400_BAD_REQUEST
                            )
                
                subscription.plan = plan
                # Use offer_price if plan has an active offer, otherwise use regular price
                if plan.is_offer and plan.offer_price is not None:
                    subscription.amount = plan.offer_price
                else:
                    subscription.amount = plan.price
            except SubscriptionPlan.DoesNotExist:
                return self._format_error_response(
                    message="Invalid plan ID",
                    errors={"plan_id": "Plan not found or inactive"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Use default plan for user's role
            if user_role == 'gym_owner':
                # Look for gym_owner plans
                plan = SubscriptionPlan.get_active_plan_for_role('gym_owner', None)
                if plan:
                    subscription.plan = plan
                    # Use offer_price if plan has an active offer, otherwise use regular price
                    if plan.is_offer and plan.offer_price is not None:
                        subscription.amount = plan.offer_price
                    else:
                        subscription.amount = plan.price
                else:
                    # Fallback to default amount
                    subscription.amount = default_amount
            elif user.seller_type:
                # Use default plan for user's role (owner) + seller_type
                seller_type_mapping = {
                    User.SellerTypes.INDIVIDUAL: SubscriptionPlan.SellerType.INDIVIDUAL,
                    User.SellerTypes.COMPANY: SubscriptionPlan.SellerType.COMPANY,
                    User.SellerTypes.AGENT: SubscriptionPlan.SellerType.AGENT,
                    User.SellerTypes.ADVERTISER: SubscriptionPlan.SellerType.AGENT,
                }
                expected_seller_type = seller_type_mapping.get(user.seller_type)

                plan = SubscriptionPlan.get_active_plan_for_role('owner', expected_seller_type)
                if plan:
                    subscription.plan = plan
                    # Use offer_price if plan has an active offer, otherwise use regular price
                    if plan.is_offer and plan.offer_price is not None:
                        subscription.amount = plan.offer_price
                    else:
                        subscription.amount = plan.price
                else:
                    # Fallback to old behavior if no plan exists
                    subscription.amount = get_payment_amount_for_seller_type(user.seller_type)
            else:
                subscription.amount = default_amount
        
        subscription.auto_renew = auto_renew
        subscription.save()
        
        if not created:
            # Reset subscription status for renewal if it's expired/inactive
            if not subscription.is_valid():
                subscription.status = PaymentStatus.PENDING
                subscription.is_active = False
                # Clear old dates - will be set when payment succeeds via webhook
                subscription.start_date = None
                subscription.end_date = None
                subscription.completed_at = None
                subscription.save()

        # If subscription is already active and valid AND user can still create listings, return it
        # If user has reached listing limit, allow them to create a new payment (for upgrade/renewal)
        if subscription.is_valid() and subscription.can_create_listing():
            return self._format_success_response(
                data={
                    "type": "subscription",
                    "subscription": SubscriptionSerializer(subscription).data
                },
                message="You already have an active subscription",
                status_code=status.HTTP_200_OK
            )
        
        # If subscription is valid but user has reached listing limit, allow renewal/upgrade
        if subscription.is_valid() and not subscription.can_create_listing():
            # Reset subscription to allow new payment for upgrade/renewal
            subscription.status = PaymentStatus.PENDING
            subscription.is_active = False
            subscription.start_date = None
            subscription.end_date = None
            subscription.completed_at = None
            subscription.save()

        # Determine subscription duration for response/activation
        if subscription.plan:
            duration_days = subscription.plan.duration_days
        elif user.seller_type:
            duration_days = get_subscription_duration_for_seller_type(user.seller_type)
        else:
            # Default duration for gym_owner (90 days)
            duration_days = 90

        # Calculate final amount after wallet discount
        original_amount = subscription.amount
        wallet_discount = Decimal('0.00')
        points_to_redeem = 0
        
        logger.debug(f"[PAYMENT_CREATE_SUBSCRIPTION] Wallet Calculation Start - Subscription ID: {subscription.id}, User ID: {user.id}, Base Plan Amount (subscription.amount): {original_amount}, Use Wallet: {use_wallet_balance}")
        
        if use_wallet_balance:
            # Get user's wallet
            logger.debug(f"[PAYMENT_CREATE_SUBSCRIPTION] Getting wallet for user {user.id}")
            wallet = Wallet.get_or_create_wallet(user)
            
            # Validate wallet has enough balance
            if wallet.balance < Decimal('0.01'):
                logger.warning(f"[PAYMENT_CREATE_SUBSCRIPTION] Insufficient Wallet Balance - Wallet ID: {wallet.id}, Balance: {wallet.balance}, Required: 0.01")
                return self._format_error_response(
                    message="Insufficient wallet balance",
                    errors={"use_wallet_balance": "You don't have enough points in your wallet"},
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            # Enforce minimum payable amount unless wallet fully covers the amount
            min_payable = Decimal(getattr(settings, 'SUBSCRIPTION_MIN_PAYABLE_AED', '20.00'))
            logger.debug(f"[PAYMENT_CREATE_SUBSCRIPTION] Wallet Calculation - Min Payable: {min_payable}, Wallet Balance: {wallet.balance}, Original Amount: {original_amount}")
            
            if wallet.balance >= original_amount:
                max_redeemable = original_amount
                logger.debug(f"[PAYMENT_CREATE_SUBSCRIPTION] Wallet fully covers amount - Max Redeemable: {max_redeemable}")
            else:
                max_redeemable = max(Decimal('0.00'), original_amount - min_payable)
                logger.debug(f"[PAYMENT_CREATE_SUBSCRIPTION] Wallet partial - Max Redeemable: {max_redeemable} (Original: {original_amount} - Min: {min_payable})")

            # Calculate discount (1 Point = 1 AED)
            wallet_discount = min(wallet.balance, max_redeemable)  # Can't discount more than allowed
            points_to_redeem = float(wallet_discount)
            
            # Final amount after discount (this is what user will pay via Stripe)
            # NOTE: subscription.amount (base plan) remains unchanged at original_amount
            final_amount = original_amount - wallet_discount
            final_amount = max(final_amount, Decimal('0.00'))  # Ensure non-negative
            logger.debug(f"[PAYMENT_CREATE_SUBSCRIPTION] Subscription.amount will remain: {original_amount} AED (base plan price, not modified)")
        else:
            final_amount = original_amount
            logger.debug(f"[PAYMENT_CREATE_SUBSCRIPTION] Wallet Not Used - Final Amount: {final_amount}")

        # If wallet fully covers the amount, skip Stripe and activate immediately
        if use_wallet_balance and final_amount <= Decimal('0.00'):
            if wallet_discount > Decimal('0.00'):
                # Check for duplicate deductions (idempotency check)
                # Check by subscription reference first (most specific)
                existing_transaction = WalletTransaction.objects.filter(
                    wallet=wallet,
                    transaction_type=WalletTransaction.TransactionType.DEBIT,
                    reference_type='apps.payments.models.Subscription',
                    reference_id=subscription.id
                ).order_by('-created_at').first()
                
                # Also check by amount and description pattern as fallback (within last 24 hours)
                if not existing_transaction:
                    existing_transaction = WalletTransaction.objects.filter(
                        wallet=wallet,
                        transaction_type=WalletTransaction.TransactionType.DEBIT,
                        description__icontains=f"Subscription Redemption",
                        amount=wallet_discount,
                        created_at__gte=timezone.now() - timedelta(hours=24)
                    ).order_by('-created_at').first()
                
                if existing_transaction:
                    logger.warning(f"[PAYMENT_CREATE_SUBSCRIPTION] Duplicate Deduction Detected - Transaction ID: {existing_transaction.id}, Wallet ID: {wallet.id}, Subscription ID: {subscription.id}, Amount: {wallet_discount}, Created: {existing_transaction.created_at}")
                    logger.warning(f"[PAYMENT_CREATE_SUBSCRIPTION] Existing Transaction Details - Reference Type: {existing_transaction.reference_type}, Reference ID: {existing_transaction.reference_id}, Description: {existing_transaction.description}")
                else:
                    logger.debug(f"[PAYMENT_CREATE_SUBSCRIPTION] Deducting Points - Amount: {wallet_discount}, Subscription ID: {subscription.id}, Wallet ID: {wallet.id}")
                    try:
                        transaction = wallet.deduct_points(
                            amount=wallet_discount,
                            transaction_type=WalletTransaction.TransactionType.DEBIT,
                            reference=subscription,
                            description=f"Debit: Subscription Redemption - {subscription.plan.name if subscription.plan else 'Default'}"
                        )
                    except Exception as e:
                        logger.error(f"[PAYMENT_CREATE_SUBSCRIPTION] ERROR - Failed to deduct points: {str(e)}", exc_info=True)
                        return self._format_error_response(
                            message="Failed to process wallet deduction",
                            errors={"wallet": str(e)},
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                        )
            else:
                logger.warning(f"[PAYMENT_CREATE_SUBSCRIPTION] Wallet Discount is Zero - No points to deduct. Wallet Discount: {wallet_discount}")

            # Activate subscription immediately
            logger.debug(f"[PAYMENT_CREATE_SUBSCRIPTION] Activating Subscription - Subscription ID: {subscription.id}, Duration: {duration_days} days")
            subscription.activate(duration_days=duration_days)
            subscription.stripe_payment_intent_id = None
            subscription.stripe_client_secret = None
            subscription.stripe_checkout_session_id = None
            subscription.save(update_fields=[
                'start_date', 'end_date', 'is_active', 'status', 'completed_at',
                'stripe_payment_intent_id', 'stripe_client_secret', 'stripe_checkout_session_id'
            ])

            response_data = {
                "type": "subscription",
                "subscription_id": subscription.id,
                "amount": float(final_amount),
                "currency": "AED",
                "duration_days": duration_days,
                "plan": SubscriptionPlanSerializer(subscription.plan).data if subscription.plan else None,
                "wallet_discount": float(wallet_discount),
                "points_redeemed": points_to_redeem,
            }

            return self._format_success_response(
                data=response_data,
                message="Subscription activated successfully using wallet balance",
                status_code=status.HTTP_201_CREATED
            )

        try:
            # Build metadata - include role_code for gym_owner
            metadata = {
                'subscription_id': str(subscription.id),
                'user_id': str(user.id),
            }
            if user.seller_type:
                metadata['seller_type'] = user.seller_type
            if user_role:
                metadata['role_code'] = user_role
            
            # Add wallet redemption metadata
            if use_wallet_balance and points_to_redeem > 0:
                metadata['points_redeemed'] = str(points_to_redeem)
                metadata['wallet_discount'] = str(float(wallet_discount))
                metadata['original_amount'] = str(float(original_amount))
                metadata['final_amount'] = str(float(final_amount))
            
            # Always use Stripe Checkout Session (with or without wallet redemption)
            # IMPORTANT: Use original_amount in line_items, then apply coupon discount
            # This ensures subscription.amount (base plan) remains unchanged
            checkout_session_params = {
                'payment_method_types': ['card'],
                'line_items': [{
                    'price_data': {
                        'currency': 'aed',
                        'product_data': {
                            'name': f'Subscription Plan - {subscription.plan.name if subscription.plan else "Default"}',
                        },
                        # Use original_amount (base plan price), NOT final_amount
                        # The coupon will apply the wallet discount
                        'unit_amount': int(float(original_amount) * 100),  # Convert to cents
                    },
                    'quantity': 1,
                }],
                'mode': 'payment',
                'success_url': f'{settings.FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}',
                'cancel_url': f'{settings.FRONTEND_URL}/payment/cancel',
                'metadata': metadata,
            }
            
            # Add coupon/discount only if wallet points are being used
            # The coupon applies the wallet discount to the original amount
            if use_wallet_balance and points_to_redeem > 0:
                logger.debug(f"[PAYMENT_CREATE_SUBSCRIPTION] Creating Stripe coupon for wallet discount - Original: {original_amount}, Discount: {wallet_discount}, Final: {final_amount}")
                # Create dynamic coupon for wallet discount
                coupon = self._create_stripe_coupon(wallet_discount, 'aed')
                checkout_session_params['discounts'] = [{
                    'coupon': coupon.id,
                }]
            else:
                logger.debug(f"[PAYMENT_CREATE_SUBSCRIPTION] Stripe Checkout - Line Item: {original_amount} AED (no wallet discount)")
            
            # Create Checkout Session
            checkout_session = stripe.checkout.Session.create(**checkout_session_params)
            
            # Store checkout session info
            subscription.stripe_payment_intent_id = checkout_session.payment_intent
            subscription.stripe_client_secret = None  # Not used for Checkout Session
            subscription.stripe_checkout_session_id = checkout_session.id
            
            # IMPORTANT: subscription.amount should remain as original_amount (base plan price)
            # Do NOT modify subscription.amount - it represents the base plan price
            # The wallet discount is handled via Stripe coupon, not by changing subscription.amount
            subscription.status = PaymentStatus.PENDING  # Ensure status is PENDING
            subscription.save()
            logger.debug(f"[PAYMENT_CREATE_SUBSCRIPTION] Subscription saved - ID: {subscription.id}, Amount (base plan): {subscription.amount} AED, Status: {subscription.status}")

            # Always return Checkout Session response
            response_data = {
                "type": "subscription",
                "subscription_id": subscription.id,
                "amount": float(final_amount),
                "currency": "AED",
                "duration_days": duration_days,
                "plan": SubscriptionPlanSerializer(subscription.plan).data if subscription.plan else None,
                "checkout_session_id": subscription.stripe_checkout_session_id,
                "checkout_url": checkout_session.url,
            }
            
            # Add wallet redemption info if used
            if use_wallet_balance and points_to_redeem > 0:
                response_data.update({
                    "original_amount": float(original_amount),
                    "wallet_discount": float(wallet_discount),
                    "points_redeemed": points_to_redeem,
                })
            
            return self._format_success_response(
                data=response_data,
                message="Subscription payment created successfully",
                status_code=status.HTTP_201_CREATED
            )

        except Exception as e:
            subscription.status = PaymentStatus.FAILED
            subscription.save()
            return self._format_error_response(
                message="Failed to create subscription payment",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def list(self, request, *args, **kwargs):
        """List subscription for all seller types"""
        user = request.user
        # All seller types now use subscriptions
        if hasattr(user, 'subscription'):
            serializer = SubscriptionSerializer(user.subscription)
            return self._format_success_response(
                data={"type": "subscription", "subscription": serializer.data},
                message="Subscription retrieved successfully"
            )
        else:
            return self._format_success_response(
                data={"type": "subscription", "subscription": None},
                message="No subscription found"
            )


# Keep old viewsets for backward compatibility (deprecated)
class PaymentViewSet(UnifiedPaymentViewSet):
    """
    DEPRECATED: Use UnifiedPaymentViewSet instead.
    Kept for backward compatibility.
    """
    pass


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing subscription plans.
    - Admins: Full CRUD access (create, read, update, delete)
    - Authenticated users: Read-only access (list, retrieve)
    - Unauthenticated users: Read-only access (list, retrieve)
    """
    serializer_class = SubscriptionPlanSerializer
    queryset = SubscriptionPlan.objects.all()
    
    def get_permissions(self):
        """Allow read for unauthenticated users, write for admins only"""
        # Get the action - might be None during initialization
        action = getattr(self, 'action', None)
        
        # For read operations (list, retrieve), allow unauthenticated users
        if action in ['list', 'retrieve', None]:
            permission_classes = [AllowAny]
        else:
            # For write operations (create, update, destroy), require admin
            permission_classes = [IsAdminOnly]
        return [permission() for permission in permission_classes]

    def list(self, request, *args, **kwargs):
        """Override list to validate query parameters before filtering"""
        # Get query parameters
        role = request.query_params.get('role')
        seller_type = request.query_params.get('seller_type')

        # Validate filter requirements
        if role == 'owner' and not seller_type:
            # If role=owner, seller_type is required
            return Response({
                "success": False,
                "message": "seller_type parameter is required when role=owner",
                "errors": {
                    "seller_type": "This field is required when role=owner. Valid values: INDIVIDUAL, AGENT, COMPANY"
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Continue with normal list behavior
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        """Filter plans based on user role and seller_type (if owner)"""
        queryset = SubscriptionPlan.objects.all()
        
        # For non-admin users, only show active plans
        is_admin = self.request.user.is_authenticated and getattr(self.request.user, 'role_code', None) == 'admin'
        
        if not is_admin:
            queryset = queryset.filter(is_active=True)
        
        # Query params (optional - can override auto-filtering):
        # - role: user role (e.g. owner, seeker, gym_owner)
        # - seller_type: seller type (INDIVIDUAL / AGENT / COMPANY)
        role = self.request.query_params.get('role')
        seller_type = self.request.query_params.get('seller_type')

        # Backward compatibility: if role is one of the seller types, treat it as seller_type
        if role in ['INDIVIDUAL', 'AGENT', 'COMPANY'] and not seller_type:
            seller_type = role
            role = None

        # If role=gym_owner, ignore seller_type (don't filter by it even if provided)
        if role == 'gym_owner':
            seller_type = None

        # Auto-filter by user's role and seller_type if not provided in query params
        if self.request.user.is_authenticated and not is_admin:
            user = self.request.user
            user_role = getattr(user, 'role_code', None)
            
            # Filter by role
            if not role and user_role:
                # Filter plans matching user's role
                queryset = queryset.filter(role=user_role)
            elif role:
                queryset = queryset.filter(role=role)
            
            # Filter by seller_type (only for 'owner' role)
            if role == 'gym_owner':
                # For gym_owner, only show plans with no seller_type
                queryset = queryset.filter(seller_type__isnull=True)
            elif not seller_type and user_role == 'owner' and getattr(user, 'seller_type', None):
                seller_type_mapping = {
                    User.SellerTypes.INDIVIDUAL: SubscriptionPlan.SellerType.INDIVIDUAL,
                    User.SellerTypes.COMPANY: SubscriptionPlan.SellerType.COMPANY,
                    User.SellerTypes.AGENT: SubscriptionPlan.SellerType.AGENT,
                    User.SellerTypes.ADVERTISER: SubscriptionPlan.SellerType.AGENT,  # Advertisers use Agent plans
                }
                mapped = seller_type_mapping.get(user.seller_type)
                if mapped:
                    queryset = queryset.filter(seller_type=mapped)
            elif seller_type:
                # If seller_type is provided in query params, use it
                queryset = queryset.filter(seller_type=seller_type)
            elif user_role == 'gym_owner':
                # For gym_owner users (auto-filtering), only show plans with role='gym_owner' and no seller_type
                queryset = queryset.filter(role='gym_owner', seller_type__isnull=True)
        else:
            # For admins or when query params are provided, use them directly
            if role:
                queryset = queryset.filter(role=role)
            if seller_type:
                queryset = queryset.filter(seller_type=seller_type)
            elif role == 'gym_owner':
                # For gym_owner, only show plans with no seller_type
                queryset = queryset.filter(seller_type__isnull=True)

        return queryset.order_by('role', 'seller_type', 'price')
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }, status=status_code)
    
    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        response_data = {
            "success": False,
            "message": message,
            "errors": errors or {},
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }
        return Response(response_data, status=status_code)
    
    def create(self, request, *args, **kwargs):
        """Create a new subscription plan (Admin only)"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return self._format_success_response(
            data=serializer.data,
            message="Subscription plan created successfully",
            status_code=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """Update a subscription plan (Admin only)"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return self._format_success_response(
            data=serializer.data,
            message="Subscription plan updated successfully"
        )
    
    def destroy(self, request, *args, **kwargs):
        """Delete a subscription plan (Admin only)"""
        instance = self.get_object()
        self.perform_destroy(instance)
        
        return self._format_success_response(
            data=None,
            message="Subscription plan deleted successfully",
            status_code=status.HTTP_200_OK
        )
    
    def list(self, request, *args, **kwargs):
        """List subscription plans"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self._format_success_response(
                data=serializer.data,
                message="Subscription plans retrieved successfully"
            )
        
        serializer = self.get_serializer(queryset, many=True)
        return self._format_success_response(
            data=serializer.data,
            message="Subscription plans retrieved successfully"
        )
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific subscription plan"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return self._format_success_response(
            data=serializer.data,
            message="Subscription plan retrieved successfully"
        )

    @action(detail=False, methods=['post'], url_path='admin/assign-subscription')
    def assign_subscription(self, request):
        """
        Admin endpoint to assign a subscription plan to a user.
        Makes is_subscribed True for the user.
        
        POST /api/v1/payments/plans/admin/assign-subscription/
        Body: {
            "user_id": 1,
            "plan_id": 2
        }
        """
        from apps.users.models import User
        
        # Check admin permission
        if not (getattr(request.user, 'role_code', None) == 'admin' or 
                getattr(request.user, 'is_superuser', False) or 
                getattr(request.user, 'is_staff', False)):
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only admins can assign subscriptions"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        # Validate request data
        user_id = request.data.get('user_id')
        plan_id = request.data.get('plan_id')
        
        if not user_id:
            return self._format_error_response(
                message="Validation error",
                errors={"user_id": "This field is required"},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        if not plan_id:
            return self._format_error_response(
                message="Validation error",
                errors={"plan_id": "This field is required"},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get user
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return self._format_error_response(
                message="User not found",
                errors={"user_id": f"User with id {user_id} does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Get plan
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return self._format_error_response(
                message="Subscription plan not found",
                errors={"plan_id": f"Active subscription plan with id {plan_id} does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # Get or create subscription for the user
        subscription, created = Subscription.objects.get_or_create(
            user=user,
            defaults={
                'amount': plan.price,
                'currency': plan.currency,
                'status': PaymentStatus.COMPLETED,
                'is_active': True,
            }
        )
        
        # Update subscription with plan and dates
        now = timezone.now()
        subscription.plan = plan
        subscription.amount = plan.price
        subscription.currency = plan.currency
        subscription.status = PaymentStatus.COMPLETED
        subscription.is_active = True
        subscription.start_date = now
        subscription.end_date = now + timedelta(days=plan.duration_days)
        subscription.completed_at = now
        subscription.usage_count = 0
        subscription.auto_renew = False  # Admin-assigned subscriptions don't auto-renew by default
        subscription.save()
        
        # Serialize response
        serializer = SubscriptionSerializer(subscription)
        
        return self._format_success_response(
            data=serializer.data,
            message=f"Subscription plan '{plan.name}' assigned to user '{user.email}' successfully",
            status_code=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'], url_path='admin/cancel-subscription')
    def cancel_subscription(self, request):
        """
        Admin endpoint to cancel a user's subscription.
        Makes is_subscribed False for the user.
        
        POST /api/v1/payments/plans/admin/cancel-subscription/
        Body: {
            "user_id": 1
        }
        """
        from apps.users.models import User
        
        # Check admin permission
        if not (getattr(request.user, 'role_code', None) == 'admin' or 
                getattr(request.user, 'is_superuser', False) or 
                getattr(request.user, 'is_staff', False)):
            return self._format_error_response(
                message="Permission denied",
                errors={"detail": "Only admins can cancel subscriptions"},
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        # Validate request data
        user_id = request.data.get('user_id')
        
        if not user_id:
            return self._format_error_response(
                message="Validation error",
                errors={"user_id": "This field is required"},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get user
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return self._format_error_response(
                message="User not found",
                errors={"user_id": f"User with id {user_id} does not exist"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # Get user's subscription
        try:
            subscription = Subscription.objects.get(user=user)
        except Subscription.DoesNotExist:
            return self._format_error_response(
                message="Subscription not found",
                errors={"user_id": f"User '{user.email}' does not have a subscription"},
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # Cancel subscription
        subscription.is_active = False
        subscription.status = PaymentStatus.CANCELLED
        subscription.save(update_fields=['is_active', 'status'])
        
        # Serialize response
        serializer = SubscriptionSerializer(subscription)
        
        return self._format_success_response(
            data=serializer.data,
            message=f"Subscription cancelled for user '{user.email}' successfully",
            status_code=status.HTTP_200_OK
        )


class PaymentStatusView(APIView):
    """
    Check payment status for property/gym creation.
    Payment/subscription must be completed BEFORE property/gym creation.
    
    For admins: Returns all users' subscription statuses.
    For regular users: Returns their own subscription status.
    """
    permission_classes = [IsAuthenticated]

    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }, status=status_code)
    
    def _is_admin(self, user):
        """Check if user is admin"""
        return (
            getattr(user, 'role_code', None) == 'admin' or
            getattr(user, 'is_superuser', False) or
            getattr(user, 'is_staff', False)
        )
    
    def _get_user_subscription_info(self, user, for_admin=False):
        """Helper method to get subscription info for a user"""
        user_role = getattr(user, 'role_code', None)
        is_gym_owner = user_role == 'gym_owner'
        
        can_create, message = can_user_create_property(user)
        
        # Get subscription status
        subscription_status = None
        if hasattr(user, 'subscription'):
            subscription = user.subscription
            subscription_status = subscription.status
        else:
            subscription_status = "NO_SUBSCRIPTION"
        
        # Determine the message based on subscription and can_create status
        if hasattr(user, 'subscription'):
            subscription = user.subscription
            is_valid = subscription.is_valid()
            can_create_listing = subscription.can_create_listing()
            
            if is_valid and can_create_listing:
                # Active subscription that can create listings
                if is_gym_owner:
                    display_message = "Active subscription"
                else:
                    display_message = "Active subscription"
            elif not is_valid:
                # Subscription expired or inactive
                display_message = "Subscription expired or inactive"
            elif not can_create_listing:
                # Reached listing limit
                if subscription.plan and not subscription.plan.is_unlimited:
                    display_message = "Listing limit reached"
                else:
                    display_message = "Cannot create listing"
            else:
                display_message = message
        else:
            # No subscription
            display_message = "No active subscription"
        
        # For admin view, return simplified format
        if for_admin:
            result = {
                "user_id": user.id,
                "user_email": user.email,
                "role": user_role,
                "seller_type": user.seller_type if not is_gym_owner else None,
                "subscription_status": subscription_status,
                "message": display_message,
            }
            
            # Only include can_create_property for non-gym_owner roles
            if not is_gym_owner:
                result["can_create_property"] = can_create
            
            # Only include can_add_gym for gym_owner role
            if is_gym_owner:
                result["can_add_gym"] = can_create
            
            return result
        
        # For regular user view, return detailed format
        subscription_info = None
        if hasattr(user, 'subscription'):
            subscription = user.subscription
            is_valid = subscription.is_valid()
            can_create_listing = subscription.can_create_listing()
            
            if is_valid and subscription.end_date is None:
                days_remaining = None
            else:
                days_remaining = (subscription.end_date - timezone.now()).days if subscription.end_date and is_valid else 0
            
            remaining_listings = None
            if subscription.plan and not subscription.plan.is_unlimited:
                remaining_listings = max(0, subscription.plan.max_listings - subscription.usage_count)
            
            has_usable_subscription = is_valid and can_create_listing
            
            subscription_info = {
                "has_subscription": has_usable_subscription,
                "is_active": subscription.is_active,
                "is_valid": is_valid,
                "can_create_listing": can_create_listing,
                "status": subscription.status,
                "start_date": subscription.start_date.isoformat() if subscription.start_date else None,
                "end_date": subscription.end_date.isoformat() if subscription.end_date else None,
                "days_remaining": days_remaining,
                "usage_count": subscription.usage_count,
                "remaining_listings": remaining_listings,
                "plan": SubscriptionPlanSerializer(subscription.plan).data if subscription.plan else None,
                "auto_renew": subscription.auto_renew,
                "amount": float(subscription.amount),
                "currency": subscription.currency,
                "payment_intent_id": subscription.stripe_payment_intent_id if subscription.stripe_payment_intent_id else None
            }
            
            if not has_usable_subscription:
                if not is_valid:
                    if is_gym_owner:
                        subscription_info["message"] = "Subscription expired or inactive. Please renew your subscription before creating gyms."
                    else:
                        subscription_info["message"] = "Subscription expired or inactive. Please renew your subscription before creating properties."
                elif not can_create_listing:
                    if subscription.plan and not subscription.plan.is_unlimited:
                        if is_gym_owner:
                            subscription_info["message"] = f"You have reached your gym limit ({subscription.usage_count}/{subscription.plan.max_listings}). Please upgrade your plan or wait for renewal."
                        else:
                            subscription_info["message"] = f"You have reached your listing limit ({subscription.usage_count}/{subscription.plan.max_listings}). Please upgrade your plan or wait for renewal."
                    else:
                        if is_gym_owner:
                            subscription_info["message"] = "Cannot create gym. Please check your subscription status."
                        else:
                            subscription_info["message"] = "Cannot create listing. Please check your subscription status."
        else:
            if is_gym_owner:
                subscription_info = {
                    "has_subscription": False,
                    "message": "You need to subscribe before creating gyms"
                }
            else:
                subscription_info = {
                    "has_subscription": False,
                    "message": "You need to subscribe before creating properties"
                }
        
        return {
            "user_id": user.id,
            "user_email": user.email,
            "user_full_name": user.full_name,
            "role": user_role,
            "seller_type": user.seller_type if not is_gym_owner else None,
            "message": message,
            "subscription_info": subscription_info,
            "can_create_property": can_create if not is_gym_owner else None,
            "can_add_gym": can_create if is_gym_owner else None,
        }

    def get(self, request):
        user = request.user
        
        # Check if user is admin
        if self._is_admin(user):
            # Admin: Return only owner and gym_owner users' subscription statuses
            # Get only owner and gym_owner users
            all_users = User.objects.filter(
                custom_role__code__in=['owner', 'gym_owner']
            ).select_related('subscription', 'subscription__plan', 'custom_role').order_by('-date_joined')
            
            # Optional query parameters for filtering
            user_id = request.query_params.get('user_id')
            if user_id:
                try:
                    all_users = all_users.filter(id=int(user_id))
                except (ValueError, TypeError):
                    pass
            
            role_filter = request.query_params.get('role')
            if role_filter:
                # Filter by custom_role code (must be owner or gym_owner)
                if role_filter in ['owner', 'gym_owner']:
                    all_users = all_users.filter(custom_role__code=role_filter)
            
            seller_type_filter = request.query_params.get('seller_type')
            if seller_type_filter:
                all_users = all_users.filter(seller_type=seller_type_filter)
            
            # Get subscription info for each user
            users_subscription_status = []
            for u in all_users:
                try:
                    user_info = self._get_user_subscription_info(u, for_admin=True)
                    users_subscription_status.append(user_info)
                except Exception as e:
                    logger.error(f"[PAYMENT_STATUS] Error getting subscription info for user {u.id}: {str(e)}")
                    # Include user even if there's an error
                    users_subscription_status.append({
                        "user_id": u.id,
                        "user_email": u.email,
                        "role": getattr(u, 'role_code', None),
                        "seller_type": u.seller_type,
                        "subscription_status": "ERROR",
                        "can_create_property": False,
                        "can_add_gym": False,
                        "message": f"Error: {str(e)}"
                    })
            
            return self._format_success_response(
                data=users_subscription_status,
                message=f"Retrieved subscription statuses for {len(users_subscription_status)} user(s)"
            )
        
        # Regular user: Return their own subscription status
        user_role = getattr(user, 'role_code', None)
        is_gym_owner = user_role == 'gym_owner'
        
        user_info = self._get_user_subscription_info(user, for_admin=False)
        
        # Build response data based on user role
        response_data = {
            "message": user_info["message"],
            "subscription_info": user_info["subscription_info"],
        }
        
        # Only include seller_type for non-gym_owner users
        if not is_gym_owner:
            response_data["seller_type"] = user.seller_type
        
        # For gym_owner, use can_add_gym instead of can_create_property
        if is_gym_owner:
            response_data["can_add_gym"] = user_info["can_add_gym"]
        else:
            response_data["can_create_property"] = user_info["can_create_property"]
        
        return self._format_success_response(
            data=response_data,
            message="Subscription status retrieved successfully"
        )


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    Handle Stripe webhook events
    """
    permission_classes = []  # No authentication for webhooks

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None)
        
        if not webhook_secret:
            logger.error("[WEBHOOK] Webhook secret not configured")
            return JsonResponse({'error': 'Webhook secret not configured'}, status=500)

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError as e:
            logger.error(f"[WEBHOOK] Invalid payload: {str(e)}")
            return JsonResponse({'error': 'Invalid payload'}, status=400)
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"[WEBHOOK] Invalid signature: {str(e)}")
            return JsonResponse({'error': 'Invalid signature'}, status=400)

        # Handle the event
        event_type = event['type']
        event_id = event['id']
        event_data = event['data']['object']
        
        logger.debug(f"[WEBHOOK] Event data: {event_data}")
        
        # Check if event was already processed (idempotency)
        try:
            existing_transaction = PaymentTransaction.objects.filter(stripe_event_id=event_id).first()
            if existing_transaction:
                return JsonResponse({'status': 'success', 'message': 'Event already processed'})
        except Exception as e:
            logger.warning(f"[WEBHOOK] Error checking existing transaction: {str(e)}")
            pass
        
        # Use database transaction for webhook processing
        from django.db import transaction
        import traceback
        
        try:
            with transaction.atomic():
                # Handle checkout.session.completed for wallet redemption
                if event_type == 'checkout.session.completed':
                    self.handle_checkout_session_completed(event_data)
                # Process the event
                elif event_type == 'payment_intent.succeeded':
                    self.handle_payment_success(event_data)
                elif event_type == 'payment_intent.payment_failed':
                    self.handle_payment_failure(event_data)
                elif event_type == 'payment_intent.requires_action':
                    # 3DS authentication is required (handled on frontend)
                    pass
                elif event_type == 'payment_intent.processing':
                    # Payment is processing after 3DS
                    pass
                elif event_type == 'payment_intent.canceled':
                    self.handle_payment_cancellation(event_data)
                else:
                    logger.warning(f"[WEBHOOK] Unhandled event type: {event_type}")

                # Save transaction record AFTER processing (ensures idempotency)
                # Handle both payment_intent and checkout.session events
                if event_type.startswith('payment_intent.'):
                    payment_intent_id = event_data.get('id', 'unknown')
                    payment_status = event_data.get('status', 'unknown')
                    amount = event_data.get('amount', 0) / 100
                    currency = event_data.get('currency', 'unknown').upper()
                    metadata = event_data.get('metadata', {})
                    
                    # Try to link to payment or subscription
                    payment_obj = None
                    subscription_obj = None
                    if 'payment_id' in metadata:
                        try:
                            payment_obj = Payment.objects.filter(stripe_payment_intent_id=payment_intent_id).first()
                        except Exception as e:
                            pass
                    
                    if 'subscription_id' in metadata:
                        try:
                            subscription_obj = Subscription.objects.filter(
                                stripe_payment_intent_id=payment_intent_id
                            ).first()
                        except Exception as e:
                            pass
                    
                    try:
                        transaction_record = PaymentTransaction.objects.create(
                            payment=payment_obj,
                            subscription=subscription_obj,
                            stripe_event_id=event_id,
                            stripe_event_type=event_type,
                            amount=amount,
                            currency=currency.lower(),
                            status=payment_status,
                            metadata=event_data if isinstance(event_data, dict) else {}
                        )
                    except Exception as tx_error:
                        # If transaction record creation fails, try to create without metadata if that's the issue
                        try:
                            transaction_record = PaymentTransaction.objects.create(
                                payment=payment_obj,
                                subscription=subscription_obj,
                                stripe_event_id=event_id,
                                stripe_event_type=event_type,
                                amount=amount,
                                currency=currency.lower(),
                                status=payment_status,
                                metadata={}  # Empty metadata as fallback
                            )
                        except Exception as tx_error2:
                            # Continue anyway - payment processing is more important than transaction logging
                            transaction_record = None
                elif event_type == 'checkout.session.completed':
                    # Save transaction record for checkout session
                    checkout_session_id = event_data.get('id', 'unknown')
                    amount_total = event_data.get('amount_total', 0) / 100
                    currency = event_data.get('currency', 'unknown').upper()
                    payment_status = event_data.get('payment_status', 'paid')
                    metadata = event_data.get('metadata', {})
                    
                    subscription_obj = None
                    if 'subscription_id' in metadata:
                        try:
                            subscription_obj = Subscription.objects.filter(
                                stripe_checkout_session_id=checkout_session_id
                            ).first()
                        except Exception as e:
                            pass
                    
                    try:
                        transaction_record = PaymentTransaction.objects.create(
                            payment=None,
                            subscription=subscription_obj,
                            stripe_event_id=event_id,
                            stripe_event_type=event_type,
                            amount=amount_total,
                            currency=currency.lower(),
                            status=payment_status,
                            metadata=event_data if isinstance(event_data, dict) else {}
                        )
                    except Exception as tx_error:
                        # Continue anyway - payment processing is more important than transaction logging
                        transaction_record = None
                
        except Exception as e:
            # Return 500 so Stripe will retry
            logger.error(f"[WEBHOOK] Error processing webhook event {event_id}: {str(e)}", exc_info=True)
            import traceback
            logger.error(f"[WEBHOOK] Traceback: {traceback.format_exc()}")
            return JsonResponse({'error': 'Internal server error', 'message': str(e)}, status=500)
        
        return JsonResponse({'status': 'success', 'event_id': event_id})
    
    def get(self, request):
        """
        Test endpoint to verify webhook URL is accessible
        """
        return JsonResponse({
            'status': 'webhook_endpoint_active',
            'message': 'Webhook endpoint is accessible',
            'url': request.build_absolute_uri(),
            'method': request.method
        })

    def handle_checkout_session_completed(self, checkout_session):
        """
        Handle successful checkout session completion.
        Deducts wallet points if they were used and activates subscription.
        """
        from apps.payments.models import Wallet, WalletTransaction, Subscription, PaymentStatus
        from apps.payments.utils import get_subscription_duration_for_seller_type
        from decimal import Decimal
        
        metadata = checkout_session.get('metadata', {})
        payment_intent_id = checkout_session.get('payment_intent')
        checkout_session_id = checkout_session.get('id')
        
        # Check if wallet points were redeemed
        points_redeemed = metadata.get('points_redeemed')
        logger.debug(f"[CHECKOUT_SESSION] Wallet Points Check - Points Redeemed in Metadata: {points_redeemed}")
        
        # Find and activate subscription using metadata
        subscription = None
        subscription_id = metadata.get('subscription_id')
        logger.debug(f"[CHECKOUT_SESSION] Subscription ID from Metadata: {subscription_id}")
        
        if points_redeemed:
            try:
                points_redeemed = Decimal(str(points_redeemed))
                user_id = metadata.get('user_id')
                logger.debug(f"[CHECKOUT_SESSION] Wallet Deduction Parameters - Points: {points_redeemed}, User ID: {user_id}, Subscription ID: {subscription_id}")
                
                if user_id and subscription_id:
                    from apps.users.models import User
                    try:
                        user = User.objects.get(id=user_id)
                        logger.debug(f"[CHECKOUT_SESSION] User Retrieved - User ID: {user.id}, Email: {user.email}")
                    except User.DoesNotExist:
                        logger.error(f"[CHECKOUT_SESSION] ERROR - User not found. User ID: {user_id}")
                        raise
                    
                    wallet = Wallet.get_or_create_wallet(user)
                    
                    # Verify wallet has sufficient balance before deducting
                    if wallet.balance < points_redeemed:
                        logger.error(f"[CHECKOUT_SESSION] ERROR - Insufficient wallet balance. Current: {wallet.balance}, Required: {points_redeemed}, Wallet ID: {wallet.id}")
                        raise ValueError(f"Insufficient wallet balance. Current: {wallet.balance}, Required: {points_redeemed}")
                    
                    # Try to get subscription for description
                    try:
                        subscription_for_desc = Subscription.objects.get(id=subscription_id)
                        plan_name = subscription_for_desc.plan.name if subscription_for_desc.plan else 'Default'
                        description = f"Debit: Subscription Redemption - {plan_name}"
                        logger.debug(f"[CHECKOUT_SESSION] Subscription Found for Description - Subscription ID: {subscription_id}, Plan: {plan_name}")
                    except Subscription.DoesNotExist:
                        description = "Debit: Subscription Redemption - Default"
                        logger.warning(f"[CHECKOUT_SESSION] Subscription Not Found for Description - Subscription ID: {subscription_id}, Using Default Description")
                    
                    # Check for duplicate deductions (idempotency check)
                    # Check by subscription reference first (most specific)
                    existing_transaction = WalletTransaction.objects.filter(
                        wallet=wallet,
                        transaction_type=WalletTransaction.TransactionType.DEBIT,
                        reference_type='apps.payments.models.Subscription',
                        reference_id=subscription_id
                    ).order_by('-created_at').first()
                    
                    # Also check by amount and description pattern as fallback
                    if not existing_transaction:
                        existing_transaction = WalletTransaction.objects.filter(
                            wallet=wallet,
                            transaction_type=WalletTransaction.TransactionType.DEBIT,
                            description__icontains=f"Subscription Redemption",
                            amount=points_redeemed,
                            created_at__gte=subscription_for_desc.created_at if 'subscription_for_desc' in locals() and subscription_for_desc else timezone.now() - timedelta(hours=24)
                        ).order_by('-created_at').first()
                    
                    if existing_transaction:
                        logger.warning(f"[CHECKOUT_SESSION] Duplicate Deduction Detected - Transaction ID: {existing_transaction.id}, Wallet ID: {wallet.id}, Subscription ID: {subscription_id}, Amount: {points_redeemed}, Created: {existing_transaction.created_at}")
                        logger.warning(f"[CHECKOUT_SESSION] Existing Transaction Details - Reference Type: {existing_transaction.reference_type}, Reference ID: {existing_transaction.reference_id}, Description: {existing_transaction.description}")
                    else:
                        # Deduct points from wallet
                        logger.debug(f"[CHECKOUT_SESSION] Deducting Points - Amount: {points_redeemed}, Wallet ID: {wallet.id}, Subscription ID: {subscription_id}")
                        try:
                            transaction = wallet.deduct_points(
                                amount=points_redeemed,
                                transaction_type=WalletTransaction.TransactionType.DEBIT,
                                reference=subscription_for_desc if 'subscription_for_desc' in locals() else None,
                                description=description
                            )
                        except Exception as deduct_error:
                            logger.error(f"[CHECKOUT_SESSION] ERROR - Failed to deduct points: {str(deduct_error)}", exc_info=True)
                            raise
                else:
                    logger.warning(f"[CHECKOUT_SESSION] Missing Required IDs - User ID: {user_id}, Subscription ID: {subscription_id}")
            except Exception as e:
                logger.error(f'[CHECKOUT_SESSION] ERROR - Error deducting wallet points: {str(e)}', exc_info=True)
                # Don't fail the webhook - subscription activation is more important
                # But log the error for debugging
        
        if subscription_id:
            try:
                subscription = Subscription.objects.select_for_update().get(id=subscription_id)
                
                # Verify wallet relationship consistency
                if points_redeemed:
                    try:
                        user_wallet = Wallet.objects.get(user=subscription.user)
                        logger.debug(f"[CHECKOUT_SESSION] Wallet Verification - Wallet ID: {user_wallet.id}, Balance: {user_wallet.balance}, User ID: {subscription.user.id}")
                    except Wallet.DoesNotExist:
                        logger.warning(f"[CHECKOUT_SESSION] Wallet Not Found for User - User ID: {subscription.user.id}")
                    except Exception as e:
                        logger.warning(f"[CHECKOUT_SESSION] Error verifying wallet: {str(e)}")
            except (Subscription.DoesNotExist, ValueError) as e:
                logger.warning(f"[CHECKOUT_SESSION] Subscription not found by ID: {str(e)}")
        
        # If not found by ID, try by checkout_session_id
        if not subscription and checkout_session_id:
            try:
                subscription = Subscription.objects.select_for_update().filter(
                    stripe_checkout_session_id=checkout_session_id
                ).first()
                if subscription:
                    logger.debug(f"[CHECKOUT_SESSION] Found subscription by checkout_session_id. ID: {subscription.id}, Status: {subscription.status}, User ID: {subscription.user.id}")
            except Exception as e:
                logger.warning(f"[CHECKOUT_SESSION] Error finding subscription by checkout_session_id: {str(e)}")
        
        # If still not found, try by payment_intent_id
        if not subscription and payment_intent_id:
            try:
                subscription = Subscription.objects.select_for_update().filter(
                    stripe_payment_intent_id=payment_intent_id
                ).first()
                if subscription:
                    logger.debug(f"[CHECKOUT_SESSION] Found subscription by payment_intent_id. ID: {subscription.id}, Status: {subscription.status}, User ID: {subscription.user.id}")
            except Exception as e:
                logger.warning(f"[CHECKOUT_SESSION] Error finding subscription by payment_intent_id: {str(e)}")
        
        # Activate subscription if found and not already completed
        if subscription:
            logger.debug(f"[CHECKOUT_SESSION] Subscription Found - ID: {subscription.id}, Current Status: {subscription.status}, is_active: {subscription.is_active}, User ID: {subscription.user.id}")
            
            if subscription.status != PaymentStatus.COMPLETED:
                # Get duration from plan if available, otherwise from configuration
                if subscription.plan:
                    duration_days = subscription.plan.duration_days
                else:
                    # Fallback - handle gym_owner without seller_type
                    user = subscription.user
                    if user.seller_type:
                        duration_days = get_subscription_duration_for_seller_type(user.seller_type)
                    else:
                        # Default duration for gym_owner (90 days)
                        duration_days = 90
                
                # Update payment_intent_id and checkout_session_id if not set
                if payment_intent_id and not subscription.stripe_payment_intent_id:
                    subscription.stripe_payment_intent_id = payment_intent_id
                    logger.debug(f"[CHECKOUT_SESSION] Updated payment_intent_id: {payment_intent_id}")
                if checkout_session_id and not subscription.stripe_checkout_session_id:
                    subscription.stripe_checkout_session_id = checkout_session_id
                    logger.debug(f"[CHECKOUT_SESSION] Updated checkout_session_id: {checkout_session_id}")
                
                subscription.activate(duration_days=duration_days)
                
                # Final verification - check wallet balance if points were redeemed
                if points_redeemed:
                    try:
                        final_wallet = Wallet.objects.get(user=subscription.user)
                    except Exception as e:
                        logger.warning(f"[CHECKOUT_SESSION] Could not verify final wallet balance: {str(e)}")
            else:
                logger.debug(f"[CHECKOUT_SESSION] Subscription already completed, skipping activation (idempotency) - Subscription ID: {subscription.id}")
        else:
            logger.warning(f"[CHECKOUT_SESSION] Subscription Not Found - Could not locate subscription for checkout_session_id: {checkout_session_id}, payment_intent_id: {payment_intent_id}, subscription_id: {subscription_id}")
        
        # Also process via payment intent handler as fallback (in case subscription wasn't found above)
        if payment_intent_id and not subscription:
            try:
                payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
                self.handle_payment_success(payment_intent)
            except Exception as e:
                logger.warning(f'[CHECKOUT_SESSION] Error processing payment intent for checkout session: {str(e)}')

    def handle_payment_success(self, payment_intent):
        """Handle successful payment - idempotent"""
        payment_intent_id = payment_intent['id']
        metadata = payment_intent.get('metadata', {})
        amount = payment_intent.get('amount', 0) / 100  # Convert from cents to dollars
        currency = payment_intent.get('currency', 'aed').lower()

        # Check if it's a payment (INDIVIDUAL)
        if 'payment_id' in metadata:
            try:
                payment = Payment.objects.select_for_update().get(
                    stripe_payment_intent_id=payment_intent_id
                )
                
                # Idempotency check - only update if not already completed
                if payment.status != PaymentStatus.COMPLETED:
                    payment.status = PaymentStatus.COMPLETED
                    payment.completed_at = timezone.now()
                    payment.save()
                    
            except Payment.DoesNotExist:
                pass
            except Exception as e:
                raise  # Re-raise to trigger transaction rollback

        # Check if it's a subscription (COMPANY/AGENT/ADVERTISER/gym_owner)
        # Try to find subscription by payment_intent_id first (works for both PaymentIntent and Checkout Session)
        subscription = None
        try:
            # First try to find by payment_intent_id (this works for Checkout Sessions too)
            subscription = Subscription.objects.select_for_update().get(
                stripe_payment_intent_id=payment_intent_id
            )
        except Subscription.DoesNotExist:
            logger.warning(f"[PAYMENT_SUCCESS] Subscription not found by payment_intent_id: {payment_intent_id}")
            
        # If not found by payment_intent_id and metadata has subscription_id, try that
        if not subscription and 'subscription_id' in metadata:
            try:
                subscription_id = metadata.get('subscription_id')
                if subscription_id:
                    subscription = Subscription.objects.select_for_update().get(
                        id=subscription_id
                    )
                    # Update the payment_intent_id if it wasn't set
                    if not subscription.stripe_payment_intent_id:
                        subscription.stripe_payment_intent_id = payment_intent_id
                        subscription.save(update_fields=['stripe_payment_intent_id'])
            except (Subscription.DoesNotExist, ValueError) as e:
                logger.warning(f"[PAYMENT_SUCCESS] Subscription not found by ID from metadata: {str(e)}")
                        
        # If still not found, try to find by user_id from metadata
        if not subscription:
            try:
                        user_id = metadata.get('user_id')
                        if user_id:
                            from apps.users.models import User
                            user = User.objects.get(id=user_id)
                            
                            subscription, created = Subscription.objects.get_or_create(
                                user=user,
                                defaults={
                                    'amount': Decimal(str(amount)),
                                    'currency': currency.lower(),
                                    'status': PaymentStatus.PENDING,
                                    'stripe_payment_intent_id': payment_intent_id,
                                }
                            )
                            
                            if not created:
                                # Update payment_intent_id if not set
                                if not subscription.stripe_payment_intent_id:
                                    subscription.stripe_payment_intent_id = payment_intent_id
                                    subscription.save(update_fields=['stripe_payment_intent_id'])
                            
                            # Try to find a plan for the user
                            user_role = getattr(user, 'role_code', None)
                            
                            if user_role == 'gym_owner':
                                plan = SubscriptionPlan.objects.filter(
                                    role='gym_owner',
                                    is_active=True
                                ).first()
                            elif user.seller_type:
                                seller_type_mapping = {
                                    User.SellerTypes.INDIVIDUAL: SubscriptionPlan.SellerType.INDIVIDUAL,
                                    User.SellerTypes.COMPANY: SubscriptionPlan.SellerType.COMPANY,
                                    User.SellerTypes.AGENT: SubscriptionPlan.SellerType.AGENT,
                                    User.SellerTypes.ADVERTISER: SubscriptionPlan.SellerType.AGENT,
                                }
                                expected_seller_type = seller_type_mapping.get(user.seller_type)
                                plan = SubscriptionPlan.get_active_plan_for_role('owner', expected_seller_type)
                            else:
                                plan = None
                            
                            if plan:
                                subscription.plan = plan
                                subscription.amount = plan.price
                                subscription.save()
            except (User.DoesNotExist, ValueError, Exception) as e:
                logger.warning(f"[PAYMENT_SUCCESS] Error finding/creating subscription by user_id: {str(e)}")
                subscription = None
        
        # Also try to find by checkout_session_id if payment_intent came from checkout session
        if not subscription:
            try:
                # Retrieve the payment intent to see if it has a checkout session reference
                payment_intent_obj = stripe.PaymentIntent.retrieve(payment_intent_id)
                # Check if this payment intent was created by a checkout session
                # We can find checkout sessions that have this payment_intent
                checkout_sessions = stripe.checkout.Session.list(
                    payment_intent=payment_intent_id,
                    limit=1
                )
                if checkout_sessions.data:
                    checkout_session_id = checkout_sessions.data[0].id
                    subscription = Subscription.objects.select_for_update().filter(
                        stripe_checkout_session_id=checkout_session_id
                    ).first()
                    if subscription:
                        # Update payment_intent_id if not set
                        if not subscription.stripe_payment_intent_id:
                            subscription.stripe_payment_intent_id = payment_intent_id
                            subscription.save(update_fields=['stripe_payment_intent_id'])
            except Exception as e:
                logger.warning(f"[PAYMENT_SUCCESS] Error finding subscription by checkout session: {str(e)}")
        
        if subscription:
            # Idempotency check - only activate if not already completed
            if subscription.status != PaymentStatus.COMPLETED:
                # Get duration from plan if available, otherwise from configuration
                if subscription.plan:
                    duration_days = subscription.plan.duration_days
                else:
                    # Fallback - handle gym_owner without seller_type
                    user = subscription.user
                    if user.seller_type:
                        from apps.payments.utils import get_subscription_duration_for_seller_type
                        duration_days = get_subscription_duration_for_seller_type(user.seller_type)
                    else:
                        # Default duration for gym_owner (90 days)
                        duration_days = 90
                
                subscription.activate(duration_days=duration_days)
            else:
                logger.debug(f"[PAYMENT_SUCCESS] Subscription already completed, skipping activation (idempotency)")
        else:
            logger.error(f"[PAYMENT_SUCCESS] No subscription found for payment_intent_id: {payment_intent_id}, metadata: {metadata}")

    def handle_payment_failure(self, payment_intent):
        """Handle failed payment - idempotent"""
        payment_intent_id = payment_intent['id']
        metadata = payment_intent.get('metadata', {})

        if 'payment_id' in metadata:
            try:
                payment = Payment.objects.select_for_update().get(
                    stripe_payment_intent_id=payment_intent_id
                )
                
                # Idempotency check - only update if not already failed
                if payment.status != PaymentStatus.FAILED:
                    payment.status = PaymentStatus.FAILED
                    payment.save()
                    
            except Payment.DoesNotExist:
                pass
            except Exception as e:
                raise  # Re-raise to trigger transaction rollback

        if 'subscription_id' in metadata:
            try:
                subscription = Subscription.objects.select_for_update().get(
                    stripe_payment_intent_id=payment_intent_id
                )
                
                # Idempotency check - only update if not already failed
                if subscription.status != PaymentStatus.FAILED:
                    subscription.status = PaymentStatus.FAILED
                    subscription.is_active = False
                    subscription.save()
                    # NOTE: Properties and gyms now use individual expiration (expires_at field)
                    # Subscription failure no longer affects properties/gyms - they use their own expires_at field
                    
            except Subscription.DoesNotExist:
                pass
            except Exception as e:
                raise  # Re-raise to trigger transaction rollback

    def handle_payment_cancellation(self, payment_intent):
        """Handle cancelled payment - idempotent"""
        payment_intent_id = payment_intent['id']
        metadata = payment_intent.get('metadata', {})

        if 'payment_id' in metadata:
            try:
                payment = Payment.objects.select_for_update().get(
                    stripe_payment_intent_id=payment_intent_id
                )
                
                if payment.status != PaymentStatus.CANCELLED:
                    payment.status = PaymentStatus.CANCELLED
                    payment.save()
            except Payment.DoesNotExist:
                pass
            except Exception as e:
                raise

        if 'subscription_id' in metadata:
            try:
                subscription = Subscription.objects.select_for_update().get(
                    stripe_payment_intent_id=payment_intent_id
                )
                
                if subscription.status != PaymentStatus.CANCELLED:
                    subscription.status = PaymentStatus.CANCELLED
                    subscription.is_active = False
                    subscription.save()
                    # NOTE: Properties and gyms now use individual expiration (expires_at field)
                    # Subscription cancellation no longer affects properties/gyms - they use their own expires_at field
            except Subscription.DoesNotExist:
                pass
            except Exception as e:
                raise


@method_decorator(csrf_exempt, name='dispatch')
class ManualWebhookTriggerView(APIView):
    """
    Manual webhook trigger for testing purposes.
    Use this to manually process a payment success when webhooks aren't received.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Manually trigger payment success processing.
        Body should contain: {"payment_intent_id": "pi_xxx"}
        """
        payment_intent_id = request.data.get('payment_intent_id')
        
        if not payment_intent_id:
            return Response({
                'error': 'payment_intent_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Retrieve payment intent from Stripe
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if intent.status != 'succeeded':
                return Response({
                    'error': f'PaymentIntent status is {intent.status}, not succeeded',
                    'current_status': intent.status
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create a mock webhook event structure
            payment_intent_data = intent.to_dict()
            
            # Process the payment success
            webhook_view = StripeWebhookView()
            webhook_view.handle_payment_success(payment_intent_data)
            
            return Response({
                'success': True,
                'message': 'Payment processed successfully',
                'payment_intent_id': payment_intent_id,
                'status': intent.status
            }, status=status.HTTP_200_OK)
            
        except stripe.error.StripeError as e:
            return Response({
                'error': f'Stripe error: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WalletViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for wallet operations.
    Users can view their own wallet and transactions.
    Admins can view all wallets.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = WalletDetailSerializer
    
    def get_queryset(self):
        """Return user's wallet or all wallets for admins"""
        user = self.request.user
        is_admin = getattr(user, 'role_code', None) == 'admin'
        
        if is_admin:
            return Wallet.objects.all().select_related('user').prefetch_related('transactions')
        else:
            # Users can only see their own wallet
            # Ensure wallet exists (creates if it doesn't)
            Wallet.get_or_create_wallet(user)
            return Wallet.objects.filter(user=user).select_related('user').prefetch_related('transactions')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WalletDetailSerializer
        return WalletSerializer
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK, extra_meta=None):
        """Helper method to format success responses"""
        meta = {
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        # Merge in any extra metadata (e.g., pagination)
        if extra_meta:
            meta.update(extra_meta)
        
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "status_code": status_code,
            "meta": meta
        }, status=status_code)
    
    def list(self, request, *args, **kwargs):
        """Get user's wallet (or all wallets for admins)"""
        user = request.user
        is_admin = getattr(user, 'role_code', None) == 'admin'
        
        logger.debug(f"[WALLET_LIST] Request from User ID: {user.id}, Email: {user.email}, Is Admin: {is_admin}")
        
        queryset = self.get_queryset()
        
        if is_admin:
            # For admins: return list of all wallets
            wallet_count = queryset.count()
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                logger.debug(f"[WALLET_LIST] Paginated response - Page size: {len(page)}")
                
                # Get pagination metadata
                paginator = self.paginator
                pagination_meta = {
                    "pagination": {
                        "count": paginator.page.paginator.count,
                        "total_pages": paginator.page.paginator.num_pages,
                        "current_page": paginator.page.number,
                        "next": paginator.get_next_link(),
                        "previous": paginator.get_previous_link(),
                    }
                }
                
                return self._format_success_response(
                    data=serializer.data,
                    message=f"Retrieved {len(page)} wallet(s) successfully",
                    extra_meta=pagination_meta
                )
            
            serializer = self.get_serializer(queryset, many=True)
            return self._format_success_response(
                data=serializer.data,
                message=f"Retrieved {wallet_count} wallet(s) successfully"
            )
        else:
            # For regular users: return their own wallet
            wallet = queryset.first()
            
            if not wallet:
                # Create wallet if it doesn't exist
                logger.debug(f"[WALLET_LIST] Wallet not found for user {user.id}, creating new wallet")
                wallet = Wallet.get_or_create_wallet(request.user)
            
            logger.debug(f"[WALLET_LIST] Returning wallet for user {user.id} - Wallet ID: {wallet.id}, Balance: {wallet.balance}")
            serializer = self.get_serializer(wallet)
            return self._format_success_response(
                data=serializer.data,
                message="Wallet retrieved successfully"
            )
    
    def retrieve(self, request, *args, **kwargs):
        """Get wallet details with transactions"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return self._format_success_response(
            data=serializer.data,
            message="Wallet details retrieved successfully"
        )
    
    @action(detail=False, methods=['get'], url_path='user/(?P<user_id>[^/.]+)')
    def by_user(self, request, user_id=None):
        """
        Admin-only endpoint to get a specific user's wallet by user_id.
        GET /api/v1/payments/wallets/user/{user_id}/
        """
        # Check if user is admin
        user = request.user
        is_admin = (
            getattr(user, 'role_code', None) == 'admin' or
            getattr(user, 'is_superuser', False) or
            getattr(user, 'is_staff', False)
        )
        
        if not is_admin:
            return Response(
                {
                    "success": False,
                    "message": "Permission denied",
                    "errors": {"detail": "Only admin users can access this endpoint"},
                    "status_code": status.HTTP_403_FORBIDDEN
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get the target user
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "User not found",
                    "errors": {"user_id": f"No user found with ID: {user_id}"},
                    "status_code": status.HTTP_404_NOT_FOUND
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get or create wallet for the target user (already optimized in the method)
        wallet = Wallet.get_or_create_wallet(target_user)
        
        # Ensure we have the optimized version with all related objects
        # This handles the case where wallet was just created (no transactions yet)
        wallet = Wallet.objects.select_related('user').prefetch_related('transactions').get(pk=wallet.pk)
        
        serializer = self.get_serializer(wallet)
        return self._format_success_response(
            data=serializer.data,
            message=f"Wallet retrieved successfully for user {target_user.email}"
        )


class WalletTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for wallet transactions.
    Users can view their own transactions.
    Admins can view all transactions.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = WalletTransactionSerializer
    
    def get_queryset(self):
        """Return user's transactions or all transactions for admins"""
        user = self.request.user
        is_admin = getattr(user, 'role_code', None) == 'admin'
        
        if is_admin:
            return WalletTransaction.objects.all().select_related('wallet', 'wallet__user', 'created_by')
        else:
            # Users can only see their own transactions
            # Ensure wallet exists (creates if it doesn't)
            wallet = Wallet.get_or_create_wallet(user)
            return WalletTransaction.objects.filter(wallet=wallet).select_related('wallet', 'wallet__user', 'created_by')
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }, status=status_code)
    
    def list(self, request, *args, **kwargs):
        """List wallet transactions"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self._format_success_response(
                data=serializer.data,
                message="Transactions retrieved successfully"
            )
        
        serializer = self.get_serializer(queryset, many=True)
        return self._format_success_response(
            data=serializer.data,
            message="Transactions retrieved successfully"
        )
    
    def retrieve(self, request, *args, **kwargs):
        """Get transaction details"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return self._format_success_response(
            data=serializer.data,
            message="Transaction retrieved successfully"
        )


class CheckoutSessionVerifyView(APIView):
    """
    Verify Stripe Checkout Session status after redirect.
    Frontend calls this after being redirected from Stripe.
    """
    permission_classes = [IsAuthenticated]

    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }, status=status_code)

    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        response_data = {
            "success": False,
            "message": message,
            "errors": errors or {},
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }
        return Response(response_data, status=status_code)

    def get(self, request):
        """
        Verify checkout session status.
        GET /api/v1/payments/verify-checkout-session/?session_id=cs_xxx
        """
        session_id = request.query_params.get('session_id')
        
        if not session_id:
            return self._format_error_response(
                message="session_id is required",
                errors={"session_id": "Please provide session_id query parameter"},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Retrieve checkout session from Stripe
            checkout_session = stripe.checkout.Session.retrieve(session_id)
            
            # Verify this session belongs to the current user
            metadata = checkout_session.get('metadata', {})
            user_id = metadata.get('user_id')
            
            if user_id and str(request.user.id) != str(user_id):
                return self._format_error_response(
                    message="Unauthorized",
                    errors={"detail": "This checkout session does not belong to you"},
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            # Get subscription if exists
            subscription = None
            subscription_id = metadata.get('subscription_id')
            if subscription_id:
                try:
                    subscription = Subscription.objects.get(id=subscription_id)
                except Subscription.DoesNotExist:
                    pass
            
            # Return session status
            return self._format_success_response(
                data={
                    "session_id": checkout_session.id,
                    "payment_status": checkout_session.payment_status,  # 'paid', 'unpaid', 'no_payment_required'
                    "status": checkout_session.status,  # 'complete', 'open', 'expired'
                    "amount_total": checkout_session.amount_total / 100 if checkout_session.amount_total else 0,
                    "currency": checkout_session.currency.upper() if checkout_session.currency else 'AED',
                    "subscription": SubscriptionSerializer(subscription).data if subscription else None,
                    "points_redeemed": metadata.get('points_redeemed'),
                    "wallet_discount": metadata.get('wallet_discount'),
                },
                message="Checkout session verified successfully"
            )
            
        except stripe.error.StripeError as e:
            return self._format_error_response(
                message="Stripe error",
                errors={"detail": str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return self._format_error_response(
                message="Error verifying checkout session",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WalletPointsSettingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for wallet points setting management.
    Admin-only access to configure points per property sale.
    Simple singleton model - only one setting exists.
    """
    permission_classes = [IsAdminOnly]
    serializer_class = WalletPointsSettingSerializer
    
    def get_queryset(self):
        """Return the singleton setting"""
        return WalletPointsSetting.objects.all()
    
    def _format_success_response(self, data, message, status_code=status.HTTP_200_OK):
        """Helper method to format success responses"""
        return Response({
            "success": True,
            "message": message,
            "data": data,
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }, status=status_code)
    
    def _format_error_response(self, message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Helper method to format error responses"""
        response_data = {
            "success": False,
            "message": message,
            "errors": errors or {},
            "status_code": status_code,
            "meta": {
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }
        return Response(response_data, status=status_code)
    
    def list(self, request, *args, **kwargs):
        """Get wallet points setting"""
        setting = WalletPointsSetting.get_setting()
        serializer = self.get_serializer(setting)
        return self._format_success_response(
            data=serializer.data,
            message="Wallet points setting retrieved successfully"
        )
    
    def retrieve(self, request, *args, **kwargs):
        """Get wallet points setting"""
        setting = WalletPointsSetting.get_setting()
        serializer = self.get_serializer(setting)
        return self._format_success_response(
            data=serializer.data,
            message="Wallet points setting retrieved successfully"
        )
    
    def update(self, request, *args, **kwargs):
        """Update wallet points setting"""
        setting = WalletPointsSetting.get_setting()
        serializer = self.get_serializer(setting, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Set updated_by to current user
        serializer.save(updated_by=request.user)
        
        return self._format_success_response(
            data=serializer.data,
            message="Wallet points setting updated successfully"
        )
    
    def partial_update(self, request, *args, **kwargs):
        """Partially update wallet points setting"""
        return self.update(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        """Create is not allowed - use get_setting() instead"""
        return self._format_error_response(
            message="Cannot create new setting. Use update to modify existing setting.",
            status_code=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    def destroy(self, request, *args, **kwargs):
        """Delete is not allowed - setting must always exist"""
        return self._format_error_response(
            message="Cannot delete setting. Use update to modify the value.",
            status_code=status.HTTP_405_METHOD_NOT_ALLOWED
        )
