from rest_framework import serializers
from apps.real_estate.models import FurnishingStatus


class FurnishingStatusListSerializer(serializers.ModelSerializer):
    class Meta:
        model = FurnishingStatus
        fields = (
            "id",
            "name",
            "slug",
            "description",
        )
        read_only_fields = ("id", "slug")


class FurnishingStatusDetailSerializer(serializers.ModelSerializer):
    properties_count = serializers.SerializerMethodField()

    class Meta:
        model = FurnishingStatus
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "properties_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "slug", "properties_count", "created_at", "updated_at")

    def get_properties_count(self, obj):
        return obj.properties.count()


class FurnishingStatusCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FurnishingStatus
        fields = (
            "id",
            "name",
            "slug",
            "description",
        )
        read_only_fields = ("id", "slug")

