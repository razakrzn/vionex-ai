from rest_framework import serializers
from apps.real_estate.models import Purpose


class PurposeListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Purpose
        fields = (
            "id",
            "name",
            "slug",
            "description",
        )
        read_only_fields = ("id", "slug")


class PurposeDetailSerializer(serializers.ModelSerializer):
    properties_count = serializers.SerializerMethodField()

    class Meta:
        model = Purpose
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


class PurposeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Purpose
        fields = (
            "id",
            "name",
            "slug",
            "description",
        )
        read_only_fields = ("id", "slug")

