from django.db import models
from rest_framework import serializers
from decimal import Decimal


class WalletAdjustmentSerializer(serializers.Serializer):
    """Serializer for admin wallet adjustments."""
    class AdjustmentType(models.TextChoices):
        CREDIT = "credit", "Credit"
        DEBIT = "debit", "Debit"

    user_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    adjustment_type = serializers.ChoiceField(choices=AdjustmentType.choices)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
