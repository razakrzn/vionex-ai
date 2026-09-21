from rest_framework import serializers
from apps.fitness.models import GymType


class GymTypeListSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymType
        fields = (
            "id",
            "name",
            "slug",
            "icon",
            "description",
        )
        read_only_fields = ("id", "slug")


class GymTypeDetailSerializer(serializers.ModelSerializer):
    gyms_count = serializers.SerializerMethodField()

    class Meta:
        model = GymType
        fields = (
            "id",
            "name",
            "slug",
            "icon",
            "description",
            "gyms_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "slug", "gyms_count", "created_at", "updated_at")

    def get_gyms_count(self, obj):
        return obj.gyms.count()


class GymTypeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymType
        fields = (
            "id",
            "name",
            "slug",
            "icon",
            "description",
        )
        read_only_fields = ("id", "slug")
