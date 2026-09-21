from rest_framework import serializers
from apps.fitness.models import MembershipPackage


class MembershipPackageListSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for displaying membership packages in gym serializers.
    Packages are created/updated via the gym creation/update endpoints.
    """
    gym_name = serializers.CharField(source='gym.name', read_only=True)

    class Meta:
        model = MembershipPackage
        fields = (
            "id",
            "gym",
            "gym_name",
            "title",
            "price",
            "duration",
            "description",
            "created_at",
        )
        read_only_fields = ("id", "gym_name", "created_at")
