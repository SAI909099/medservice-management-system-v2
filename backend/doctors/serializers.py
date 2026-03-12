from rest_framework import serializers

from .models import Doctor, DoctorSchedule


class DoctorScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorSchedule
        fields = "__all__"


class DoctorSerializer(serializers.ModelSerializer):
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = Doctor
        fields = [
            "id",
            "user",
            "user_full_name",
            "clinic",
            "branch",
            "specialty",
            "appointment_price",
            "license_number",
            "is_active",
        ]


class DoctorPricingSerializer(serializers.ModelSerializer):
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = Doctor
        fields = ["id", "user_full_name", "specialty", "appointment_price", "is_active"]
        read_only_fields = ["id", "user_full_name", "specialty", "is_active"]
