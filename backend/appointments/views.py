from rest_framework import decorators, response, viewsets
from django.utils.dateparse import parse_date
from django.utils import timezone

from accounts.models import Role, User
from accounts.permissions import PageAccessPermission, RoleBasedPermission
from billing.models import Service
from doctors.models import Doctor

from .services import register_patient_appointment_with_charges
from .models import Appointment, ServiceQueueTicket
from .serializers import AppointmentRegisterSerializer, AppointmentSerializer, ServiceQueueTicketSerializer


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.select_related("patient", "doctor__user", "created_by").all()
    serializer_class = AppointmentSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "appointments"
    allowed_roles = ["admin", "registrator", "doctor"]
    filterset_fields = ["doctor", "patient", "status"]
    search_fields = ["patient__first_name", "patient__last_name", "doctor__user__last_name"]
    ordering_fields = ["scheduled_at", "created_at"]

    def perform_create(self, serializer):
        scheduled_at = serializer.validated_data.get("scheduled_at") or timezone.now()
        serializer.save(created_by=self.request.user, scheduled_at=scheduled_at)

    @decorators.action(detail=False, methods=["get"], url_path="staff-options")
    def staff_options(self, request):
        doctors = Doctor.objects.select_related("user").filter(is_active=True)
        services = Service.objects.filter(is_active=True).order_by("name")
        lab_staff = User.objects.select_related("role").filter(role__name=Role.Name.LAB_STAFF, is_active=True)

        doctors_data = [
            {
                "id": doctor.id,
                "full_name": doctor.user.get_full_name() or doctor.user.username,
                "specialty": doctor.specialty,
                "appointment_price": doctor.appointment_price,
                "clinic_id": doctor.clinic_id,
            }
            for doctor in doctors
        ]
        lab_staff_data = [
            {
                "id": user.id,
                "full_name": user.get_full_name() or user.username,
            }
            for user in lab_staff
        ]
        services_data = [
            {
                "id": service.id,
                "name": service.name,
                "category": service.category,
                "price": service.price,
            }
            for service in services
        ]
        return response.Response({"doctors": doctors_data, "lab_staff": lab_staff_data, "services": services_data})

    @decorators.action(detail=False, methods=["post"], url_path="register")
    def register(self, request):
        serializer = AppointmentRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        try:
            result = register_patient_appointment_with_charges(
                user=request.user,
                first_name=payload["first_name"],
                last_name=payload["last_name"],
                gender=payload["gender"],
                birth_year=payload.get("birth_year"),
                phone=payload["phone"],
                address=payload.get("address", ""),
                complaint=payload.get("complaint", ""),
                doctor=payload.get("doctor"),
                services=payload.get("services", []),
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=400)
        return response.Response(result, status=201)

    @decorators.action(detail=False, methods=["get"], url_path="service-queue")
    def service_queue(self, request):
        date_raw = request.query_params.get("date")
        queue_date = parse_date(date_raw) if date_raw else None
        if queue_date is None:
            queue_date = timezone.localdate()

        queryset = ServiceQueueTicket.objects.select_related("patient", "service", "appointment").filter(queue_date=queue_date)

        service_id = request.query_params.get("service_id")
        if service_id:
            queryset = queryset.filter(service_id=service_id)

        status_value = request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(status=status_value)

        queryset = queryset.order_by("service__name", "sequence_number", "created_at")
        page = self.paginate_queryset(queryset)
        serializer = ServiceQueueTicketSerializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return response.Response({"results": serializer.data})
