from rest_framework import serializers
from django.utils import timezone

from billing.models import Service
from doctors.models import Doctor

from .models import Appointment, ServiceQueueTicket
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


class AppointmentRegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    gender = serializers.CharField(max_length=10)
    birth_year = serializers.IntegerField(required=False, allow_null=True)
    phone = serializers.CharField(max_length=20)
    address = serializers.CharField(required=False, allow_blank=True, max_length=255)
    complaint = serializers.CharField(required=False, allow_blank=True)
    doctor = serializers.PrimaryKeyRelatedField(
        queryset=Doctor.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    service_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        default=list,
    )

    def validate_birth_year(self, value):
        if value is None:
            return value
        current_year = timezone.localdate().year
        if value < 1900 or value > current_year:
            raise serializers.ValidationError("Tug'ilgan yil noto'g'ri.")
        return value

    def validate(self, attrs):
        service_ids = list(dict.fromkeys(attrs.get("service_ids", [])))
        attrs["services"] = []
        doctor = attrs.get("doctor")

        if not service_ids and doctor is None:
            raise serializers.ValidationError({"detail": "Shifokor yoki kamida bitta xizmat tanlanishi kerak."})

        if not service_ids:
            return attrs

        services = list(Service.objects.filter(id__in=service_ids, is_active=True).order_by("id"))
        if len(services) != len(service_ids):
            raise serializers.ValidationError({"service_ids": "Xizmatlardan biri topilmadi yoki nofaol."})
        attrs["service_ids"] = service_ids
        attrs["services"] = services
        return attrs


class ServiceQueueTicketSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = ServiceQueueTicket
        fields = [
            "id",
            "patient",
            "patient_name",
            "service",
            "service_name",
            "appointment",
            "queue_date",
            "sequence_number",
            "queue_code",
            "status",
            "created_at",
        ]

    def get_patient_name(self, obj):
        return str(obj.patient)
