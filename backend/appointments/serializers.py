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
            "queue_number",
            "complaint",
            "notes",
            "referring_doctor",
            "created_at",
        ]

    def get_patient_name(self, obj):
        return str(obj.patient)

    def get_doctor_name(self, obj):
        if obj.doctor is None:
            return None
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
    gender = serializers.ChoiceField(choices=["erkak", "ayol"], required=False, allow_null=True, allow_blank=True)
    birth_year = serializers.IntegerField(required=False, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    complaint = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    doctor = serializers.IntegerField(required=False, allow_null=True)
    referring_doctor = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    service_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    service_options = ServiceOptionInputSerializer(many=True, required=False)

    def validate(self, attrs):
        return attrs

    def validate_service_ids(self, service_ids):
        if service_ids:
            services = Service.objects.filter(id__in=service_ids, is_active=True)
            if services.count() != len(service_ids):
                raise serializers.ValidationError("Ba'zi xizmatlar topilmadi yoki faol emas.")
        return service_ids

    def validate(self, attrs):
        service_ids = attrs.get("service_ids", [])
        
        service_options_data = attrs.get("service_options", [])
        if service_options_data:
            service_options_map = {}
            service_ids_from_options = []
            for item in service_options_data:
                service_id = item.get("service_id")
                option_ids = item.get("option_ids", [])
                if service_id:
                    service_ids_from_options.append(service_id)
                if service_id and option_ids:
                    options = ServiceOption.objects.filter(id__in=option_ids, is_active=True)
                    service_options_map[service_id] = list(options)
            attrs["service_options_map"] = service_options_map
            if service_ids_from_options:
                service_ids = list(set(service_ids + service_ids_from_options))
        
        if service_ids:
            services = Service.objects.filter(id__in=service_ids, is_active=True)
            attrs["services"] = services
        
        return attrs


class ExistingPatientAppointmentSerializer(serializers.Serializer):
    patient = serializers.IntegerField()
    doctor = serializers.IntegerField(required=False, allow_null=True)
    referring_doctor = serializers.CharField(required=False, allow_blank=True)
    service_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    service_options = ServiceOptionInputSerializer(many=True, required=False)
    complaint = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        patient_id = attrs.get("patient")
        from patients.models import Patient
        try:
            patient = Patient.objects.get(id=patient_id)
            attrs["patient_obj"] = patient
        except Patient.DoesNotExist:
            raise serializers.ValidationError("Bemor topilmadi.")
        
        service_ids = attrs.get("service_ids", [])
        if service_ids:
            services = Service.objects.filter(id__in=service_ids, is_active=True)
            if services.count() != len(service_ids):
                raise serializers.ValidationError("Ba'zi xizmatlar topilmadi yoki faol emas.")
            attrs["services"] = services
        
        service_options_data = attrs.get("service_options", [])
        if service_options_data:
            service_options_map = {}
            for item in service_options_data:
                service_id = item.get("service_id")
                option_ids = item.get("option_ids", [])
                if service_id and option_ids:
                    options = ServiceOption.objects.filter(id__in=option_ids, is_active=True)
                    service_options_map[service_id] = list(options)
            attrs["service_options_map"] = service_options_map
        
        return attrs


class ServiceQueueTicketSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    service_name = serializers.CharField(source="service.name", read_only=True)
    referring_doctor = serializers.SerializerMethodField()

    def get_referring_doctor(self, obj):
        if obj.appointment and obj.appointment.referring_doctor:
            return obj.appointment.referring_doctor
        return None

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
            "referring_doctor",
        ]

    def get_patient_name(self, obj):
        return str(obj.patient)


class ReferringDoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferringDoctor
        fields = ["id", "full_name", "phone", "clinic_name", "is_active"]