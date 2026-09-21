from rest_framework import serializers
from apps.real_estate.models import OccupantType


class OccupantTypeListSerializer(serializers.ModelSerializer):
    class Meta:
        model = OccupantType
        fields = ('id', 'name', 'slug', 'description')
        read_only_fields = ('id', 'slug')


class OccupantTypeDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = OccupantType
        fields = ('id', 'name', 'slug', 'description', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class OccupantTypeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OccupantType
        fields = ('id', 'name', 'slug', 'description')
        read_only_fields = ('id',)

