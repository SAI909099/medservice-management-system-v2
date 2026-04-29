from rest_framework import serializers
from django.utils import timezone

from billing.models import Service, ServiceOption
from doctors.models import Doctor

from .models import Appointment, ReferringDoctor, ServiceQueueTicket
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
            "referring_doctor",
            "created_at",
        ]

    def get_patient_name(self, obj):
        return str(obj.patient)

    def get_doctor_name(self, obj):
        return obj.doctor.user.get_full_name() or obj.doctor.user.username


class ServiceOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceOption
        fields = ["id", "name", "price", "is_active"]


class ServiceOptionInputSerializer(serializers.Serializer):
    service_id = serializers.IntegerField()
    option_ids = serializers.ListField(child=serializers.IntegerField(), required=False)


class AppointmentRegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    gender = serializers.ChoiceField(choices=["erkak", "ayol"])
    birth_year = serializers.IntegerField(required=False, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    complaint = serializers.CharField(required=False, allow_blank=True)
    doctor = serializers.IntegerField(required=False, allow_null=True)
    referring_doctor = serializers.CharField(required=False, allow_blank=True)
    service_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    service_options = ServiceOptionInputSerializer(many=True, required=False)

    def validate(self, attrs):
        return attrs

    def validate_service_ids(self, service_ids):
        services = Service.objects.filter(id__in=service_ids, is_active=True)
        if services.count() != len(service_ids):
            raise serializers.ValidationError("Ba'zi xizmatlar topilmadi yoki faol emas.")
        attrs["services"] = services
        return service_ids


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


class ReferringDoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferringDoctor
        fields = ["id", "full_name", "phone", "clinic_name", "is_active"]