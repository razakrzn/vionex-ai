from rest_framework import serializers


class PermissionSerializer(serializers.Serializer):
    """Serializer for permission object"""
    can_view = serializers.BooleanField()
    can_create = serializers.BooleanField()
    can_update = serializers.BooleanField()
    can_delete = serializers.BooleanField()


class ChildModuleSerializer(serializers.Serializer):
    """Serializer for child modules"""
    id = serializers.CharField()
    label = serializers.CharField()
    path = serializers.CharField()
    order = serializers.IntegerField()


class ModuleSerializer(serializers.Serializer):
    """Serializer for admin dashboard modules"""
    id = serializers.CharField()
    name = serializers.CharField()
    label = serializers.CharField()
    icon = serializers.CharField(required=False, allow_null=True)
    path = serializers.CharField()
    order = serializers.IntegerField()
    is_active = serializers.BooleanField()
    children = serializers.ListField(
        child=ChildModuleSerializer(),
        required=False
    )


class ModulesResponseSerializer(serializers.Serializer):
    """Serializer for modules response - returns list directly"""
    pass  # We'll return the list directly in the view

