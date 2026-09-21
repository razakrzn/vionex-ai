from rest_framework import serializers
from apps.countries.models import Country
from apps.countries.services import rest_countries_service


class CountryListSerializer(serializers.ModelSerializer):
    flag_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Country
        fields = (
            "id",
            "name",
            "code",
            "phone_code",
            "flag_image_url",
            "currency",
        )
        read_only_fields = ("id",)
    
    def get_flag_image_url(self, obj):
        """Get flag image URL from REST Countries API"""
        try:
            country_data = rest_countries_service.get_country_by_code(obj.code)
            if country_data and country_data.get('flag_image_url'):
                return country_data['flag_image_url']
        except Exception:
            pass
        
        return None


class CountryDetailSerializer(serializers.ModelSerializer):
    flag_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Country
        fields = (
            "id",
            "name",
            "code",
            "phone_code",
            "flag_image_url",
            "currency",
        )
        read_only_fields = ("id",)
    
    def get_flag_image_url(self, obj):
        """Get flag image URL from REST Countries API"""
        try:
            country_data = rest_countries_service.get_country_by_code(obj.code)
            if country_data and country_data.get('flag_image_url'):
                return country_data['flag_image_url']
        except Exception:
            pass
        
        return None


class CountryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = (
            "id",
            "name",
            "code",
            "phone_code",
            "currency",
        )
        read_only_fields = ("id",)

    def validate_code(self, value):
        if value:
            value = value.upper()
        return value

