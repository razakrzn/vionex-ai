from django.db import models
from django.contrib.auth.models import Permission
from django.core.validators import MinValueValidator


class DashboardModule(models.Model):
    """
    Dynamic dashboard module model.
    Modules can have parent-child relationships to create nested menu structures.
    """
    id = models.CharField(max_length=100, primary_key=True, help_text="Unique identifier for the module (e.g., 'fitness', 'gyms')")
    name = models.CharField(max_length=100, help_text="Module name (e.g., 'fitness', 'gyms')")
    label = models.CharField(max_length=200, help_text="Display label (e.g., 'My Fitness', 'Gyms')")
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Icon name (e.g., 'dumbbell', 'home')")
    path = models.CharField(max_length=255, help_text="Frontend route path (e.g., '/admin/fitness')")
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        help_text="Parent module (null for top-level modules)"
    )
    permissions = models.ManyToManyField(
        Permission,
        related_name='modules',
        blank=True,
        help_text="Required permissions to access this module"
    )
    order = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Display order (lower numbers appear first)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this module is active and visible"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'Dashboard Module'
        verbose_name_plural = 'Dashboard Modules'
        indexes = [
            models.Index(fields=['parent', 'is_active']),
            models.Index(fields=['order']),
        ]

    def __str__(self):
        return f"{self.label} ({self.id})"

    def get_permissions_list(self):
        """Return a list of permission strings in format 'app_label.codename'"""
        return [
            f"{perm.content_type.app_label}.{perm.codename}"
            for perm in self.permissions.all()
        ]

    def to_dict(self, include_children=True):
        """
        Convert module to dictionary format for API response.
        Recursively includes children if include_children is True.
        """
        data = {
            "id": self.id,
            "name": self.name,
            "label": self.label,
            "icon": self.icon,
            "path": self.path,
            "permissions": self.get_permissions_list(),
        }
        
        if include_children:
            children = self.children.filter(is_active=True).order_by('order', 'name')
            if children.exists():
                data["children"] = [child.to_dict(include_children=True) for child in children]
        
        return data
