from rest_framework import serializers

from .models import TreatmentArea, TreatmentReferral, TreatmentRoom
from .services import prepare_area_payload, prepare_room_payload


class TreatmentAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentArea
        fields = "__all__"

    def create(self, validated_data):
        user = self.context["request"].user
        payload = prepare_area_payload(user, validated_data)
        return super().create(payload)

    def update(self, instance, validated_data):
        user = self.context["request"].user
        if "clinic" not in validated_data and instance.clinic_id:
            validated_data["clinic"] = instance.clinic
        if "branch" not in validated_data and instance.branch_id:
            validated_data["branch"] = instance.branch
        payload = prepare_area_payload(user, validated_data)
        return super().update(instance, payload)


class TreatmentRoomSerializer(serializers.ModelSerializer):
    area_name = serializers.CharField(source="area.name", read_only=True)
    area_type = serializers.CharField(source="area.area_type", read_only=True)
    occupied_count = serializers.IntegerField(read_only=True)
    occupancy_status = serializers.SerializerMethodField()
    current_patients = serializers.SerializerMethodField()

    class Meta:
        model = TreatmentRoom
        fields = [
            "id",
            "clinic",
            "branch",
            "area",
            "area_name",
            "area_type",
            "name",
            "capacity",
            "daily_price",
            "is_active",
            "occupied_count",
            "occupancy_status",
            "current_patients",
        ]

    def create(self, validated_data):
        user = self.context["request"].user
        payload = prepare_room_payload(user, validated_data)
        return super().create(payload)

    def update(self, instance, validated_data):
        user = self.context["request"].user
        if "area" not in validated_data:
            validated_data["area"] = instance.area
        if "clinic" not in validated_data and instance.clinic_id:
            validated_data["clinic"] = instance.clinic
        if "branch" not in validated_data and instance.branch_id:
            validated_data["branch"] = instance.branch
        payload = prepare_room_payload(user, validated_data)
        return super().update(instance, payload)

    def get_occupancy_status(self, obj):
        occupied = int(getattr(obj, "occupied_count", 0) or 0)
        capacity = int(getattr(obj, "capacity", 0) or 0)
        if occupied <= 0:
            return "free"
        if capacity > 0 and occupied >= capacity:
            return "full"
        return "partial"

    def get_current_patients(self, obj):
        active_referrals = getattr(obj, "active_referrals", [])
        patients = []
        for referral in active_referrals:
            patient = getattr(referral, "patient", None)
            if patient is None:
                continue
            full_name = f"{patient.first_name} {patient.last_name}".strip()
            patients.append(
                {
                    "id": patient.id,
                    "first_name": patient.first_name,
                    "last_name": patient.last_name,
                    "full_name": full_name,
                }
            )
        return patients


class TreatmentReferralSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source="room.name", read_only=True)

    class Meta:
        model = TreatmentReferral
        fields = "__all__"
