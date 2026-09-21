from rest_framework import serializers
from apps.real_estate.models import PropertyType
from .asset_type import AssetTypeListSerializer


class PropertyTypeListSerializer(serializers.ModelSerializer):
    asset_type = AssetTypeListSerializer(read_only=True)
    asset_type_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = PropertyType
        fields = (
            "id",
            "name",
            "occupant_count",
            "slug",
            "asset_type",
            "asset_type_id",
            "description",
        )
        read_only_fields = ("id", "slug", "asset_type")


class PropertyTypeDetailSerializer(serializers.ModelSerializer):
    asset_type = AssetTypeListSerializer(read_only=True)
    asset_type_id = serializers.IntegerField(write_only=True, required=False)
    properties_count = serializers.SerializerMethodField()

    class Meta:
        model = PropertyType
        fields = (
            "id",
            "name",
            "occupant_count",
            "slug",
            "asset_type",
            "asset_type_id",
            "description",
            "properties_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "slug", "asset_type", "properties_count", "created_at", "updated_at")

    def get_properties_count(self, obj):
        return obj.properties.count()


class PropertyTypeCreateSerializer(serializers.ModelSerializer):
    asset_type_id = serializers.IntegerField()

    class Meta:
        model = PropertyType
        fields = (
            "id",
            "name",
            "occupant_count",
            "slug",
            "asset_type_id",
            "description",
        )
        read_only_fields = ("id", "slug")

