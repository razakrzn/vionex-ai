from rest_framework import serializers
from django.utils import timezone
from apps.payments.models import Payment, Subscription, SubscriptionPlan, Wallet, WalletTransaction, WalletPointsSetting


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    is_unlimited = serializers.BooleanField(read_only=True)
    offer_price = serializers.SerializerMethodField()
    
    class Meta:
        model = SubscriptionPlan
        fields = ['id', 'name', 'role', 'seller_type', 'price', 'is_offer', 'offer_percentage', 'offer_price', 
                 'duration_days', 'max_listings', 'is_unlimited', 
                 'currency', 'description', 'is_active']
        read_only_fields = ['id', 'is_unlimited', 'offer_price']
    
    def get_offer_price(self, obj):
        """Return calculated offer price if offer_percentage is set"""
        return float(obj.offer_price) if obj.offer_price is not None else None
    
    def to_representation(self, instance):
        """Remove offer_percentage and offer_price from response when is_offer is False"""
        representation = super().to_representation(instance)
        
        # If is_offer is False, remove offer_percentage and offer_price from response
        if not representation.get('is_offer', False):
            representation.pop('offer_percentage', None)
            representation.pop('offer_price', None)
        
        return representation
    
    def validate(self, attrs):
        """
        seller_type is required when role='owner', otherwise optional.
        """
        role = attrs.get('role', getattr(self.instance, 'role', None))
        seller_type = attrs.get('seller_type', getattr(self.instance, 'seller_type', None))
        if role == 'owner' and not seller_type:
            raise serializers.ValidationError({
                "seller_type": "This field is required when role='owner'."
            })

        # duration_days is required
        duration_days = attrs.get('duration_days', getattr(self.instance, 'duration_days', None))
        if not duration_days:
            raise serializers.ValidationError({
                "duration_days": "This field is required."
            })
        
        # Validate offer_percentage based on is_offer
        is_offer = attrs.get('is_offer', getattr(self.instance, 'is_offer', False))
        offer_percentage = attrs.get('offer_percentage', getattr(self.instance, 'offer_percentage', None))
        
        if is_offer:
            # If is_offer is True, offer_percentage is required
            if offer_percentage is None:
                raise serializers.ValidationError({
                    "offer_percentage": "Offer percentage is required when is_offer is True."
                })
            if offer_percentage < 0 or offer_percentage > 100:
                raise serializers.ValidationError({
                    "offer_percentage": "Offer percentage must be between 0 and 100."
                })
        else:
            # If is_offer is False, clear offer_percentage
            if offer_percentage is not None:
                attrs['offer_percentage'] = None
        
        return attrs


class PaymentCreateSerializer(serializers.ModelSerializer):
    property_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = Payment
        fields = ['property_id']
        read_only_fields = ['id', 'user', 'amount', 'currency', 'status', 
                          'stripe_payment_intent_id', 'stripe_client_secret', 
                          'created_at', 'updated_at', 'completed_at']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'amount', 'currency', 'status', 'property_id',
                 'stripe_client_secret', 'created_at', 'completed_at']
        read_only_fields = fields


class SubscriptionCreateSerializer(serializers.Serializer):
    """Serializer for creating subscription"""
    plan_id = serializers.IntegerField(required=False, allow_null=True, help_text="Optional: Specific plan ID. If not provided, uses default plan for user's role.")
    auto_renew = serializers.BooleanField(required=False, default=False, help_text="Whether to auto-renew subscription")


class SubscriptionSerializer(serializers.ModelSerializer):
    is_valid = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    plan = SubscriptionPlanSerializer(read_only=True)
    can_create_listing = serializers.SerializerMethodField()
    usage_info = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = ['id', 'plan', 'amount', 'currency', 'status', 'is_active',
                 'start_date', 'end_date', 'usage_count', 'auto_renew',
                 'stripe_client_secret', 'is_valid', 'days_remaining',
                 'can_create_listing', 'usage_info', 'created_at', 'completed_at']
        read_only_fields = fields

    def get_is_valid(self, obj):
        return obj.is_valid()
    
    def get_can_create_listing(self, obj):
        return obj.can_create_listing()

    def get_days_remaining(self, obj):
        # Unlimited duration: end_date is null
        if obj.is_active and obj.end_date is None:
            return None
        if obj.end_date and obj.is_active:
            delta = obj.end_date - timezone.now()
            return max(0, delta.days)
        return 0
    
    def get_usage_info(self, obj):
        """Return usage information"""
        if not obj.plan:
            return {
                "usage_count": obj.usage_count,
                "max_listings": None,
                "is_unlimited": True,
                "remaining": None
            }
        return {
            "usage_count": obj.usage_count,
            "max_listings": obj.plan.max_listings,
            "is_unlimited": obj.plan.is_unlimited,
            "remaining": None if obj.plan.is_unlimited else max(0, obj.plan.max_listings - obj.usage_count)
        }


class UnifiedPaymentCreateSerializer(serializers.Serializer):
    """
    Unified serializer for creating payments.
    Handles both individual payments and subscriptions based on user's seller_type.
    """
    # For individual payments
    property_id = serializers.IntegerField(required=False, allow_null=True, help_text="Optional property ID for individual payments")
    
    # For subscriptions
    plan_id = serializers.IntegerField(required=False, allow_null=True, help_text="Optional plan ID for subscriptions. If not provided, uses default plan for user's role.")
    auto_renew = serializers.BooleanField(required=False, default=False, help_text="Whether to auto-renew subscription (for subscriptions only)")
    
    # Wallet redemption
    use_wallet_balance = serializers.BooleanField(required=False, default=False, help_text="Whether to use wallet balance for discount (subscriptions only). 1 Point = 1 AED.")
    
    def validate(self, attrs):
        """Validate that appropriate fields are provided based on seller type"""
        # Validation will be done in the view based on user's seller_type
        return attrs


class WalletTransactionSerializer(serializers.ModelSerializer):
    """Serializer for wallet transactions"""
    transaction_type = serializers.SerializerMethodField()
    reference_type = serializers.SerializerMethodField()
    
    class Meta:
        model = WalletTransaction
        fields = [
            'id', 'transaction_type', 'amount',
            'balance_before', 'balance_after', 'description', 'reference_type',
            'reference_id', 'created_at'
        ]
        read_only_fields = fields
    
    def get_transaction_type(self, obj):
        """Return 'credited' or 'debited' based on balance change"""
        if obj.balance_after > obj.balance_before:
            return "credited"
        elif obj.balance_after < obj.balance_before:
            return "debited"
        else:
            # Balance unchanged (shouldn't happen, but handle edge case)
            return "credited" if obj.amount > 0 else "debited"
    
    def get_reference_type(self, obj):
        """Return user-friendly reference type instead of technical path"""
        return obj.get_reference_type_display()


class WalletSerializer(serializers.ModelSerializer):
    """Serializer for wallet - shows recent transactions only"""
    transactions = serializers.SerializerMethodField()
    transaction_count = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Wallet
        fields = [
            'id', 'user_id', 'user_email', 'balance', 'currency', 'transaction_count',
            'transactions', 'created_at', 'updated_at'
        ]
        read_only_fields = fields
    
    def get_transaction_count(self, obj):
        """Get number of transactions"""
        return obj.transactions.count()
    
    def get_transactions(self, obj):
        """Get recent transactions (last 5) for list view"""
        transactions = obj.transactions.all().order_by('-created_at')[:5]
        return WalletTransactionSerializer(transactions, many=True).data
    
    def get_user_email(self, obj):
        """Get user email - only for admins"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            is_admin = getattr(request.user, 'role_code', None) == 'admin'
            if is_admin:
                return obj.user.email if obj.user else None
        return None
    
    def get_user_id(self, obj):
        """Get user ID - only for admins"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            is_admin = getattr(request.user, 'role_code', None) == 'admin'
            if is_admin:
                return obj.user.id if obj.user else None
        return None
    
    def to_representation(self, instance):
        """Remove user_id and user_email for non-admin users"""
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        if request and hasattr(request, 'user'):
            is_admin = getattr(request.user, 'role_code', None) == 'admin'
            if not is_admin:
                # Remove user fields for non-admin users
                data.pop('user_id', None)
                data.pop('user_email', None)
        
        return data


class WalletDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for wallet with paginated transactions"""
    transactions = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Wallet
        fields = [
            'id', 'user_id', 'user_email', 'balance', 'currency', 'transactions',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields
    
    def get_transactions(self, obj):
        """Get recent transactions (last 10)"""
        transactions = obj.transactions.all()[:10]
        return WalletTransactionSerializer(transactions, many=True).data
    
    def get_user_email(self, obj):
        """Get user email - only for admins"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            is_admin = getattr(request.user, 'role_code', None) == 'admin'
            if is_admin:
                return obj.user.email if obj.user else None
        return None
    
    def get_user_id(self, obj):
        """Get user ID - only for admins"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            is_admin = getattr(request.user, 'role_code', None) == 'admin'
            if is_admin:
                return obj.user.id if obj.user else None
        return None
    
    def to_representation(self, instance):
        """Remove user_id and user_email for non-admin users"""
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        if request and hasattr(request, 'user'):
            is_admin = getattr(request.user, 'role_code', None) == 'admin'
            if not is_admin:
                # Remove user fields for non-admin users
                data.pop('user_id', None)
                data.pop('user_email', None)
        
        return data


class WalletPointsSettingSerializer(serializers.ModelSerializer):
    """Serializer for wallet points setting"""
    
    class Meta:
        model = WalletPointsSetting
        fields = [
            'id', 'points_per_sale', 'updated_at', 'updated_by'
        ]
        read_only_fields = ['id', 'updated_at', 'updated_by']
    
    def validate_points_per_sale(self, value):
        """Ensure points_per_sale is positive"""
        if value <= 0:
            raise serializers.ValidationError("Points per sale must be greater than zero")
        return value
