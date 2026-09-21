from django.db import models


class Country(models.Model):
    """
    Country model - Primary location entity stored in database.
    
    Countries are managed by admins and can be populated from Google Places API.
    Users select a country during registration, and states/cities are fetched
    dynamically from Google Places API (not stored in database).
    
    Industry Standard Approach:
    - Countries: Stored in DB (curated list)
    - States/Emirates: Fetched dynamically from Google Places API
    - Cities: Fetched dynamically from Google Places API
    
    Examples:
        - name: "United Arab Emirates", code: "AE", phone_code: "+971"
        - name: "India", code: "IN", phone_code: "+91"
        - name: "Saudi Arabia", code: "SA", phone_code: "+966"
    """
    name = models.CharField(max_length=100)       # e.g., United Arab Emirates, India, Saudi Arabia
    code = models.CharField(
        max_length=5,
        unique=True,
        help_text="ISO 3166-1 alpha-2 country code (e.g., AE, IN, SA)"
    )
    phone_code = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="International phone code (e.g., +971, +91, +966)"
    )
    currency = models.CharField(
        max_length=10,
        default='AED',
        help_text="Currency code (e.g., AED, INR, SAR)"
    )
    
    class Meta:
        verbose_name_plural = "Countries"
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
        ]
    
    def __str__(self):
        return self.name
