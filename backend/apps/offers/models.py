from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class Offer(models.Model):
    """
    Offer model for managing listing offers with pricing, validity, and cashback.
    """
    # Role for which this offer is applicable
    custom_role = models.ForeignKey(
        'users.Role',
        on_delete=models.PROTECT,
        related_name='offers',
        null=True,
        blank=True,
        help_text="Role for which this offer applies (e.g., owner, gym_owner, seeker)"
    )
    
    # Per Listing price
    price_per_listing = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Price per listing"
    )
    
    # Validity in months
    validity_months = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Validity period in months"
    )
    
    # Cashback amount
    cashback = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        default=Decimal('0.00'),
        help_text="Cashback amount"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Offer"
        verbose_name_plural = "Offers"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['custom_role']),
        ]
    
    def __str__(self):
        role_name = self.custom_role.name if self.custom_role else "Unknown"
        validity_str = f"{self.validity_months} months" if self.validity_months else "no validity"
        return f"Offer for {role_name} - {self.price_per_listing} per listing ({validity_str})"
