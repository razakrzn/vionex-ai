from rest_framework import serializers
from apps.users.models import Role
from django.contrib.auth.models import Permission


class PermissionSerializer(serializers.ModelSerializer):
    """
    Serializer for Django's built-in Permission model.
    """
    content_type_name = serializers.CharField(source='content_type.name', read_only=True)
    app_label = serializers.CharField(source='content_type.app_label', read_only=True)
    
    class Meta:
        model = Permission
        fields = ('id', 'name', 'codename', 'content_type', 'content_type_name', 'app_label')
        read_only_fields = ('id', 'name', 'codename', 'content_type', 'content_type_name', 'app_label')


class RoleSerializer(serializers.ModelSerializer):
    """
    Serializer for Role model (list view).
    """
    permissions_count = serializers.SerializerMethodField()
    users_count = serializers.SerializerMethodField()
    created_by_email = serializers.SerializerMethodField()
    
    class Meta:
        model = Role
        fields = (
            'id',
            'name',
            'description',
            'is_active',
            'permissions_count',
            'users_count',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_email',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'created_by', 'created_by_email')
    
    def get_permissions_count(self, obj):
        """Get the number of permissions for this role"""
        return obj.permissions.count() if hasattr(obj, 'permissions') else 0
    
    def get_users_count(self, obj):
        """Get the number of users with this role"""
        return obj.users.count() if hasattr(obj, 'users') else 0
    
    def get_created_by_email(self, obj):
        """Get the email of the user who created this role"""
        return obj.created_by.email if obj.created_by else None


class RoleOptionSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for populating dropdowns/selects.
    """

    class Meta:
        model = Role
        fields = ("id", "name")
        read_only_fields = ("id", "name")


class RoleDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for Role model (detail view with permissions).
    """
    permissions = PermissionSerializer(many=True, read_only=True)
    permissions_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Permission.objects.all(),
        source='permissions',
        write_only=True,
        required=False
    )
    users_count = serializers.IntegerField(source='users.count', read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    
    class Meta:
        model = Role
        fields = (
            'id',
            'name',
            'description',
            'is_active',
            'permissions',
            'permissions_ids',
            'users_count',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_email',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'created_by', 'created_by_email')
    
    def create(self, validated_data):
        """Create role and assign permissions"""
        permissions = validated_data.pop('permissions', [])
        role = Role.objects.create(**validated_data)
        if permissions:
            role.permissions.set(permissions)
        return role
    
    def update(self, instance, validated_data):
        """Update role and permissions"""
        permissions = validated_data.pop('permissions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if permissions is not None:
            instance.permissions.set(permissions)
        return instance


class RoleCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a Role.
    """
    permissions_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Permission.objects.all(),
        source='permissions',
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Role
        fields = ('name', 'description', 'is_active', 'permissions_ids')
    
    def create(self, validated_data):
        """Create role and assign permissions"""
        permissions = validated_data.pop('permissions', [])
        # Set created_by to the current user
        validated_data['created_by'] = self.context['request'].user
        role = Role.objects.create(**validated_data)
        if permissions:
            role.permissions.set(permissions)
        return role

