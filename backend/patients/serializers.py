from rest_framework import serializers

from appointments.models import Appointment

from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id",
            "first_name",
            "last_name",
            "middle_name",
            "full_name",
            "date_of_birth",
            "age",
            "gender",
            "phone",
            "address",
            "passport_id",
            "notes",
            "clinic",
            "branch",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]
        extra_kwargs = {
            "clinic": {"required": False},
            "branch": {"required": False},
        }

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class PatientVisitHistorySerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.user.get_full_name", read_only=True)

    class Meta:
        model = Appointment
        fields = ["id", "scheduled_at", "status", "doctor_name", "notes"]
