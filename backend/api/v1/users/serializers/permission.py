from rest_framework import serializers
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType


class PermissionListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing permissions with additional context.
    """
    content_type_name = serializers.CharField(source='content_type.name', read_only=True)
    app_label = serializers.CharField(source='content_type.app_label', read_only=True)
    model_name = serializers.CharField(source='content_type.model', read_only=True)
    
    class Meta:
        model = Permission
        fields = ('id', 'name', 'codename', 'content_type', 'content_type_name', 'app_label', 'model_name')
        read_only_fields = ('id', 'name', 'codename', 'content_type', 'content_type_name', 'app_label', 'model_name')


class ContentTypeSerializer(serializers.ModelSerializer):
    """
    Serializer for ContentType model (used for grouping permissions).
    """
    permissions_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ContentType
        fields = ('id', 'app_label', 'model', 'name', 'permissions_count')
        read_only_fields = ('id', 'app_label', 'model', 'name', 'permissions_count')
    
    def get_permissions_count(self, obj):
        """Get the number of permissions for this content type"""
        return obj.permission_set.count()

