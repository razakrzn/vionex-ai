from rest_framework import serializers
from apps.real_estate.models import AssetType


class AssetTypeListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetType
        fields = (
            "id",
            "name",
            "slug",
            "description",
        )
        read_only_fields = ("id", "slug")


class AssetTypeDetailSerializer(serializers.ModelSerializer):
    property_types_count = serializers.SerializerMethodField()

    class Meta:
        model = AssetType
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "property_types_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "slug", "property_types_count", "created_at", "updated_at")

    def get_property_types_count(self, obj):
        return obj.property_types.count()


class AssetTypeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetType
        fields = (
            "id",
            "name",
            "slug",
            "description",
        )
        read_only_fields = ("id", "slug")

