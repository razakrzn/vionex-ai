from rest_framework import serializers
from apps.dashboard.models import DashboardModule
from django.contrib.auth.models import Permission


class DashboardModuleSerializer(serializers.ModelSerializer):
    """
    Serializer for DashboardModule (list view).
    """
    permissions_list = serializers.SerializerMethodField()
    children_count = serializers.IntegerField(source='children.count', read_only=True)
    parent_id = serializers.CharField(source='parent.id', read_only=True, allow_null=True)
    parent_label = serializers.CharField(source='parent.label', read_only=True, allow_null=True)
    
    class Meta:
        model = DashboardModule
        fields = (
            'id',
            'name',
            'label',
            'icon',
            'path',
            'parent',
            'parent_id',
            'parent_label',
            'permissions',
            'permissions_list',
            'order',
            'is_active',
            'children_count',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'children_count', 'parent_id', 'parent_label')
    
    def get_permissions_list(self, obj):
        """Return list of permission strings"""
        return obj.get_permissions_list()


class DashboardModuleDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for DashboardModule (detail view with nested children).
    """
    permissions_list = serializers.SerializerMethodField()
    permissions_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Permission.objects.all(),
        source='permissions',
        write_only=True,
        required=False
    )
    children = DashboardModuleSerializer(many=True, read_only=True)
    parent_id = serializers.CharField(source='parent.id', read_only=True, allow_null=True)
    parent_label = serializers.CharField(source='parent.label', read_only=True, allow_null=True)
    
    class Meta:
        model = DashboardModule
        fields = (
            'id',
            'name',
            'label',
            'icon',
            'path',
            'parent',
            'parent_id',
            'parent_label',
            'permissions',
            'permissions_list',
            'permissions_ids',
            'order',
            'is_active',
            'children',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'parent_id', 'parent_label')
    
    def get_permissions_list(self, obj):
        """Return list of permission strings"""
        return obj.get_permissions_list()
    
    def validate_parent(self, value):
        """Prevent circular references"""
        if value and value.id == self.instance.id if self.instance else None:
            raise serializers.ValidationError("A module cannot be its own parent.")
        return value


class DashboardModuleCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating DashboardModule.
    """
    permissions_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Permission.objects.all(),
        source='permissions',
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = DashboardModule
        fields = (
            'id',
            'name',
            'label',
            'icon',
            'path',
            'parent',
            'permissions_ids',
            'order',
            'is_active',
        )
    
    def validate_parent(self, value):
        """Prevent circular references"""
        if value and hasattr(self, 'initial_data') and 'id' in self.initial_data:
            if value.id == self.initial_data['id']:
                raise serializers.ValidationError("A module cannot be its own parent.")
        return value
