from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Payment, Subscription, SubscriptionPlan, PaymentTransaction, PaymentConfiguration, Wallet, WalletTransaction, WalletPointsSetting


@admin.register(PaymentConfiguration)
class PaymentConfigurationAdmin(admin.ModelAdmin):
    """Admin interface for payment configuration - singleton model"""
    list_display = ['id', 'is_active', 'currency', 'updated_at', 'updated_by']
    list_filter = ['is_active', 'currency', 'updated_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Individual Seller Settings', {
            'fields': ('individual_charge_amount',),
            'description': 'Charges for INDIVIDUAL sellers (per property payment)'
        }),
        ('Company Seller Settings', {
            'fields': ('company_charge_amount', 'company_subscription_days',),
            'description': 'Charges and subscription validity for COMPANY sellers'
        }),
        ('Agent Seller Settings', {
            'fields': ('agent_charge_amount', 'agent_subscription_days',),
            'description': 'Charges and subscription validity for AGENT sellers'
        }),
        ('Advertiser Seller Settings', {
            'fields': ('advertiser_charge_amount', 'advertiser_subscription_days',),
            'description': 'Charges and subscription validity for ADVERTISER sellers'
        }),
        ('Advertisement Settings', {
            'fields': ('advertisement_charge_amount', 'advertisement_validity_days',),
            'description': 'Charges and validity for advertisements'
        }),
        ('General Settings', {
            'fields': ('currency', 'is_active',),
        }),
        ('Metadata', {
            'fields': ('updated_by', 'created_at', 'updated_at',),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Set updated_by to current user"""
        if not change:  # New object
            obj.updated_by = request.user
        else:  # Updating existing object
            obj.updated_by = request.user
        super().save_model(request, obj, form, change)
    
    def has_add_permission(self, request):
        """Allow adding only if no active configuration exists"""
        if PaymentConfiguration.objects.filter(is_active=True).exists():
            return False
        return super().has_add_permission(request)
    
    def changelist_view(self, request, extra_context=None):
        """Show message if multiple configurations exist"""
        extra_context = extra_context or {}
        active_count = PaymentConfiguration.objects.filter(is_active=True).count()
        if active_count > 1:
            self.message_user(
                request,
                f"Warning: {active_count} active configurations found. Only one should be active.",
                level='warning'
            )
        return super().changelist_view(request, extra_context=extra_context)


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'role', 'seller_type', 'price', 'is_offer', 'offer_percentage', 'offer_price_display', 'duration_days', 'max_listings_display', 'is_active', 'created_at']
    list_filter = ['role', 'seller_type', 'is_offer', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'offer_price_display']
    
    fieldsets = (
        ('Plan Information', {
            'fields': ('name', 'role', 'seller_type', 'description', 'is_active')
        }),
        ('Pricing', {
            'fields': ('price', 'is_offer', 'offer_percentage', 'offer_price_display', 'currency', 'duration_days'),
            'description': 'Enable is_offer to activate offer pricing. When is_offer is True, offer_percentage is required (0-100). Offer price will be calculated automatically.'
        }),
        ('Limits', {
            'fields': ('max_listings',),
            'description': 'Leave max_listings empty for unlimited listings'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def max_listings_display(self, obj):
        """Display max listings or 'Unlimited'"""
        return "Unlimited" if obj.is_unlimited else obj.max_listings
    max_listings_display.short_description = 'Max Listings'
    
    def offer_price_display(self, obj):
        """Display calculated offer price"""
        if obj.offer_price is not None:
            return f"{obj.offer_price} {obj.currency}"
        return "-"
    offer_price_display.short_description = 'Offer Price'


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'amount', 'status', 'property_id', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__email', 'stripe_payment_intent_id']
    readonly_fields = ['created_at', 'updated_at', 'completed_at']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'plan', 'amount', 'status', 'is_active', 'usage_count', 'auto_renew', 'end_date', 'created_at']
    list_filter = ['status', 'is_active', 'auto_renew', 'plan', 'created_at']
    search_fields = ['user__email', 'stripe_subscription_id']
    readonly_fields = ['created_at', 'updated_at', 'completed_at', 'usage_count']
    
    fieldsets = (
        ('User & Plan', {
            'fields': ('user', 'plan')
        }),
        ('Payment Details', {
            'fields': ('amount', 'currency', 'status')
        }),
        ('Stripe Information', {
            'fields': ('stripe_subscription_id', 'stripe_payment_intent_id', 'stripe_client_secret'),
            'classes': ('collapse',)
        }),
        ('Subscription Period', {
            'fields': ('start_date', 'end_date', 'is_active')
        }),
        ('Usage & Renewal', {
            'fields': ('usage_count', 'auto_renew')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'stripe_event_id', 'stripe_event_type', 'amount', 'status', 'created_at']
    list_filter = ['stripe_event_type', 'status', 'created_at']
    search_fields = ['stripe_event_id']
    readonly_fields = ['created_at']


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    """Admin interface for wallet management"""
    list_display = ['id', 'user_email', 'balance', 'currency', 'transaction_count', 'updated_at']
    list_filter = ['currency', 'created_at', 'updated_at']
    search_fields = ['user__email', 'user__full_name']
    readonly_fields = ['created_at', 'updated_at', 'transaction_count_display']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Balance Information', {
            'fields': ('balance', 'currency')
        }),
        ('Statistics', {
            'fields': ('transaction_count_display',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_email(self, obj):
        """Display user email with link"""
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    def transaction_count(self, obj):
        """Display number of transactions"""
        return obj.transactions.count()
    transaction_count.short_description = 'Transactions'
    
    def transaction_count_display(self, obj):
        """Display transaction count in detail view"""
        count = obj.transactions.count()
        url = reverse('admin:payments_wallettransaction_changelist')
        url += f'?wallet__id__exact={obj.id}'
        return format_html('<a href="{}">{} transactions</a>', url, count)
    transaction_count_display.short_description = 'Total Transactions'
    
    actions = ['adjust_balance']
    
    def adjust_balance(self, request, queryset):
        """Admin action to adjust wallet balance"""
        from django.contrib import messages
        from decimal import Decimal
        
        if queryset.count() != 1:
            messages.error(request, "Please select exactly one wallet to adjust.")
            return
        
        wallet = queryset.first()
        # This is a placeholder - in a real implementation, you'd use a custom form
        messages.info(request, f"To adjust balance for {wallet.user.email}, use the 'Adjust Balance' action in the wallet detail view.")
    adjust_balance.short_description = "Adjust Balance (Select one wallet)"


@admin.register(WalletPointsSetting)
class WalletPointsSettingAdmin(admin.ModelAdmin):
    """Admin interface for wallet points setting - singleton model"""
    list_display = ['id', 'points_per_sale', 'updated_at', 'updated_by']
    list_filter = ['updated_at']
    readonly_fields = ['updated_at']
    
    fieldsets = (
        ('Points Setting', {
            'fields': ('points_per_sale',),
            'description': 'Points awarded per property sale (1 Point = 1 AED)'
        }),
        ('Metadata', {
            'fields': ('updated_by', 'updated_at',),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Set updated_by to current user"""
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)
    
    def has_add_permission(self, request):
        """Prevent adding multiple instances - use get_or_create instead"""
        if WalletPointsSetting.objects.exists():
            return False
        return super().has_add_permission(request)
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion - always keep one setting"""
        return False


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    """Admin interface for wallet transaction management"""
    list_display = [
        'id', 'wallet_user', 'transaction_type', 'amount', 
        'balance_before', 'balance_after', 'reference_link', 
        'created_by_display', 'created_at'
    ]
    list_filter = ['transaction_type', 'created_at', 'reference_type']
    search_fields = [
        'wallet__user__email', 'wallet__user__full_name', 
        'description', 'reference_id'
    ]
    readonly_fields = [
        'wallet', 'transaction_type', 'amount', 'balance_before', 
        'balance_after', 'reference_type', 'reference_id', 
        'description', 'created_by', 'created_at', 'reference_object_link'
    ]
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Transaction Information', {
            'fields': ('wallet', 'transaction_type', 'amount', 'description')
        }),
        ('Balance Information', {
            'fields': ('balance_before', 'balance_after')
        }),
        ('Reference Information', {
            'fields': ('reference_type', 'reference_id', 'reference_object_link'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def wallet_user(self, obj):
        """Display wallet user with link"""
        url = reverse('admin:users_user_change', args=[obj.wallet.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.wallet.user.email)
    wallet_user.short_description = 'User'
    wallet_user.admin_order_field = 'wallet__user__email'
    
    def created_by_display(self, obj):
        """Display who created the transaction"""
        if obj.created_by:
            url = reverse('admin:users_user_change', args=[obj.created_by.pk])
            return format_html('<a href="{}">{}</a>', url, obj.created_by.email)
        return '-'
    created_by_display.short_description = 'Created By'
    created_by_display.admin_order_field = 'created_by__email'
    
    def reference_link(self, obj):
        """Display reference object link if available"""
        if obj.reference_type and obj.reference_id:
            ref_obj = obj.get_reference_object()
            if ref_obj:
                # Try to get admin URL for the reference object
                try:
                    app_label = obj.reference_type.split('.')[1]  # e.g., 'real_estate'
                    model_name = obj.reference_type.split('.')[-1].lower()  # e.g., 'property'
                    url = reverse(f'admin:{app_label}_{model_name}_change', args=[obj.reference_id])
                    return format_html('<a href="{}">{}</a>', url, str(ref_obj))
                except:
                    return f"{obj.reference_type} #{obj.reference_id}"
            return f"{obj.reference_type} #{obj.reference_id}"
        return '-'
    reference_link.short_description = 'Reference'
    
    def reference_object_link(self, obj):
        """Display reference object link in detail view"""
        return self.reference_link(obj)
    reference_object_link.short_description = 'Reference Object'
    
    def has_add_permission(self, request):
        """Prevent manual transaction creation - use wallet methods instead"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Transactions are immutable - read-only"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent transaction deletion for audit trail"""
        return False
