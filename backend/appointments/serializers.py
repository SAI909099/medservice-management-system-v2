from rest_framework import serializers

from .models import Appointment
from .services import validate_appointment_datetime


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField(read_only=True)
    patient_gender = serializers.CharField(source="patient.gender", read_only=True)
    patient_date_of_birth = serializers.DateField(source="patient.date_of_birth", read_only=True)
    doctor_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient",
            "patient_name",
            "patient_gender",
            "patient_date_of_birth",
            "doctor",
            "doctor_name",
            "scheduled_at",
            "status",
            "complaint",
            "notes",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]
        extra_kwargs = {
            "scheduled_at": {"required": False},
        }

    def validate_scheduled_at(self, value):
        validate_appointment_datetime(value)
        return value

    def get_patient_name(self, obj):
        return str(obj.patient)

    def get_doctor_name(self, obj):
        return str(obj.doctor)
