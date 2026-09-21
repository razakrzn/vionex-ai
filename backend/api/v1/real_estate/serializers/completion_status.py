from rest_framework import serializers
from apps.real_estate.models import CompletionStatus


class CompletionStatusListSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompletionStatus
        fields = (
            "id",
            "name",
            "slug",
            "description",
        )
        read_only_fields = ("id", "slug")


class CompletionStatusDetailSerializer(serializers.ModelSerializer):
    properties_count = serializers.SerializerMethodField()

    class Meta:
        model = CompletionStatus
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


class CompletionStatusCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompletionStatus
        fields = (
            "id",
            "name",
            "slug",
            "description",
        )
        read_only_fields = ("id", "slug")

