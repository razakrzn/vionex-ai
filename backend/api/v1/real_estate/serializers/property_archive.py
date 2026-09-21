from rest_framework import serializers

from apps.real_estate.models import PropertyArchive


class PropertyArchiveListSerializer(serializers.ModelSerializer):
    """
    Lightweight representation for listing archived properties.
    """

    class Meta:
        model = PropertyArchive
        fields = (
            "id",
            "original_id",
            "title",
            "property_type_name",
            "purpose_name",
            "place",
            "price",
            "currency",
            "listing_status",
            "owner_info",
            "deleted_at",
            "archived_at",
        )
        read_only_fields = fields


class PropertyArchiveDetailSerializer(serializers.ModelSerializer):
    """
    Full representation for archived property detail.
    """

    class Meta:
        model = PropertyArchive
        fields = "__all__"
        read_only_fields = fields

