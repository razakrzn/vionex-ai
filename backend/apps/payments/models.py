from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import timedelta
from apps.users.models import User
from decimal import Decimal
import re
import logging

logger = logging.getLogger(__name__)


# Local copy of role codes (User.role field was removed).
SUBSCRIPTION_PLAN_ROLE_CHOICES = (
    ("owner", "Seller"),
    ("seeker", "Buyer"),
    ("admin", "Admin"),
    ("gym_owner", "Gym Owner"),
)


class PaymentStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'
    CANCELLED = 'CANCELLED', 'Cancelled'


class SubscriptionPlan(models.Model):
    """
    Subscription plans with different pricing, duration, and max listings
    for different user roles and seller types.
    """

    class SellerType(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        AGENT = "AGENT", "Agent"
        COMPANY = "COMPANY", "Company"
    
    name = models.CharField(max_length=255, help_text="Plan name (e.g., 'Basic Individual Plan')")
    role = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_PLAN_ROLE_CHOICES,
        default="owner",
        help_text="User role this plan is designed for (e.g., owner, seeker, gym_owner)"
    )
    seller_type = models.CharField(
        max_length=20,
        choices=SellerType.choices,
        null=True,
        blank=True,
        help_text="Required when role='owner'. One of: INDIVIDUAL / AGENT / COMPANY.",
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Price in AED"
    )
    is_offer = models.BooleanField(
        default=False,
        help_text="Whether this plan has an active offer. If True, offer_percentage is required."
    )
    offer_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        default=None,
        help_text="Offer discount percentage (0-100). Required when is_offer=True. If set, offer_price will be calculated automatically."
    )
    duration_days = models.PositiveIntegerField(
        help_text="Subscription duration in days (required)"
    )
    max_listings = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of listings allowed. Leave null for unlimited listings."
    )
    currency = models.CharField(max_length=10, default='AED')
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this plan is currently available for purchase"
    )
    description = models.TextField(blank=True, null=True, help_text="Plan description")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['role', 'seller_type', 'price']
        verbose_name = 'Subscription Plan'
        verbose_name_plural = 'Subscription Plans'
        indexes = [
            models.Index(fields=['role', 'seller_type', 'is_active']),
        ]
    
    def __str__(self):
        unlimited_text = "Unlimited" if self.max_listings is None else f"{self.max_listings} listings"
        seller_type_text = self.seller_type or "Any"
        return f"{self.name} - {self.role}/{seller_type_text} - {self.price} AED ({self.duration_days} days, {unlimited_text})"

    def clean(self):
        # seller_type is required for role='owner', optional otherwise
        if self.role == 'owner' and not self.seller_type:
            raise ValidationError({"seller_type": "This field is required when role='owner'."})
        # duration_days is required
        if self.duration_days is None or self.duration_days <= 0:
            raise ValidationError({"duration_days": "This field is required."})
        # Validate offer_percentage based on is_offer
        if self.is_offer:
            # If is_offer is True, offer_percentage is required
            if self.offer_percentage is None:
                raise ValidationError({"offer_percentage": "Offer percentage is required when is_offer is True."})
            if self.offer_percentage < 0 or self.offer_percentage > 100:
                raise ValidationError({"offer_percentage": "Offer percentage must be between 0 and 100."})
        else:
            # If is_offer is False, clear offer_percentage
            if self.offer_percentage is not None:
                self.offer_percentage = None
    
    @property
    def is_unlimited(self):
        """Check if plan has unlimited listings"""
        return self.max_listings is None
    
    @property
    def offer_price(self):
        """
        Calculate offer price based on offer_percentage.
        Returns discounted price if is_offer is True and offer_percentage is set, otherwise returns None.
        """
        if not self.is_offer:
            return None
        
        if self.offer_percentage is None or self.offer_percentage <= 0:
            return None
        
        # Ensure offer_percentage is between 0 and 100
        if self.offer_percentage > 100:
            return None
        
        # Calculate discount amount
        discount_amount = (self.price * self.offer_percentage) / Decimal('100')
        # Calculate offer price (price - discount)
        offer_price = self.price - discount_amount
        
        # Round to 2 decimal places
        return offer_price.quantize(Decimal('0.01'))
    
    @classmethod
    def get_active_plan_for_role(cls, role, seller_type=None):
        """
        Get the first active plan for a role.
        If seller_type is provided, additionally filter by seller_type.
        """
        qs = cls.objects.filter(role=role, is_active=True)
        if seller_type:
            qs = qs.filter(seller_type=seller_type)
        return qs.order_by('price').first()


class Payment(models.Model):
    """
    Payment model for INDIVIDUAL sellers (per property payment)
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50.00'))
    currency = models.CharField(max_length=10, default='AED')
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING
    )
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    stripe_client_secret = models.CharField(max_length=255, null=True, blank=True)
    property_id = models.IntegerField(null=True, blank=True, help_text="Property ID this payment is for")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'

    def __str__(self):
        return f"Payment {self.id} - {self.user.email} - {self.amount} {self.currency}"


class Subscription(models.Model):
    """
    Subscription model linking User to SubscriptionPlan.
    Tracks subscription status, dates, usage, and auto-renewal.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='subscription',
        help_text="One subscription per user"
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subscriptions',
        help_text="Subscription plan this subscription is based on"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50.00'))
    currency = models.CharField(max_length=10, default='AED')
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING
    )
    stripe_subscription_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    stripe_client_secret = models.CharField(max_length=255, null=True, blank=True)
    stripe_checkout_session_id = models.CharField(
        max_length=255, 
        unique=True, 
        null=True, 
        blank=True,
        help_text="Stripe Checkout Session ID (for wallet redemption flow)"
    )
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    usage_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of listings posted so far"
    )
    is_active = models.BooleanField(default=False)
    auto_renew = models.BooleanField(
        default=False,
        help_text="Whether subscription should auto-renew when it expires"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Subscription'
        verbose_name_plural = 'Subscriptions'

    def __str__(self):
        return f"Subscription {self.id} - {self.user.email}"

    def is_valid(self):
        """Check if subscription is currently active and valid"""
        if not self.is_active or self.status != PaymentStatus.COMPLETED:
            return False
        
        # Check expiration for subscriptions
        if self.end_date and timezone.now() > self.end_date:
            self.is_active = False
            self.save()
            # NOTE: Properties and gyms now use individual expiration (expires_at field), not subscription expiration
            # Subscription expiration no longer affects properties or gyms - they use their own expires_at field
            return False
        return True
    
    def _update_properties_active_status(self, active=True):
        """
        DEPRECATED: This method is no longer used.
        Properties and gyms now use individual expiration (expires_at field) instead of subscription expiration.
        Subscription expiration no longer affects properties or gyms.
        This method is kept for backward compatibility but does nothing.
        """
        # Properties and gyms now use individual expiration (expires_at field)
        # Subscription expiration no longer affects properties or gyms
        # This method is kept for backward compatibility but does nothing
        pass
    
    def can_create_listing(self):
        """Check if user can create a listing based on subscription plan limits"""
        if not self.is_valid():
            return False
        
        # If plan is unlimited, always allow
        if self.plan and self.plan.is_unlimited:
            return True
        
        # If no plan set, fallback to old behavior (unlimited)
        if not self.plan:
            return True
        
        # Check if usage count is below max listings
        can_create = self.usage_count < self.plan.max_listings
        return can_create
    
    def increment_usage(self):
        """Increment usage count when a listing is created"""
        self.usage_count += 1
        update_fields = ['usage_count', 'updated_at']
        
        # Deactivate subscription when listing limit is reached
        if self.plan and not self.plan.is_unlimited:
            if self.usage_count >= self.plan.max_listings:
                self.is_active = False
                self.status = PaymentStatus.CANCELLED
                update_fields.extend(['is_active', 'status'])
        
        self.save(update_fields=update_fields)

    def activate(self, duration_days=None):
        """Activate subscription for specified duration"""
        import logging
        logger = logging.getLogger(__name__)
        
        
        self.start_date = timezone.now()

        # Use plan duration if available, otherwise fallback to old logic
        if duration_days is None:
            if self.plan:
                duration_days = self.plan.duration_days
            else:
                # Get duration from payment configuration based on seller type
                from apps.payments.models import PaymentConfiguration
                config = PaymentConfiguration.get_active_config()
                if self.user.seller_type == User.SellerTypes.COMPANY:
                    duration_days = config.company_subscription_days
                elif self.user.seller_type == User.SellerTypes.AGENT:
                    duration_days = config.agent_subscription_days
                elif self.user.seller_type == User.SellerTypes.ADVERTISER:
                    duration_days = config.advertiser_subscription_days
                else:
                    duration_days = 90  # Default fallback

        self.end_date = timezone.now() + timedelta(days=duration_days)

        self.is_active = True
        self.status = PaymentStatus.COMPLETED
        self.completed_at = timezone.now()
        # Reset usage count when activating new subscription
        self.usage_count = 0
        
        self.save()
        
        # Verify the save worked
        self.refresh_from_db()
        # NOTE: Properties and gyms now use individual expiration (expires_at field)
        # Subscription activation no longer automatically activates properties/gyms
        # They are activated when admin approves them and sets expires_at


class PaymentTransaction(models.Model):
    """
    Track all Stripe payment transactions
    """
    payment = models.ForeignKey(
        Payment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    stripe_event_id = models.CharField(max_length=255, unique=True)
    stripe_event_type = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='AED')
    status = models.CharField(max_length=50)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Payment Transaction'
        verbose_name_plural = 'Payment Transactions'

    def __str__(self):
        return f"Transaction {self.stripe_event_id} - {self.status}"


class PaymentConfiguration(models.Model):
    """
    Admin-configurable payment settings for each seller type and advertisements.
    This is a singleton model - only one instance should exist.
    """
    # Individual seller charges (per property)
    individual_charge_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('50.00'),
        help_text="Charge amount per property for INDIVIDUAL sellers (AED)"
    )
    
    # Company seller charges and validity
    company_charge_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('50.00'),
        help_text="Subscription charge amount for COMPANY sellers (AED)"
    )
    company_subscription_days = models.PositiveIntegerField(
        default=90,
        help_text="Subscription validity in days for COMPANY sellers (default: 90 days = 3 months)"
    )
    
    # Agent seller charges and validity
    agent_charge_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('50.00'),
        help_text="Subscription charge amount for AGENT sellers (AED)"
    )
    agent_subscription_days = models.PositiveIntegerField(
        default=90,
        help_text="Subscription validity in days for AGENT sellers (default: 90 days = 3 months)"
    )
    
    # Advertiser charges and validity
    advertiser_charge_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('50.00'),
        help_text="Charge amount for ADVERTISER sellers (AED)"
    )
    advertiser_subscription_days = models.PositiveIntegerField(
        default=90,
        help_text="Subscription validity in days for ADVERTISER sellers (default: 90 days = 3 months)"
    )
    
    # Advertisement charges (for ads)
    advertisement_charge_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('50.00'),
        help_text="Charge amount per advertisement (AED)"
    )
    advertisement_validity_days = models.PositiveIntegerField(
        default=30,
        help_text="Advertisement validity in days (default: 30 days = 1 month)"
    )
    
    # Currency
    currency = models.CharField(max_length=10, default='AED', help_text="Default currency for all charges")
    
    # Metadata
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this configuration is active. Only one active configuration should exist."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_payment_configs',
        help_text="Admin who last updated this configuration"
    )

    class Meta:
        verbose_name = 'Payment Configuration'
        verbose_name_plural = 'Payment Configurations'
        ordering = ['-is_active', '-updated_at']

    def __str__(self):
        return f"Payment Configuration (Active: {self.is_active})"

    def save(self, *args, **kwargs):
        # Ensure only one active configuration exists
        if self.is_active:
            PaymentConfiguration.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    @classmethod
    def get_active_config(cls):
        """Get the active payment configuration, or create default if none exists"""
        config = cls.objects.filter(is_active=True).first()
        if not config:
            config = cls.objects.create(is_active=True)
        return config


class WalletPointsSetting(models.Model):
    """
    Simple singleton model to store points awarded per property sale.
    Only one instance should exist (managed via get_or_create).
    """
    points_per_sale = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('10.00'),
        help_text="Points awarded per property sale (1 Point = 1 AED)"
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_wallet_points_settings',
        help_text="Admin who last updated this setting"
    )

    class Meta:
        verbose_name = 'Wallet Points Setting'
        verbose_name_plural = 'Wallet Points Settings'

    def __str__(self):
        return f"Points per Sale: {self.points_per_sale}"

    @classmethod
    def get_setting(cls):
        """Get the wallet points setting, or create default if none exists"""
        setting, _ = cls.objects.get_or_create(
            pk=1,  # Force singleton by using pk=1
            defaults={'points_per_sale': Decimal('10.00')}
        )
        return setting


class Wallet(models.Model):
    """
    Wallet model to track user points/credits.
    One wallet per user (OneToOne relationship).
    Points are added when a property is sold.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='wallet',
        help_text="User who owns this wallet"
    )
    balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Current wallet balance in points"
    )
    currency = models.CharField(max_length=10, default='AED', help_text="Currency for wallet balance")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Wallet'
        verbose_name_plural = 'Wallets'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['balance']),
        ]

    def __str__(self):
        return f"Wallet for {self.user.email} - {self.balance} points"

    def add_points(self, amount, transaction_type='CREDIT', reference=None, description=None, created_by=None):
        """
        Add points to wallet and create transaction record.
        
        Args:
            amount: Points to add (Decimal)
            transaction_type: Type of transaction (CREDIT, DEBIT, ADJUSTMENT)
            reference: Reference object (e.g., Property instance)
            description: Transaction description
            created_by: User who created this transaction (for admin adjustments)
        
        Returns:
            WalletTransaction instance
        """
        from django.utils import timezone

        if amount <= 0:
            raise ValueError("Amount must be greater than zero")
        
        reference_type = self._get_reference_type(reference)
        reference_id = self._get_reference_id(reference)
        balance_before = self.balance
        balance_after = self.balance + amount

        # Create transaction record first
        try:
            transaction = WalletTransaction.objects.create(
                wallet=self,
                transaction_type=transaction_type,
                amount=amount,
                balance_before=balance_before,
                balance_after=balance_after,
                reference_type=reference_type,
                reference_id=reference_id,
                description=description or f"{transaction_type} transaction",
                created_by=created_by
            )
        except Exception as e:
            raise
        
        # Update wallet balance
        try:
            old_balance = self.balance
            self.balance += amount
            self.save(update_fields=['balance', 'updated_at'])
            
            # Verify balance consistency
            self.refresh_from_db()
            if self.balance != balance_after:
                logger.error(f"[WALLET_ADD_POINTS] CONSISTENCY ERROR - Expected balance: {balance_after}, Actual balance: {self.balance}")
        except Exception as e:
            logger.error(f"[WALLET_ADD_POINTS] ERROR - Failed to update wallet balance: {str(e)}", exc_info=True)
            raise
        
        # Verify balance consistency after operation
        is_consistent, calculated, actual, last_txn_balance = self.verify_balance_consistency()
        if not is_consistent:
            logger.error(f"[WALLET_ADD_POINTS] Balance Inconsistency After Operation - Wallet ID: {self.id}, Calculated: {calculated}, Actual: {actual}, Last Transaction Balance: {last_txn_balance}")
            # Auto-fix if balance doesn't match last transaction
            if last_txn_balance is not None and abs(actual - last_txn_balance) >= Decimal('0.01'):
                logger.warning(f"[WALLET_ADD_POINTS] Auto-fixing balance: {actual} → {last_txn_balance} (using last transaction balance_after)")
                self.balance = last_txn_balance
                self.save(update_fields=['balance', 'updated_at'])
        return transaction

    def deduct_points(self, amount, transaction_type='DEBIT', reference=None, description=None, created_by=None):
        """
        Deduct points from wallet and create transaction record.
        
        Args:
            amount: Points to deduct (Decimal)
            transaction_type: Type of transaction (usually DEBIT)
            reference: Reference object (e.g., Property instance)
            description: Transaction description
            created_by: User who created this transaction
        
        Returns:
            WalletTransaction instance
        
        Raises:
            ValueError: If insufficient balance
        """
        if amount <= 0:
            logger.error(f"[WALLET_DEDUCT_POINTS] ERROR - Invalid amount: {amount}. Must be greater than zero.")
            raise ValueError("Amount must be greater than zero")
        
        # Refresh wallet to get latest balance (prevent race conditions)
        self.refresh_from_db()
        current_balance = self.balance

        if current_balance < amount:
            logger.error(f"[WALLET_DEDUCT_POINTS] ERROR - Insufficient balance. Current: {current_balance}, Required: {amount}")
            raise ValueError(f"Insufficient balance. Current balance: {current_balance}, Required: {amount}")
        
        reference_type = self._get_reference_type(reference)
        reference_id = self._get_reference_id(reference)
        balance_before = current_balance
        balance_after = current_balance - amount

        # Create transaction record first
        try:
            transaction = WalletTransaction.objects.create(
                wallet=self,
                transaction_type=transaction_type,
                amount=amount,
                balance_before=balance_before,
                balance_after=balance_after,
                reference_type=reference_type,
                reference_id=reference_id,
                description=description or f"{transaction_type} transaction",
                created_by=created_by
            )
        except Exception as e:
            logger.error(f"[WALLET_DEDUCT_POINTS] ERROR - Failed to create transaction record: {str(e)}", exc_info=True)
            raise
        
        # Update wallet balance
        try:
            old_balance = self.balance
            self.balance -= amount
            self.save(update_fields=['balance', 'updated_at'])
            
            # Verify balance consistency
            self.refresh_from_db()
            if self.balance != balance_after:
                logger.error(f"[WALLET_DEDUCT_POINTS] CONSISTENCY ERROR - Expected balance: {balance_after}, Actual balance: {self.balance}")
        except Exception as e:
            logger.error(f"[WALLET_DEDUCT_POINTS] ERROR - Failed to update wallet balance: {str(e)}", exc_info=True)
            raise
        
        # Verify balance consistency after operation
        is_consistent, calculated, actual, last_txn_balance = self.verify_balance_consistency()
        if not is_consistent:
            logger.error(f"[WALLET_DEDUCT_POINTS] Balance Inconsistency After Operation - Wallet ID: {self.id}, Calculated: {calculated}, Actual: {actual}, Last Transaction Balance: {last_txn_balance}")
            # Auto-fix if balance doesn't match last transaction
            if last_txn_balance is not None and abs(actual - last_txn_balance) >= Decimal('0.01'):
                logger.warning(f"[WALLET_DEDUCT_POINTS] Auto-fixing balance: {actual} → {last_txn_balance} (using last transaction balance_after)")
                self.balance = last_txn_balance
                self.save(update_fields=['balance', 'updated_at'])  
        return transaction

    def _get_reference_type(self, reference):
        """Get reference type string from reference object"""
        if reference is None:
            return None
        return f"{reference.__class__.__module__}.{reference.__class__.__name__}"

    def _get_reference_id(self, reference):
        """Get reference ID from reference object"""
        if reference is None:
            return None
        return reference.pk

    def get_balance_from_last_transaction(self):
        """
        Get the balance from the last transaction's balance_after field.
        This is the most reliable source of truth for the current balance.
        Returns (balance, transaction_id) or (None, None) if no transactions exist.
        """
        last_transaction = self.transactions.all().order_by('-created_at').first()
        if last_transaction:
            return last_transaction.balance_after, last_transaction.id
        return Decimal('0.00'), None

    def verify_balance_consistency(self):
        """
        Verify that wallet balance matches the sum of all transactions AND the last transaction's balance_after.
        Returns tuple (is_consistent, calculated_balance, actual_balance, last_transaction_balance)
        """
        try:
            # Get balance from last transaction (most reliable source of truth)
            last_transaction_balance, last_txn_id = self.get_balance_from_last_transaction()
            
            # Calculate balance from transactions
            transactions = self.transactions.all().order_by('created_at')
            calculated_balance = Decimal('0.00')
            transaction_count = transactions.count()

            credit_total = Decimal('0.00')
            debit_total = Decimal('0.00')
            
            for transaction in transactions:
                if transaction.transaction_type == WalletTransaction.TransactionType.CREDIT:
                    calculated_balance += transaction.amount
                    credit_total += transaction.amount
                elif transaction.transaction_type == WalletTransaction.TransactionType.DEBIT:
                    calculated_balance -= transaction.amount
                    debit_total += transaction.amount
                elif transaction.transaction_type == WalletTransaction.TransactionType.ADJUSTMENT:
                    # Adjustments can be positive or negative based on amount
                    calculated_balance += transaction.amount
                    if transaction.amount >= 0:
                        credit_total += transaction.amount
                    else:
                        debit_total += abs(transaction.amount)
            
            actual_balance = self.balance
            
            # Check consistency with last transaction (primary check - most reliable)
            is_consistent_with_last = (abs(actual_balance - last_transaction_balance) < Decimal('0.01'))
            
            # Check consistency with calculated (secondary check)
            is_consistent_with_calc = (abs(calculated_balance - actual_balance) < Decimal('0.01'))
            
            is_consistent = is_consistent_with_last and is_consistent_with_calc
            
            if not is_consistent:
                logger.error(f"[WALLET_CONSISTENCY_CHECK] INCONSISTENCY DETECTED - Wallet ID: {self.id}, User ID: {self.user.id}")
                logger.error(f"[WALLET_CONSISTENCY_CHECK] Current Stored Balance: {actual_balance} AED")
                logger.error(f"[WALLET_CONSISTENCY_CHECK] Last Transaction balance_after: {last_transaction_balance} AED (Transaction ID: {last_txn_id}) - SOURCE OF TRUTH")
                logger.error(f"[WALLET_CONSISTENCY_CHECK] Calculated from all transactions: {calculated_balance} AED")
                
                if not is_consistent_with_last:
                    logger.error(f"[WALLET_CONSISTENCY_CHECK] Difference from last transaction: {actual_balance - last_transaction_balance:+.2f} AED")
                if not is_consistent_with_calc:
                    logger.error(f"[WALLET_CONSISTENCY_CHECK] Difference from calculated: {calculated_balance - actual_balance:+.2f} AED")
                
                logger.error(f"[WALLET_CONSISTENCY_CHECK] Transaction Summary - Total Transactions: {transaction_count}, Credits: {credit_total}, Debits: {debit_total}, Net: {calculated_balance}")
                
                recent_txns = transactions.order_by('-created_at')[:5]
                logger.error(f"[WALLET_CONSISTENCY_CHECK] Recent 5 Transactions:")
                for txn in recent_txns:
                    logger.error(f"[WALLET_CONSISTENCY_CHECK]   - Txn {txn.id}: {txn.transaction_type} {txn.amount} (balance_after: {txn.balance_after}, Ref: {txn.reference_type}/{txn.reference_id}) at {txn.created_at}")
            
            return is_consistent, calculated_balance, actual_balance, last_transaction_balance
        except Exception as e:
            logger.error(f"[WALLET_CONSISTENCY_CHECK] ERROR - Failed to verify balance: {str(e)}", exc_info=True)
            return False, Decimal('0.00'), self.balance, Decimal('0.00')

    @classmethod
    def get_or_create_wallet(cls, user):
        """Get or create wallet for a user with optimized queries"""
        try:
            wallet, created = cls.objects.get_or_create(
                user=user,
                defaults={'balance': Decimal('0.00')}
            )
            
            # Refresh with select_related and prefetch_related for performance
            wallet = cls.objects.select_related('user').prefetch_related('transactions').get(pk=wallet.pk)
            
            # Verify balance consistency on retrieval
            is_consistent, calculated, actual, last_txn_balance = wallet.verify_balance_consistency()
            if not is_consistent:
                logger.warning(
                    f"[WALLET_GET_OR_CREATE] Balance Inconsistency Detected - Wallet ID: {wallet.id}, "
                    f"Calculated: {calculated}, Actual: {actual}, Last Transaction Balance: {last_txn_balance}"
                )
                # Auto-fix: Use last transaction balance as source of truth when significantly different
                if last_txn_balance is not None and abs(actual - last_txn_balance) >= Decimal('0.01'):
                    logger.warning(
                        f"[WALLET_GET_OR_CREATE] Auto-fixing balance: {actual} → {last_txn_balance} "
                        "(using last transaction balance_after)"
                    )
                    wallet.balance = last_txn_balance
                    wallet.save(update_fields=['balance', 'updated_at'])
            
            return wallet
        except Exception as e:
            logger.error(f"[WALLET_GET_OR_CREATE] ERROR - Failed to get or create wallet for user {user.id}: {str(e)}", exc_info=True)
            raise


class WalletTransaction(models.Model):
    """
    Transaction model to track all wallet transactions (credits, debits, adjustments).
    Provides full audit trail for wallet operations.
    """
    class TransactionType(models.TextChoices):
        CREDIT = 'CREDIT', 'Credit'  # Points added (e.g., property sold)
        DEBIT = 'DEBIT', 'Debit'  # Points deducted (e.g., redemption)
        ADJUSTMENT = 'ADJUSTMENT', 'Adjustment'  # Admin adjustment (add/remove points)

    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.CASCADE,
        related_name='transactions',
        help_text="Wallet this transaction belongs to"
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
        help_text="Type of transaction"
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Transaction amount (positive for credit, negative for debit)"
    )
    balance_before = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Wallet balance before this transaction"
    )
    balance_after = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Wallet balance after this transaction"
    )
    reference_type = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Type of reference object (e.g., 'apps.real_estate.models.Property')"
    )
    reference_id = models.IntegerField(
        blank=True,
        null=True,
        help_text="ID of reference object (e.g., Property ID)"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Transaction description"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='wallet_transactions_created',
        help_text="User who created this transaction (for admin adjustments)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Wallet Transaction'
        verbose_name_plural = 'Wallet Transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['wallet', 'created_at']),
            models.Index(fields=['transaction_type', 'created_at']),
            models.Index(fields=['reference_type', 'reference_id']),
            models.Index(fields=['created_by']),
        ]

    def __str__(self):
        return f"{self.transaction_type} - {self.amount} points - {self.wallet.user.email}"

    def get_reference_object(self):
        """Get the reference object if available"""
        if not self.reference_type or not self.reference_id:
            return None
        
        try:
            # Parse reference_type (e.g., 'apps.real_estate.models.Property')
            module_path, class_name = self.reference_type.rsplit('.', 1)
            module = __import__(module_path, fromlist=[class_name])
            model_class = getattr(module, class_name)
            return model_class.objects.get(pk=self.reference_id)
        except (ImportError, AttributeError, model_class.DoesNotExist):
            return None
    
    def get_reference_type_display(self):
        """Get user-friendly reference type display"""
        if not self.reference_type:
            return None
        
        # Mapping of reference types to user-friendly names
        reference_type_mapping = {
            'apps.real_estate.models.Property': 'Property',
            'apps.real_estate.models.PropertyArchive': 'Property',
            'apps.fitness.models.Gym': 'Gym',
            'apps.fitness.models.MembershipPackage': 'Membership Package',
            'apps.payments.models.Subscription': 'Subscription',
            'apps.payments.models.Payment': 'Payment',
        }
        
        # Check if we have a mapping
        if self.reference_type in reference_type_mapping:
            return reference_type_mapping[self.reference_type]
        
        # Fallback: extract class name from full path
        # e.g., 'apps.real_estate.models.Property' -> 'Property'
        try:
            class_name = self.reference_type.rsplit('.', 1)[-1]
            # Convert CamelCase to Title Case with spaces
            # e.g., 'MembershipPackage' -> 'Membership Package'
            class_name = re.sub(r'(?<!^)(?=[A-Z])', ' ', class_name)
            return class_name
        except Exception:
            return self.reference_type
