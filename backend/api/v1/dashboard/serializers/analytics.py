from rest_framework import serializers
from apps.analytics.models import UserVisit


class UserVisitSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = UserVisit
        fields = (
            'id',
            'user',
            'user_email',
            'user_full_name',
            'ip_address',
            'user_agent',
            'device',
            'city',
            'country',
            'latitude',
            'longitude',
            'timestamp',
        )
