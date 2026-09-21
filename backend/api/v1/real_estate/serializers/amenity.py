from rest_framework import serializers
from apps.real_estate.models import Amenity


class AmenityListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenity
        fields = (
            "id",
            "name",
            "slug",
            "icon",
            "description",
        )
        read_only_fields = ("id", "slug")


class AmenityDetailSerializer(serializers.ModelSerializer):
    properties_count = serializers.SerializerMethodField()

    class Meta:
        model = Amenity
        fields = (
            "id",
            "name",
            "slug",
            "icon",
            "description",
            "properties_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "slug", "properties_count", "created_at", "updated_at")

    def get_properties_count(self, obj):
        return obj.properties.count()


class AmenityCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenity
        fields = (
            "id",
            "name",
            "slug",
            "icon",
            "description",
        )
        read_only_fields = ("id", "slug")

