from django.db import models
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db.models.signals import pre_delete, pre_save, post_save
from django.dispatch import receiver
from django.conf import settings
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


class GymType(models.Model):
    """
    Gym categories: Crossfit, Yoga Studio, Traditional Gym, Ladies Only, etc.
    """
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True, blank=True)
    icon = models.ImageField(
        upload_to='gym_icons/',
        blank=True,
        null=True,
        validators=[
            validate_image_size,
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])
        ]
    )
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Gym Type"
        verbose_name_plural = "Gym Types"
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Facility(models.Model):
    """
    Gym facilities/amenities: Sauna, Steam Room, Pool, Parking, WiFi, Personal Training, etc.
    """
    name = models.CharField(max_length=50, unique=True)
    icon = models.ImageField(
        upload_to='facility_icons/',
        blank=True,
        null=True,
        validators=[
            validate_image_size,
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])
        ]
    )
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Facility"
        verbose_name_plural = "Facilities"
        ordering = ['name']

    def __str__(self):
        return self.name


class Gym(models.Model):
    """
    Main Gym model
    """
    class GenderAllowed(models.TextChoices):
        MIXED = 'MIXED', 'Mixed / Unisex'
        MALE = 'MALE', 'Male Only'
        FEMALE = 'FEMALE', 'Female Only'

    # Owner
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='owned_gyms',
        on_delete=models.CASCADE
    )

    # Basic Information
    name = models.CharField(max_length=100)  # e.g., "Gold's Gym - Marina"
    gym_type = models.ForeignKey(
        GymType,
        related_name='gyms',
        on_delete=models.PROTECT
    )
    description = models.TextField()

    # Location
    address = models.CharField(max_length=255)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)

    # Details
    facilities = models.ManyToManyField(Facility, related_name='gyms', blank=True)

    # Timings
    opening_time = models.TimeField(blank=True, null=True)
    closing_time = models.TimeField(blank=True, null=True)
    is_24_hours = models.BooleanField(default=False)
    off_day = models.JSONField(
        default=list,
        blank=True,
        help_text="List of days when the gym is closed (e.g., ['Saturday', 'Sunday'])"
    )

    # Gender Rules
    gender_allowed = models.CharField(
        max_length=20,
        choices=GenderAllowed.choices,
        default=GenderAllowed.MIXED
    )

    # Social Media (Reuse the JSONField logic)
    social_media = models.JSONField(default=dict, blank=True)
    
    # Media
    main_image = models.ImageField(
        upload_to='gyms/main/',
        blank=True,
        null=True,
        validators=[
            validate_image_size,
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])
        ]
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether gym is active and visible. Set to True when admin approves the gym. Gym becomes inactive when expires_at is reached."
    )
    is_approved = models.BooleanField(
        default=False,
        help_text="Admin approval status - separate from subscription status"
    )
    rejection_note = models.TextField(
        blank=True,
        null=True,
        help_text="Note provided by admin when rejecting gym"
    )
    
    # Expiration
    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Gym expiration date. Set when admin approves the gym. Gym becomes inactive after this date."
    )
    approved_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Timestamp when gym was approved by admin. Used to calculate expiration."
    )

    # Metadata
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Gym"
        verbose_name_plural = "Gyms"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['gym_type']),
            models.Index(fields=['is_active', 'is_approved']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Handle expiration based on approval status
        if self.pk:  # Only for existing instances
            try:
                old_instance = Gym.objects.get(pk=self.pk)
                # If gym was just approved (was False, now True)
                if not old_instance.is_approved and self.is_approved:
                    # Set approved_at timestamp if not already set
                    from django.utils import timezone
                    if not self.approved_at:
                        self.approved_at = timezone.now()
                    
                    # Set expiration date using paid validity period
                    from django.conf import settings
                    from datetime import timedelta
                    
                    # Paid gym - use paid validity period
                    validity_days = getattr(settings, 'PAID_VALIDITY_DAYS', 90)
                    
                    # Only set expires_at if not already set (to avoid overwriting on subsequent saves)
                    if not self.expires_at:
                        self.expires_at = timezone.now() + timedelta(days=validity_days)
                    
                    # Set gym as active when approved (if expires_at is in the future)
                    if self.expires_at and self.expires_at > timezone.now():
                        self.is_active = True
            except Gym.DoesNotExist:
                pass  # New instance
        
        super().save(*args, **kwargs)


@receiver(post_save, sender=Gym)
def award_referral_reward_on_first_gym(sender, instance, created, **kwargs):
    """
    Award referral reward to referrer when a referred gym_owner creates their first gym.
    Only triggers for 'gym_owner' role users on first gym creation (not updates).
    Awards 10 points to the referrer.
    Seekers and admins do not trigger rewards.
    """
    # Only process on creation (not updates)
    if not created:
        return
    
    # Only process for gym_owner role users
    if instance.owner.role_code != 'gym_owner':
        return
    
    # Check if the gym owner has a referrer
    if not instance.owner.referred_by:
        return
    
    # Get the referrer
    referrer = instance.owner.referred_by
    
    # Skip if referrer is admin (admins don't get referral rewards)
    if referrer.role_code == 'admin':
        return
    
    try:
        # Check if this is the gym owner's first gym
        gym_count = Gym.objects.filter(owner=instance.owner).count()
        
        # Only award if this is the first gym (count should be exactly 1)
        if gym_count != 1:
            return
        
        # Check if reward was already given (prevent duplicate rewards)
        from apps.payments.models import Wallet, WalletTransaction
        
        existing_transaction = WalletTransaction.objects.filter(
            reference_type='apps.fitness.models.Gym',
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
            description=f"Credit: Referral reward - {instance.owner.email} (gym_owner) created first gym #{instance.pk}"
        )
        
    except Exception as e:
        # Log error but don't fail the gym save
        logger.error(f'Error awarding referral reward for gym {instance.pk}: {str(e)}')
        pass


class GymImage(models.Model):
    """
    Gallery images for a gym
    """
    gym = models.ForeignKey(
        Gym,
        related_name='gallery_images',
        on_delete=models.CASCADE
    )
    image = models.ImageField(
        upload_to='gyms/gallery/',
        validators=[
            validate_image_size,
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Gym Image"
        verbose_name_plural = "Gym Images"
        ordering = ['-created_at']

    def __str__(self):
        return f"Image for {self.gym.name}"


class MembershipPackage(models.Model):
    """
    Pricing Plans displayed on the Gym's profile
    e.g., "1 Month - 500 AED", "3 Months Membership"
    """
    gym = models.ForeignKey(
        Gym,
        related_name='packages',
        on_delete=models.CASCADE
    )
    title = models.CharField(max_length=100)  # e.g., "3 Months Membership"
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration = models.CharField(max_length=50, help_text="e.g., 'daily', 'weekly', 'monthly', '6 months', 'yearly'")
    description = models.TextField(blank=True, help_text="Includes Free PT Session, etc.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Membership Package"
        verbose_name_plural = "Membership Packages"
        ordering = ['duration']

    def __str__(self):
        return f"{self.gym.name} - {self.title}"



@receiver(pre_delete, sender=GymImage)
def delete_gym_image(sender, instance, **kwargs):
    """Delete image from storage when GymImage instance is deleted"""
    if instance.image:
        try:
            instance.image.delete(save=False)
        except Exception as e:
            logger.error(f'Error deleting gym image: {str(e)}')


@receiver(pre_save, sender=GymImage)
def delete_old_gym_image(sender, instance, **kwargs):
    """Delete old image from storage when updating GymImage image"""
    if instance.pk:  # Only for updates, not new instances
        try:
            old_instance = GymImage.objects.get(pk=instance.pk)
            if old_instance.image and instance.image != old_instance.image:
                old_instance.image.delete(save=False)
        except GymImage.DoesNotExist:
            pass
        except Exception as e:
            logger.error(f'Error deleting old gym image: {str(e)}')


@receiver(pre_save, sender=Gym)
def delete_old_gym_main_image(sender, instance, **kwargs):
    """Delete old main_image from storage when updating Gym main_image"""
    if instance.pk:  # Only for updates, not new instances
        try:
            old_instance = Gym.objects.get(pk=instance.pk)
            if old_instance.main_image and instance.main_image != old_instance.main_image:
                old_instance.main_image.delete(save=False)
        except Gym.DoesNotExist:
            pass
        except Exception as e:
            logger.error(f'Error deleting old gym main image: {str(e)}')


@receiver(pre_delete, sender=Gym)
def delete_gym_main_image_on_hard_delete(sender, instance, **kwargs):
    """Delete main_image from storage when a Gym is permanently deleted (e.g. owner deleted)."""
    if instance.main_image:
        try:
            instance.main_image.delete(save=False)
        except Exception as e:
            logger.error(f'Error deleting main image for gym {instance.id}: {str(e)}')
