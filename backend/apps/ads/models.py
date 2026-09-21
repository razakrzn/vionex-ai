from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db.models.signals import pre_delete, pre_save
from django.dispatch import receiver


def validate_image_size(value):
    """Validate that image size is not larger than 10MB"""
    max_size = 10 * 1024 * 1024  # 10MB in bytes
    if value.size > max_size:
        raise ValidationError(
            f'Image file too large. Size should not exceed {max_size / (1024*1024):.1f}MB. '
            f'Got {value.size / (1024*1024):.1f}MB.'
        )


class Ad(models.Model):
    """
    Advertisement/Listing model for co-living spaces, properties, etc.
    """
    class VerificationStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    BILLING_CYCLE_CHOICES = [
        ('monthly', 'Monthly'),
        ('weekly', 'Weekly'),
        ('yearly', 'Yearly'),
        ('daily', 'Daily'),
    ]
    
    title = models.CharField(max_length=200, blank=True, null=True)
    brand_name = models.CharField(max_length=100, blank=True, null=True)
    logo = models.ImageField(
        upload_to='ads/logos/',
        blank=True,
        null=True,
        max_length=255,
        validators=[
            validate_image_size,
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])
        ]
    )
    location = models.CharField(max_length=200, blank=True, null=True, help_text="Location description, e.g., 'Downtown Dubai, UAE'")
    whatsapp_number = models.CharField(max_length=20, blank=True, null=True, help_text="WhatsApp number for contact")
    video_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="URL to the video for the ad"
    )
    image_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="URL to the image for the ad"
    )
    
    # Units information
    total_units = models.PositiveIntegerField(blank=True, null=True, default=None)
    available_units = models.PositiveIntegerField(blank=True, null=True, default=None)
    
    billing_cycle = models.CharField(
        max_length=20,
        choices=BILLING_CYCLE_CHOICES,
        blank=True,
        null=True,
        default=None
    )
    
    # Status fields
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING
    )
    
    # Timestamps
    published_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Date when the ad was approved and published"
    )
    created_date = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Ad"
        verbose_name_plural = "Ads"
        ordering = ['-created_date']
        indexes = [
            models.Index(fields=['verification_status']),
        ]
    
    def __str__(self):
        title = self.title or "Untitled"
        brand = self.brand_name or "Unknown Brand"
        return f"{title} - {brand}"
    
    def save(self, *args, **kwargs):
        # Set published_at when ad is verified for the first time
        if self.verification_status == self.VerificationStatus.APPROVED and not self.published_at:
            from django.utils import timezone
            self.published_at = timezone.now()
        elif self.verification_status != self.VerificationStatus.APPROVED:
            self.published_at = None
        super().save(*args, **kwargs)
    
    @property
    def is_verified(self):
        return self.verification_status == self.VerificationStatus.APPROVED


class AdGallery(models.Model):
    """
    Gallery images for an ad
    """
    ad = models.ForeignKey(
        Ad,
        related_name="gallery_images",
        on_delete=models.CASCADE
    )
    image = models.ImageField(
        upload_to="ads/gallery/",
        max_length=255,
        validators=[
            validate_image_size,
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Ad Gallery"
        verbose_name_plural = "Ad Galleries"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Gallery image for {self.ad.title}"



@receiver(pre_delete, sender=AdGallery)
def delete_gallery_image(sender, instance, **kwargs):
    """Delete image from storage when AdGallery instance is deleted"""
    if instance.image:
        try:
            instance.image.delete(save=False)
        except Exception as e:
            pass


@receiver(pre_save, sender=AdGallery)
def delete_old_gallery_image(sender, instance, **kwargs):
    """Delete old image from storage when updating AdGallery image"""
    if instance.pk:  # Only for updates, not new instances
        try:
            old_instance = AdGallery.objects.get(pk=instance.pk)
            if old_instance.image and instance.image != old_instance.image:
                old_instance.image.delete(save=False)
        except AdGallery.DoesNotExist:
            pass
        except Exception as e:
            pass


@receiver(pre_save, sender=Ad)
def delete_old_ad_logo(sender, instance, **kwargs):
    """Delete old logo from storage when updating Ad logo"""
    if instance.pk:  # Only for updates, not new instances
        try:
            old_instance = Ad.objects.get(pk=instance.pk)
            if old_instance.logo and instance.logo != old_instance.logo:
                old_instance.logo.delete(save=False)
        except Ad.DoesNotExist:
            pass
        except Exception as e:
            pass
