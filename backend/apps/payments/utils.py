import stripe
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
from apps.users.models import User
from apps.payments.models import PaymentStatus

# Initialize Stripe
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)


def get_payment_amount_for_seller_type(seller_type):
    """Get payment amount based on seller type from PaymentConfiguration"""
    from apps.payments.models import PaymentConfiguration
    config = PaymentConfiguration.get_active_config()
    
    if seller_type == User.SellerTypes.INDIVIDUAL:
        return config.individual_charge_amount
    elif seller_type == User.SellerTypes.COMPANY:
        return config.company_charge_amount
    elif seller_type == User.SellerTypes.AGENT:
        return config.agent_charge_amount
    elif seller_type == User.SellerTypes.ADVERTISER:
        return config.advertiser_charge_amount
    return Decimal('0.00')


def get_subscription_duration_for_seller_type(seller_type):
    """Get subscription duration in days based on seller type from PaymentConfiguration"""
    from apps.payments.models import PaymentConfiguration
    config = PaymentConfiguration.get_active_config()
    
    if seller_type == User.SellerTypes.COMPANY:
        return config.company_subscription_days
    elif seller_type == User.SellerTypes.AGENT:
        return config.agent_subscription_days
    elif seller_type == User.SellerTypes.ADVERTISER:
        return config.advertiser_subscription_days
    return 90  # Default fallback


def get_advertisement_charge_amount():
    """Get charge amount for advertisements from PaymentConfiguration"""
    from apps.payments.models import PaymentConfiguration
    config = PaymentConfiguration.get_active_config()
    return config.advertisement_charge_amount


def get_advertisement_validity_days():
    """Get validity in days for advertisements from PaymentConfiguration"""
    from apps.payments.models import PaymentConfiguration
    config = PaymentConfiguration.get_active_config()
    return config.advertisement_validity_days


def can_user_create_property(user, property_id=None):
    """
    Check if user can create a property/gym based on their subscription status.
    All seller types (INDIVIDUAL, COMPANY, AGENT, ADVERTISER) and gym_owner use subscription plans.
    Subscription must be completed and valid BEFORE property/gym creation.
    
    Args:
        user: User instance
        property_id: Optional property ID (not used for payment check, subscription is required before creation)
    
    Returns:
        tuple: (can_create: bool, message: str)
    """
    user_role = getattr(user, 'role_code', None)
    is_gym_owner = user_role == 'gym_owner'
    
    # gym_owner doesn't need seller_type
    if not user.seller_type and user_role != 'gym_owner':
        return False, "Seller type is required"
    
    # All seller types and gym_owner now use subscription plans
    if hasattr(user, 'subscription'):
        subscription = user.subscription
        is_valid = subscription.is_valid()
        can_create = subscription.can_create_listing()
        
        if is_valid and can_create:
            if is_gym_owner:
                return True, "Active subscription - you can create gyms"
            return True, "Active subscription - you can create properties"
        
        if not is_valid:
            if is_gym_owner:
                return False, "Subscription expired or inactive. Please renew your subscription before creating gyms."
            return False, "Subscription expired or inactive. Please renew your subscription before creating properties."
        
        if not can_create:
            # Check if it's because of usage limit
            if subscription.plan and not subscription.plan.is_unlimited:
                remaining = subscription.plan.max_listings - subscription.usage_count
                if is_gym_owner:
                    return False, f"You have reached your gym limit ({subscription.usage_count}/{subscription.plan.max_listings}). Please upgrade your plan or wait for renewal."
                return False, f"You have reached your listing limit ({subscription.usage_count}/{subscription.plan.max_listings}). Please upgrade your plan or wait for renewal."
            else:
                if is_gym_owner:
                    return False, "Cannot create gym. Please check your subscription status."
                return False, "Cannot create listing. Please check your subscription status."
        
        # Note: We rely on webhooks to update subscription status
        # If subscription is still pending, webhook may not have been received yet
        
        if is_gym_owner:
            return False, "Subscription expired or inactive. Please renew your subscription before creating gyms."
        return False, "Subscription expired or inactive. Please renew your subscription before creating properties."
    else:
        if is_gym_owner:
            return False, "No active subscription. Please subscribe before creating gyms."
        return False, "No active subscription. Please subscribe before creating properties."


def create_stripe_payment_intent(amount, currency='aed', metadata=None):
    """Create a Stripe payment intent"""
    if not stripe.api_key:
        raise Exception("Stripe API key is not configured")
    
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),  # Convert to cents/fils
            currency=currency.lower(),
            metadata=metadata or {},
            automatic_payment_methods={
                'enabled': True,
            },
        )
        return intent
    except stripe.error.StripeError as e:
        raise Exception(f"Stripe error: {str(e)}")


def sync_payment_status_from_stripe(payment):
    """
    Sync payment status from Stripe PaymentIntent.
    Useful when webhooks are not received (e.g., in development).
    
    Args:
        payment: Payment instance with stripe_payment_intent_id
    
    Returns:
        bool: True if status was updated, False otherwise
    """
    if not payment.stripe_payment_intent_id:
        return False
    
    if not stripe.api_key:
        return False
    
    try:
        intent = stripe.PaymentIntent.retrieve(payment.stripe_payment_intent_id)
        
        if intent.status == 'succeeded' and payment.status != PaymentStatus.COMPLETED:
            payment.status = PaymentStatus.COMPLETED
            payment.completed_at = timezone.now()
            payment.save()
            return True
        elif intent.status == 'payment_failed' and payment.status != PaymentStatus.FAILED:
            payment.status = PaymentStatus.FAILED
            payment.save()
            return True
        else:
            return False
            
    except stripe.error.StripeError as e:
        return False
    except Exception as e:
        return False


def sync_subscription_status_from_stripe(subscription):
    """
    Sync subscription status from Stripe PaymentIntent.
    Useful when webhooks are not received (e.g., in development).
    
    Args:
        subscription: Subscription instance with stripe_payment_intent_id
    
    Returns:
        bool: True if status was updated, False otherwise
    """
    if not subscription.stripe_payment_intent_id:
        return False
    
    if not stripe.api_key:
        return False
    
    try:
        intent = stripe.PaymentIntent.retrieve(subscription.stripe_payment_intent_id)
        
        if intent.status == 'succeeded' and subscription.status != PaymentStatus.COMPLETED:
            duration_days = get_subscription_duration_for_seller_type(subscription.user.seller_type)
            subscription.activate(duration_days=duration_days)
            return True
        elif intent.status == 'payment_failed' and subscription.status != PaymentStatus.FAILED:
            subscription.status = PaymentStatus.FAILED
            subscription.save()
            return True
        else:
            return False
            
    except stripe.error.StripeError as e:
        return False
    except Exception as e:
        return False
