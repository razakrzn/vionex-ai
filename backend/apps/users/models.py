from django.contrib.auth.models import AbstractUser, BaseUserManager, Permission
from django.db import models
from django.conf import settings
from django.utils.text import slugify
import secrets
import string


class Role(models.Model):
    """
    Custom Role model that can be created by admins.
    Roles have many-to-many relationship with Django's built-in Permission model.
    """
    code = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        help_text="Stable role code (e.g., owner, seeker, gym_owner, admin, property_manager)",
    )
    name = models.CharField(max_length=100, unique=True, help_text="Role name (e.g., 'Property Manager', 'Sales Agent')")
    description = models.TextField(blank=True, null=True, help_text="Description of the role and its responsibilities")
    permissions = models.ManyToManyField(
        Permission,
        related_name='roles',
        blank=True,
        help_text="Permissions assigned to this role"
    )
    is_active = models.BooleanField(default=True, help_text="Whether this role is active and can be assigned")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_roles',
        help_text="Admin who created this role"
    )

    class Meta:
        ordering = ['name']
        verbose_name = 'Role'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def save(self, *args, **kwargs):
        # Auto-generate code from name if missing
        if not self.code and self.name:
            base = slugify(self.name).replace("-", "_")
            candidate = base or "role"
            i = 2
            while Role.objects.filter(code=candidate).exclude(pk=self.pk).exists():
                candidate = f"{base}_{i}" if base else f"role_{i}"
                i += 1
            self.code = candidate
        super().save(*args, **kwargs)

    def get_permissions_list(self):
        """Return a list of permission codenames for this role"""
        return list(self.permissions.values_list('codename', flat=True))


def get_or_create_system_role(role_code: str) -> Role:
    """
    Return a system/default Role for a given role code.

    This is the single place where we:
    - Ensure the Role row exists for built-in role codes (owner, seeker, gym_owner, admin, ...)
    - Attach default permissions for built-in roles when the Role is first created
    """
    code = (role_code or "seeker").strip() or "seeker"
    role, created = Role.objects.get_or_create(
        code=code,
        defaults={
            "name": code.replace("_", " ").lower(),
            "description": f"Default role for {code}",
            "is_active": True,
        },
    )

    # If the role was just created, attach default permissions for known built-in roles.
    # Note: `create_default_roles` command also seeds these, but this keeps runtime behavior safe.
    if created:
        if code == "gym_owner":
            fitness_perms = Permission.objects.filter(
                content_type__app_label="fitness",
                codename__in=["view_gym", "add_gym", "change_gym", "delete_gym"],
            )
            role.permissions.set(fitness_perms)
        elif code == "owner":
            real_estate_perms = Permission.objects.filter(
                content_type__app_label="real_estate",
                codename__in=["view_property", "add_property", "change_property", "delete_property"],
            )
            role.permissions.set(real_estate_perms)

    return role


class UserManager(BaseUserManager):
    """
    Custom user manager where email is the unique identifier
    instead of username.
    """
    
    def create_user(self, email, password=None, **extra_fields):
        """
        Create and save a regular user with the given email and password.
        """
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        
        # Set default verification_status based on role_code (skip for admins)
        if 'verification_status' not in extra_fields:
            role_code = extra_fields.get('role_code') or extra_fields.get('role') or 'seeker'
            if role_code in ['owner', 'gym_owner']:
                extra_fields['verification_status'] = self.model.VerificationStatus.PENDING
            elif role_code != 'admin':  # Skip verification_status for admins
                extra_fields['verification_status'] = self.model.VerificationStatus.APPROVED
        
        # Legacy compatibility: callers may still pass role='owner' etc.
        # We store role in custom_role only, and we must set it BEFORE the first save
        # (to avoid post_save signals or other hooks defaulting it to 'seeker').
        role_code = extra_fields.pop("role", None) or extra_fields.pop("role_code", None) or "seeker"
        role_obj = None
        try:
            role_obj = get_or_create_system_role(role_code)
        except Exception:
            # Don't block user creation if role assignment fails
            role_obj = None

        user = self.model(email=email, custom_role=role_obj, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and save a superuser with the given email and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role_code', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class SellerTypes(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"  # Regular person selling used items
        COMPANY = "COMPANY", "Real Estate Company"  # Big developers (e.g., Danube)
        AGENT = "AGENT", "Broker / Agent"  # Freelance Brokers
        ADVERTISER = 'ADVERTISER', 'Advertiser'  # Advertising Partners

    class VerificationStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    # Core identifiers
    username = None
    first_name = None
    last_name = None
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True, null=True)
    mobile_number = models.CharField(max_length=20, blank=True, null=True)
    whatsapp_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    country = models.ForeignKey(
        'countries.Country',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        help_text="User's country"
    )
    state = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="State/Emirate/Province name (e.g., Dubai, Abu Dhabi, Kerala)"
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="City name (e.g., Dubai Marina, Business Bay)"
    )

    # Seller-specific
    seller_type = models.CharField(
        max_length=20,
        choices=SellerTypes.choices,
        null=True,
        blank=True,
    )
    company_name = models.CharField(max_length=255, null=True, blank=True)
    website_url = models.URLField(max_length=500, null=True, blank=True, help_text="Website URL")
    license_number = models.CharField(max_length=100, null=True, blank=True)
    emirates_id_number = models.CharField(max_length=50, null=True, blank=True)
    document_uploads = models.FileField(
        upload_to="documents/", 
        blank=True, 
        null=True,
    )
    about_me = models.TextField(null=True, blank=True)
    is_mobile_verified = models.BooleanField(default=False)
    
    # Email verification fields
    is_email_verified = models.BooleanField(default=False, help_text="Whether the user's email has been verified")
    email_verified_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when email was verified")

    # Custom role assignment (for admin-created roles)
    custom_role = models.ForeignKey(
        'Role',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        help_text="Custom role assigned by admin (overrides default role permissions)"
    )
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.APPROVED  # Default to Approved (for Seekers), PENDING for Owners (set in UserManager)
    )
    rejection_note = models.TextField(
        blank=True,
        null=True,
        help_text="Note provided by admin when rejecting user verification"
    )
    is_suspended = models.BooleanField(
        default=False,
        help_text="Whether the user account is suspended by admin"
    )
    suspension_reason = models.TextField(
        blank=True,
        null=True,
        help_text="Reason for suspending the user account"
    )
    suspended_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the user account was suspended"
    )
    profile_picture = models.ImageField(
        upload_to="profile_pictures/", 
        blank=True, 
        null=True,
    )
    
    # Referral System
    referral_code = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        null=True,
        help_text="Unique referral code for this user to share with others"
    )
    referred_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referrals',
        help_text="User who referred this user (if any)"
    )



    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["mobile_number", "full_name"]
    
    objects = UserManager()

    @property
    def role_code(self):
        """
        Single source of truth for user role.
        Prefer custom_role.code.
        """
        return self.custom_role.code if self.custom_role_id else None

    @property
    def role_name(self):
        """
        Human-friendly role display name.
        Prefer custom_role.name.
        """
        return self.custom_role.name if self.custom_role_id else None

    def generate_referral_code(self):
        """Generate a unique referral code for the user"""
        if self.referral_code:
            return self.referral_code
        
        # Generate a random 8-character alphanumeric code
        alphabet = string.ascii_uppercase + string.digits
        while True:
            code = ''.join(secrets.choice(alphabet) for _ in range(8))
            if not User.objects.filter(referral_code=code).exists():
                return code
    
    def save(self, *args, **kwargs):
        # Ensure superusers always have admin role
        if self.is_superuser:
            admin_role = get_or_create_system_role('admin')
            if self.custom_role_id != admin_role.id:
                self.custom_role = admin_role
        
        # Track role change for existing users
        is_role_changing_to_owner = False
        old_role_code = None
        if self.pk:  # Existing user
            try:
                old_user = User.objects.get(pk=self.pk)
                old_role_code = old_user.role_code
                new_role_code = self.role_code
                
                # Check if role is changing from seeker to owner/gym_owner
                if (old_role_code == 'seeker' and 
                    new_role_code in ['owner', 'gym_owner']):
                    is_role_changing_to_owner = True
            except User.DoesNotExist:
                pass
        
        # Generate referral_code if not set
        if not self.referral_code:
            # For new users, always generate
            if not self.pk:
                self.referral_code = self.generate_referral_code()
            # For existing users changing to owner/gym_owner, generate code
            elif is_role_changing_to_owner:
                self.referral_code = self.generate_referral_code()
            # Also generate if already owner/gym_owner but somehow missing code
            elif self.pk and self.role_code in ['owner', 'gym_owner']:
                self.referral_code = self.generate_referral_code()
        
        # Set default verification_status for new owners and gym_owners
        # This handles cases where user is created directly (not through UserManager)
        if not self.pk and (self.role_code == 'owner' or self.role_code == 'gym_owner'):
            # Only set to PENDING if verification_status wasn't explicitly provided
            # We can detect this by checking if it's still at the field default
            if self.verification_status == self.VerificationStatus.APPROVED:
                self.verification_status = self.VerificationStatus.PENDING
        
        # Handle verification_status changes when role changes to owner/gym_owner
        if self.pk and is_role_changing_to_owner:
            if self.verification_status == self.VerificationStatus.APPROVED:
                self.verification_status = self.VerificationStatus.PENDING
        
        super().save(*args, **kwargs)

    @property
    def is_active(self):
        """
        Override is_active to always return True.
        We use verification_status instead of is_active for access control.
        The database column has been removed, so this is a property only.
        """
        return True
    
    @is_active.setter
    def is_active(self, value):
        """
        Ignore attempts to set is_active.
        We use verification_status for access control instead.
        """
        pass  # Do nothing - we don't use is_active anymore

    @property
    def is_approved(self):
        return self.verification_status == self.VerificationStatus.APPROVED

    @property
    def is_subscribed(self):
        """
        Check if user has an active subscription.
        Returns True if user has a subscription and it is active, False otherwise.
        """
        if hasattr(self, 'subscription'):
            return self.subscription.is_active
        return False

    def get_all_permissions(self):
        """
        Get all permissions for this user.
        Returns permissions from:
        1. Custom role (if assigned)
        2. Django's built-in user permissions
        3. Django's built-in group permissions
        """
        permissions = set()
        
        # Get permissions from custom role
        if self.custom_role and self.custom_role.is_active:
            permissions.update(self.custom_role.permissions.all())
        
        # Get Django's built-in user permissions
        permissions.update(self.user_permissions.all())
        
        # Get Django's built-in group permissions
        for group in self.groups.all():
            permissions.update(group.permissions.all())
        
        return permissions

    def has_perm(self, perm, obj=None):
        """
        Override Django's has_perm to include custom role permissions.
        """
        # Parse permission string first (e.g., 'app.permission' or 'permission')
        if '.' in perm:
            app_label, codename = perm.split('.', 1)
        else:
            codename = perm
            app_label = None
        
        # Check Django's built-in permissions first (user_permissions, group_permissions)
        if super().has_perm(perm, obj):
            return True
        
        # Check custom role permissions
        if self.custom_role and self.custom_role.is_active:
            # Build query for role permissions
            role_perms = self.custom_role.permissions.filter(codename=codename)
            if app_label:
                role_perms = role_perms.filter(content_type__app_label=app_label)
            
            if role_perms.exists():
                return True
        
        return False

    def has_perms(self, perm_list, obj=None):
        """
        Override Django's has_perms to include custom role permissions.
        """
        return all(self.has_perm(perm, obj) for perm in perm_list)

    def __str__(self):
        return self.email


class EmailVerificationOTP(models.Model):
    """
    Model to store email verification OTP codes.
    OTPs expire after 10 minutes and can be used only once.
    """
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='email_verification_otps'
    )
    code = models.CharField(max_length=6, help_text="6-digit verification code")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="OTP expiration timestamp")
    verified_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when OTP was verified")
    attempts = models.IntegerField(default=0, help_text="Number of failed verification attempts")
    ip_address = models.GenericIPAddressField(null=True, blank=True, help_text="IP address of the request")
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'code', 'expires_at']),
            models.Index(fields=['code', 'expires_at']),
        ]
        verbose_name = 'Email Verification OTP'
        verbose_name_plural = 'Email Verification OTPs'
    
    def is_valid(self):
        """Check if OTP is valid (not used, not expired, and within attempt limit)"""
        from django.utils import timezone
        return (
            not self.verified_at and 
            timezone.now() < self.expires_at and
            self.attempts < 5  # Max 5 failed attempts
        )
    
    def __str__(self):
        return f"OTP for {self.user.email} (expires: {self.expires_at})"


class PasswordResetToken(models.Model):
    """
    Model to store password reset tokens.
    Tokens expire after 30 minutes and can be used only once.
    """
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='password_reset_tokens'
    )
    token = models.CharField(max_length=255, unique=True, db_index=True, help_text="Unique reset token")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="Token expiration timestamp")
    used_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when token was used")
    ip_address = models.GenericIPAddressField(null=True, blank=True, help_text="IP address of the request")
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token', 'expires_at']),
            models.Index(fields=['user', 'expires_at']),
        ]
        verbose_name = 'Password Reset Token'
        verbose_name_plural = 'Password Reset Tokens'
    
    def is_valid(self):
        """Check if token is valid (not used and not expired)"""
        from django.utils import timezone
        return not self.used_at and timezone.now() < self.expires_at
    
    def __str__(self):
        return f"Reset token for {self.user.email} (expires: {self.expires_at})"
