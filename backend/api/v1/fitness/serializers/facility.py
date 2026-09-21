from rest_framework import serializers
from apps.fitness.models import Facility


class FacilityListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Facility
        fields = (
            "id",
            "name",
            "icon",
            "description",
        )
        read_only_fields = ("id",)


class FacilityDetailSerializer(serializers.ModelSerializer):
    gyms_count = serializers.SerializerMethodField()

    class Meta:
        model = Facility
        fields = (
            "id",
            "name",
            "icon",
            "description",
            "gyms_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "gyms_count", "created_at", "updated_at")

    def get_gyms_count(self, obj):
        return obj.gyms.count()


class FacilityCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Facility
        fields = (
            "id",
            "name",
            "icon",
            "description",
        )
        read_only_fields = ("id",)
