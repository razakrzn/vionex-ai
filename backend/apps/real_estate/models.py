from django.db import models
from django.contrib.gis.db.models import PointField
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db.models.signals import pre_delete, pre_save, post_save
from django.dispatch import receiver
from apps.users.models import User
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


def validate_image_size(value):
    """Validate that image size is not larger than 10MB"""
    max_size = 10 * 1024 * 1024  # 10MB in bytes
    if value.size > max_size:
        raise ValidationError(
            f'Image file too large. Size should not exceed {max_size / (1024*1024):.1f}MB. '
            f'Got {value.size / (1024*1024):.1f}MB.'
        )


class AssetType(models.Model):
    """
    Main categories: Residential, Commercial, Land
    """
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Asset Type"
        verbose_name_plural = "Asset Types"
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class PropertyType(models.Model):
    """
    Specific property types: Apartment, Villa, Office, etc.
    """
    asset_type = models.ForeignKey(
        AssetType,
        related_name='property_types',
        on_delete=models.CASCADE
    )
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, blank=True)
    occupant_count = models.PositiveIntegerField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Property Type"
        verbose_name_plural = "Property Types"
        unique_together = ['asset_type', 'name']
        ordering = ['asset_type', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.asset_type.name})"


class Purpose(models.Model):
    """
    Purpose: For Rent, For Sale, Off-Plan
    """
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Purpose"
        verbose_name_plural = "Purposes"
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class FurnishingStatus(models.Model):
    """
    Furnishing Status: Furnished, Semi-Furnished, Unfurnished
    """
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Furnishing Status"
        verbose_name_plural = "Furnishing Statuses"
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class CompletionStatus(models.Model):
    """
    Completion Status: Ready to Move, Off-Plan / Under Construction
    """
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Completion Status"
        verbose_name_plural = "Completion Statuses"
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class OccupantType(models.Model):
    """
    Occupant Type: Bachelor, Family, Couple, Single, etc.
    """
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Occupant Type"
        verbose_name_plural = "Occupant Types"
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Amenity(models.Model):
    """
    Property amenities/features: Central A/C, Balcony, Gym, etc.
    """
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    icon = models.CharField(max_length=50, blank=True, null=True)  # For frontend icons
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Amenity"
        verbose_name_plural = "Amenities"
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ListingStatus:
    """
    Listing status choices for property market availability
    """
    AVAILABLE = 'AVAILABLE'
    SOLD = 'SOLD'
    RENTED = 'RENTED'
    OFF_MARKET = 'OFF_MARKET'
    
    CHOICES = [
        (AVAILABLE, 'Available'),
        (SOLD, 'Sold'),
        (RENTED, 'Rented'),
        (OFF_MARKET, 'Temporarily Off Market'),
    ]


class Property(models.Model):
    """
    Main Property model
    """
    # Basic Information
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Property Classification
    property_type = models.ForeignKey(
        PropertyType,
        related_name='properties',
        on_delete=models.PROTECT
    )
    purpose = models.ForeignKey(
        Purpose,
        related_name='properties',
        on_delete=models.PROTECT
    )
    furnishing_status = models.ForeignKey(
        FurnishingStatus,
        related_name='properties',
        on_delete=models.PROTECT,
        blank=True,
        null=True
    )
    completion_status = models.ForeignKey(
        CompletionStatus,
        related_name='properties',
        on_delete=models.PROTECT
    )
    
    # Location
    address = models.TextField()
    building_name = models.CharField(max_length=200, blank=True, null=True)
    floor_number = models.CharField(max_length=50, blank=True, null=True)
    unit_number = models.CharField(max_length=50, blank=True, null=True)
    place = models.CharField(max_length=200, blank=True, null=True)
    location = PointField(blank=True, null=True)
    nationality = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Nationality of the property owner"
    )
    
    # Property Details
    bedrooms = models.PositiveIntegerField(blank=True, null=True)
    bathrooms = models.PositiveIntegerField(blank=True, null=True)
    area_sqm = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    # Occupant Information
    occupant_type = models.ForeignKey(
        OccupantType,
        related_name='properties',
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        help_text="Type of occupant suitable for this property: Bachelor, Family, etc."
    )
    occupants_count = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Number of occupants allowed (e.g., 2, 3, 4)"
    )
    
    # Pricing
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='AED')
    price_per_sqft = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    # For Rent specific fields
    rent_period = models.CharField(max_length=20, blank=True, null=True)
    
    # Off-Plan specific fields
    handover_date = models.DateField(blank=True, null=True)
    developer_name = models.CharField(max_length=200, blank=True, null=True)
    project_name = models.CharField(max_length=200, blank=True, null=True)
    
    # Features
    amenities = models.ManyToManyField(Amenity, related_name='properties', blank=True)
    
    # Media
    main_image = models.ImageField(
        upload_to='properties/main/',
        blank=True,
        null=True,
        validators=[
            validate_image_size,
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])
        ]
    )
    social_media = models.JSONField(default=dict, blank=True)
    
    # Owner/Agent Information
    owner = models.ForeignKey(
        User,
        related_name='owned_properties',
        on_delete=models.CASCADE
    )
    
    # Status
    is_approved = models.BooleanField(
        default=False,
        help_text="Admin approval status - separate from subscription status"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether property is active and visible. Auto-managed based on subscription status."
    )
    listing_status = models.CharField(
        max_length=20,
        choices=ListingStatus.CHOICES,
        default=ListingStatus.OFF_MARKET,
        help_text="Market availability status. Automatically set to AVAILABLE when approved, OFF_MARKET when not approved."
    )
    rejection_note = models.TextField(
        blank=True,
        null=True,
        help_text="Note provided by admin when rejecting property"
    )
    
    # Soft Deletion
    is_deleted = models.BooleanField(
        default=False,
        help_text="Soft delete flag - property is marked as deleted but not permanently removed"
    )
    deleted_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Timestamp when property was soft deleted"
    )
    
    # Expiration
    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Property expiration date. Set when admin approves the property. Property becomes inactive after this date."
    )
    approved_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Timestamp when property was approved by admin. Used to calculate expiration."
    )
    
    # Metadata
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Property"
        verbose_name_plural = "Properties"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['property_type', 'purpose']),
            models.Index(fields=['price']),
            models.Index(fields=['is_active', 'is_approved']),
            models.Index(fields=['listing_status', 'is_approved']),
            models.Index(fields=['is_deleted', 'deleted_at']),
        ]

    def __str__(self):
        return f"{self.title}"

    def is_visible_to_seekers(self):
        """
        Check if property is visible to seekers (public).
        Properties with status AVAILABLE are visible to seekers.
        Properties with status SOLD, RENTED, or OFF_MARKET are only visible to the owner.
        """
        return (
            self.is_approved and 
            self.is_active and 
            self.listing_status == ListingStatus.AVAILABLE
        )

    def save(self, *args, **kwargs):
        # Calculate price per sqft if area_sqm is provided
        if self.area_sqm and self.price:
            # Convert area_sqm to sqft (1 sqm = 10.764 sqft) for price_per_sqft calculation
            area_sqft = self.area_sqm * Decimal('10.764')
            self.price_per_sqft = self.price / area_sqft
        
        # Handle listing_status and expiration based on approval status
        if self.pk:  # Only for existing instances
            try:
                old_instance = Property.objects.get(pk=self.pk)
                # If property was just approved (was False, now True)
                if not old_instance.is_approved and self.is_approved:
                    # Automatically set to AVAILABLE when approved
                    self.listing_status = ListingStatus.AVAILABLE
                    # Set approved_at timestamp if not already set
                    from django.utils import timezone
                    if not self.approved_at:
                        self.approved_at = timezone.now()
                    
                    # Set expiration date using paid validity period
                    from django.conf import settings
                    from datetime import timedelta
                    
                    # Paid property - use paid validity period
                    validity_days = getattr(settings, 'PAID_VALIDITY_DAYS', 90)
                    
                    # Only set expires_at if not already set (to avoid overwriting on subsequent saves)
                    if not self.expires_at:
                        self.expires_at = timezone.now() + timedelta(days=validity_days)
                # If property is not approved, force OFF_MARKET
                elif not self.is_approved:
                    self.listing_status = ListingStatus.OFF_MARKET
            except Property.DoesNotExist:
                pass  # New instance
        else:
            # For new instances: if not approved, set to OFF_MARKET
            if not self.is_approved:
                self.listing_status = ListingStatus.OFF_MARKET
            # If new instance is approved, set to AVAILABLE
            elif self.is_approved and self.listing_status == ListingStatus.OFF_MARKET:
                self.listing_status = ListingStatus.AVAILABLE
        
        super().save(*args, **kwargs)


class PropertyGallery(models.Model):
    """
    Gallery images for a property
    """
    property = models.ForeignKey(
        Property,
        related_name="gallery_images",
        on_delete=models.CASCADE
    )
    image = models.ImageField(
        upload_to="properties/gallery/",
        validators=[
            validate_image_size,
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Property Gallery"
        verbose_name_plural = "Property Galleries"
        ordering = ['-created_at']

    def __str__(self):
        return f"Gallery image for {self.property.title}"


@receiver(pre_delete, sender=PropertyGallery)
def delete_gallery_image(sender, instance, **kwargs):
    """Delete image from storage when PropertyGallery instance is deleted"""
    if instance.image:
        try:
            instance.image.delete(save=False)
        except Exception as e:
            logger.error(f'Error deleting gallery image: {str(e)}')


@receiver(pre_save, sender=PropertyGallery)
def delete_old_gallery_image(sender, instance, **kwargs):
    """Delete old image from storage when updating PropertyGallery image"""
    if instance.pk:  # Only for updates, not new instances
        try:
            old_instance = PropertyGallery.objects.get(pk=instance.pk)
            if old_instance.image and instance.image != old_instance.image:
                old_instance.image.delete(save=False)
        except PropertyGallery.DoesNotExist:
            pass
        except Exception as e:
            logger.error(f'Error deleting old gallery image: {str(e)}')


@receiver(pre_save, sender=Property)
def delete_old_property_main_image(sender, instance, **kwargs):
    """Delete old main_image from storage when updating Property main_image"""
    if instance.pk:  # Only for updates, not new instances
        try:
            old_instance = Property.objects.get(pk=instance.pk)
            if old_instance.main_image and instance.main_image != old_instance.main_image:
                old_instance.main_image.delete(save=False)
        except Property.DoesNotExist:
            pass
        except Exception as e:
            logger.error(f'Error deleting old property main image: {str(e)}')


@receiver(pre_delete, sender=Property)
def delete_property_images_on_hard_delete(sender, instance, **kwargs):
    """
    Delete all images from storage when a Property is permanently deleted (hard delete).
    """
    try:
        if instance.main_image:
            instance.main_image.delete(save=False)
    except Exception as e:
        logger.error(f'Error deleting main image for property {instance.id}: {str(e)}')


@receiver(post_save, sender=Property)
def award_referral_reward_on_first_property(sender, instance, created, **kwargs):
    """
    Award referral reward to referrer when a referred user posts their first property.
    Only triggers for 'owner' role users on first property creation (not updates).
    Awards 10 points to the referrer.
    Seekers and admins do not trigger rewards.
    """
    # Only process on creation (not updates)
    if not created:
        return
    
    # Only process for owner role users (seekers don't post properties, gym_owners post gyms)
    if instance.owner.role_code != 'owner':
        return
    
    # Check if the property owner has a referrer
    if not instance.owner.referred_by:
        return
    
    # Get the referrer
    referrer = instance.owner.referred_by
    
    # Skip if referrer is admin (admins don't get referral rewards)
    if referrer.role_code == 'admin':
        return
    
    try:
        # Check if this is the owner's first property
        # Count all properties for this owner (including the one just created)
        property_count = Property.objects.filter(owner=instance.owner).count()
        
        # Only award if this is the first property (count should be exactly 1)
        if property_count != 1:
            return
        
        # Check if reward was already given (prevent duplicate rewards)
        from apps.payments.models import Wallet, WalletTransaction
        
        existing_transaction = WalletTransaction.objects.filter(
            reference_type='apps.real_estate.models.Property',
            reference_id=instance.pk,
            transaction_type=WalletTransaction.TransactionType.CREDIT,
            description__icontains='Referral reward'
        ).exists()
        
        if existing_transaction:
            return
        
        # Get or create wallet for the referrer
        wallet = Wallet.get_or_create_wallet(referrer)
        
        # Award 10 points for referral
        points = Decimal('10.00')
        
        # Add points to referrer's wallet
        wallet.add_points(
            amount=points,
            transaction_type=WalletTransaction.TransactionType.CREDIT,
            reference=instance,
            description=f"Credit: Referral reward - {instance.owner.full_name} (owner) posted first property {instance.title}"
        )
        
        
    except Exception as e:
        # Log error but don't fail the property save
        logger.error(f'Error awarding referral reward for property {instance.pk}: {str(e)}')
        pass


@receiver(pre_save, sender=Property)
def handle_wallet_points_on_property_status_change(sender, instance, **kwargs):
    """
    Keep owner's wallet in sync with property sale status.
    
    - When listing_status changes AVAILABLE → SOLD: credit sale reward points.
    - When listing_status changes SOLD → AVAILABLE: debit (reverse) previously credited points.
    """
    # Skip if this is a new property (no pk yet)
    if not instance.pk:
        return
    
    try:
        # Get the old instance to compare previous status
        old_instance = Property.objects.get(pk=instance.pk)
    except Property.DoesNotExist:
        # Property doesn't exist yet (shouldn't happen in pre_save with pk)
        return
    
    # No change in listing_status, nothing to do
    if old_instance.listing_status == instance.listing_status:
        return
    
    try:
        from apps.payments.models import Wallet, WalletTransaction, WalletPointsSetting
    except Exception as e:
        logger.error(f'Error importing wallet models for property {instance.pk}: {str(e)}')
        return
    
    # --- Case 1: AVAILABLE → SOLD (credit reward points) ---
    if (
        old_instance.listing_status == ListingStatus.AVAILABLE
        and instance.listing_status == ListingStatus.SOLD
    ):
        try:
            # Check transaction history to avoid duplicate points
            existing_transaction = WalletTransaction.objects.filter(
                wallet__user=instance.owner,
                reference_type='apps.real_estate.models.Property',
                reference_id=instance.pk,
                transaction_type=WalletTransaction.TransactionType.CREDIT,
            ).exists()
            
            if existing_transaction:
                return
            
            # Get or create wallet for the owner
            wallet = Wallet.get_or_create_wallet(instance.owner)
            
            # Get points per sale from settings
            points_setting = WalletPointsSetting.get_setting()
            points = points_setting.points_per_sale
            
            # Add points to wallet
            wallet.add_points(
                amount=points,
                transaction_type=WalletTransaction.TransactionType.CREDIT,
                reference=instance,
                description=f"Credit: Reward for {instance.title}"
            )
            
        except Exception as e:
            # Log error but don't fail the property save
            logger.error(f'Error adding wallet points for property {instance.pk}: {str(e)}')
            return
    
    # --- Case 2: SOLD → AVAILABLE (debit / reverse reward points) ---
    elif (
        old_instance.listing_status == ListingStatus.SOLD
        and instance.listing_status == ListingStatus.AVAILABLE
    ):
        try:
            # Get or create wallet for the owner
            wallet = Wallet.get_or_create_wallet(instance.owner)
            
            # Find all credit/debit transactions related to this property & wallet
            related_txns = WalletTransaction.objects.filter(
                wallet=wallet,
                reference_type='apps.real_estate.models.Property',
                reference_id=instance.pk,
            )
            
            # Calculate net credited amount (credits - debits) for this property
            total_credits = sum(
                (t.amount for t in related_txns if t.transaction_type == WalletTransaction.TransactionType.CREDIT),
                Decimal('0.00')
            )
            total_debits = sum(
                (t.amount for t in related_txns if t.transaction_type == WalletTransaction.TransactionType.DEBIT),
                Decimal('0.00')
            )
            net_credited = total_credits - total_debits
            
            # Nothing to reverse if no net credit remaining
            if net_credited <= Decimal('0.00'):
                return
            
            # Determine how many points to reverse (at most points_per_sale)
            points_setting = WalletPointsSetting.get_setting()
            points_per_sale = points_setting.points_per_sale
            points_to_debit = points_per_sale if net_credited >= points_per_sale else net_credited
            
            # Attempt to debit wallet; if insufficient balance, log and skip
            try:
                wallet.deduct_points(
                    amount=points_to_debit,
                    transaction_type=WalletTransaction.TransactionType.DEBIT,
                    reference=instance,
                    description=f"Debit: Reversal for {instance.title} - status changed from SOLD to AVAILABLE"
                )
            except ValueError as exc:
                # Insufficient balance or invalid amount; log but don't block save
                logger.error(
                    f'Failed to debit wallet for SOLD → AVAILABLE reversal on property {instance.pk}: {str(exc)}'
                )
                return
        except Exception as e:
            # Log error but don't fail the property save
            logger.error(f'Error processing wallet reversal for property {instance.pk}: {str(e)}')
            return


class PropertyContact(models.Model):
    """
    Model to store when a seeker (buyer) contacts a property owner
    """
    CONTACT_METHOD_CHOICES = [
        ('call', 'Call'),
        ('whatsapp', 'WhatsApp'),
    ]
    
    seeker = models.ForeignKey(
        User,
        related_name='property_contacts',
        on_delete=models.CASCADE,
        help_text="The user (seeker/buyer) who is contacting the owner"
    )
    property = models.ForeignKey(
        Property,
        related_name='contact_requests',
        on_delete=models.CASCADE,
        help_text="The property the seeker is interested in"
    )
    contact_method = models.CharField(
        max_length=20,
        choices=CONTACT_METHOD_CHOICES,
        help_text="Method of contact: call or whatsapp"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Property Contact"
        verbose_name_plural = "Property Contacts"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['property', 'created_at']),
            models.Index(fields=['seeker', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.seeker.email} contacted {self.property.title} via {self.contact_method}"


class PropertyArchive(models.Model):
    """
    Cold storage archive for deleted properties.
    Keeps data for legal reasons or analytics without slowing down the main app.
    Images are deleted from Cloudinary/S3, but text data is preserved.
    """
    # Store original property ID for reference
    original_id = models.IntegerField(help_text="Original Property ID before archiving")
    
    # Basic Information
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Property Classification
    property_type_name = models.CharField(max_length=200, help_text="Stored as string for archive")
    purpose_name = models.CharField(max_length=200, help_text="Stored as string for archive")
    furnishing_status_name = models.CharField(max_length=200, blank=True, null=True)
    completion_status_name = models.CharField(max_length=200)
    occupant_type_name = models.CharField(max_length=200, blank=True, null=True)
    
    # Location
    address = models.TextField()
    building_name = models.CharField(max_length=200, blank=True, null=True)
    floor_number = models.CharField(max_length=50, blank=True, null=True)
    unit_number = models.CharField(max_length=50, blank=True, null=True)
    place = models.CharField(max_length=200, blank=True, null=True)
    location_latitude = models.FloatField(blank=True, null=True)
    location_longitude = models.FloatField(blank=True, null=True)
    nationality = models.CharField(max_length=100, blank=True, null=True)
    
    # Property Details
    bedrooms = models.PositiveIntegerField(blank=True, null=True)
    bathrooms = models.PositiveIntegerField(blank=True, null=True)
    area_sqm = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    occupants_count = models.PositiveIntegerField(blank=True, null=True)
    
    # Pricing
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='AED')
    price_per_sqft = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    rent_period = models.CharField(max_length=20, blank=True, null=True)
    
    # Off-Plan specific fields
    handover_date = models.DateField(blank=True, null=True)
    developer_name = models.CharField(max_length=200, blank=True, null=True)
    project_name = models.CharField(max_length=200, blank=True, null=True)
    
    # Amenities (stored as JSON)
    amenities = models.JSONField(default=list, help_text="List of amenity names")
    
    # Media (stored as JSON - URLs only, images already deleted)
    main_image_url = models.TextField(blank=True, null=True, help_text="Original URL before deletion")
    social_media = models.JSONField(default=dict, blank=True)
    
    # Owner Information (stored as JSON)
    owner_info = models.JSONField(
        default=dict,
        help_text="Owner information: id, email, name, etc."
    )
    
    # Status at time of deletion
    is_approved = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    listing_status = models.CharField(max_length=20, default='OFF_MARKET')
    rejection_note = models.TextField(blank=True, null=True)
    
    # Metadata
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(help_text="Original creation date")
    updated_at = models.DateTimeField(help_text="Last update date before archiving")
    deleted_at = models.DateTimeField(help_text="When property was soft deleted")
    archived_at = models.DateTimeField(auto_now_add=True, help_text="When property was moved to archive")
    
    class Meta:
        verbose_name = "Archived Property"
        verbose_name_plural = "Archived Properties"
        ordering = ['-archived_at']
        indexes = [
            models.Index(fields=['original_id']),
            models.Index(fields=['archived_at']),
            models.Index(fields=['deleted_at']),
            models.Index(fields=['owner_info']),
        ]
    
    def __str__(self):
        return f"Archived: {self.title} (Original ID: {self.original_id})"
    
    @classmethod
    def archive_property(cls, property_obj):
        """
        Archive a property by copying its data to the archive table.
        This preserves data for legal/analytics purposes.
        """
        # Extract location coordinates if available
        location_lat = None
        location_lng = None
        if property_obj.location:
            location_lat = property_obj.location.y
            location_lng = property_obj.location.x
        
        # Get amenity names
        amenity_names = list(property_obj.amenities.values_list('name', flat=True))
        
        # Get owner information
        owner_info = {
            'id': property_obj.owner.id,
            'email': property_obj.owner.email,
            'name': property_obj.owner.full_name or property_obj.owner.email,
            'phone': getattr(property_obj.owner, 'mobile_number', None),
        }
        
        # Create archive entry
        archive = cls.objects.create(
            original_id=property_obj.id,
            title=property_obj.title,
            description=property_obj.description,
            property_type_name=property_obj.property_type.name if property_obj.property_type else '',
            purpose_name=property_obj.purpose.name if property_obj.purpose else '',
            furnishing_status_name=property_obj.furnishing_status.name if property_obj.furnishing_status else None,
            completion_status_name=property_obj.completion_status.name if property_obj.completion_status else '',
            occupant_type_name=property_obj.occupant_type.name if property_obj.occupant_type else None,
            address=property_obj.address,
            building_name=property_obj.building_name,
            floor_number=property_obj.floor_number,
            unit_number=property_obj.unit_number,
            place=property_obj.place,
            location_latitude=location_lat,
            location_longitude=location_lng,
            nationality=property_obj.nationality,
            bedrooms=property_obj.bedrooms,
            bathrooms=property_obj.bathrooms,
            area_sqm=property_obj.area_sqm,
            occupants_count=property_obj.occupants_count,
            price=property_obj.price,
            currency=property_obj.currency,
            price_per_sqft=property_obj.price_per_sqft,
            rent_period=property_obj.rent_period,
            handover_date=property_obj.handover_date,
            developer_name=property_obj.developer_name,
            project_name=property_obj.project_name,
            amenities=amenity_names,
            main_image_url=property_obj.main_image.url if property_obj.main_image else None,
            social_media=property_obj.social_media or {},
            owner_info=owner_info,
            is_approved=property_obj.is_approved,
            is_active=property_obj.is_active,
            listing_status=property_obj.listing_status,
            rejection_note=property_obj.rejection_note,
            views_count=property_obj.views_count,
            created_at=property_obj.created_at,
            updated_at=property_obj.updated_at,
            deleted_at=property_obj.deleted_at or property_obj.updated_at,
        )
        
        return archive
