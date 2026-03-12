from django.utils import timezone
from rest_framework import serializers

from .models import LabReferral, LabService


class LabServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabService
        fields = "__all__"


class LabReferralSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabReferral
        fields = "__all__"

    def validate(self, attrs):
        status = attrs.get("status")
        result_text = attrs.get("result_text")
        if status == LabReferral.Status.COMPLETED and not result_text:
            raise serializers.ValidationError("Result text is required when referral is completed.")
        return attrs

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        if instance.status == LabReferral.Status.COMPLETED and not instance.result_at:
            instance.result_at = timezone.now()
            instance.save(update_fields=["result_at"])
        return instance
