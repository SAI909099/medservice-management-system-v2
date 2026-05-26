from rest_framework import decorators, response, viewsets
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import permissions

from accounts.models import Role, User
from accounts.permissions import PageAccessPermission, RoleBasedPermission
from billing.models import Service
from doctors.models import Doctor

from .services import register_patient_appointment_with_charges, create_appointment_for_existing_patient
from .models import Appointment, ServiceQueueTicket, ReferringDoctor
from .serializers import (
    AppointmentRegisterSerializer,
    AppointmentSerializer,
    ReferringDoctorSerializer,
    ServiceQueueTicketSerializer,
    ExistingPatientAppointmentSerializer,
)


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
        services = Service.objects.prefetch_related("options").filter(is_active=True).order_by("name")
        lab_staff = User.objects.select_related("role").filter(role__name="lab_staff", is_active=True)

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
                "has_options": service.has_options,
                "options": [
                    {"id": opt.id, "name": opt.name, "price": str(opt.price), "is_active": opt.is_active}
                    for opt in service.options.all()
                ] if service.has_options else [],
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
                gender=payload.get("gender"),
                birth_year=payload.get("birth_year"),
                phone=payload.get("phone"),
                address=payload.get("address"),
                complaint=payload.get("complaint"),
                doctor=payload.get("doctor"),
                services=payload.get("services", []),
                service_options_map=payload.get("service_options_map", {}),
                referring_doctor=payload.get("referring_doctor") or "",
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=400)
        return response.Response(result, status=201)

    @decorators.action(detail=False, methods=["post"], url_path="create-for-patient")
    def create_for_patient(self, request):
        serializer = ExistingPatientAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        try:
            result = create_appointment_for_existing_patient(
                user=request.user,
                patient=payload["patient_obj"],
                doctor=payload.get("doctor"),
                services=payload.get("services", []),
                service_options_map=payload.get("service_options_map", {}),
                complaint=payload.get("complaint", ""),
                referring_doctor=payload.get("referring_doctor", ""),
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=400)
        return response.Response(result, status=201)

    @decorators.action(detail=False, methods=["patch"], url_path="update-ticket-status")
    def update_ticket_status(self, request):
        ticket_id = request.data.get("ticket_id")
        if not ticket_id:
            return response.Response({"detail": "ticket_id talab qilinadi."}, status=400)
        try:
            ticket = ServiceQueueTicket.objects.get(id=ticket_id)
        except ServiceQueueTicket.DoesNotExist:
            return response.Response({"detail": "Ticket topilmadi."}, status=404)
        new_status = request.data.get("status")
        if new_status not in ["waiting", "completed", "cancelled"]:
            return response.Response({"detail": "Noto'g'ri holat."}, status=400)
        ticket.status = new_status
        ticket.save(update_fields=["status"])
        return response.Response({"id": ticket.id, "status": ticket.status})

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

    @decorators.action(detail=False, methods=["get"], url_path="mrt-queue")
    def mrt_queue(self, request):
        from billing.models import Charge, ChargeItem, ServiceOption

        date_raw = request.query_params.get("date")
        queue_date = parse_date(date_raw) if date_raw else None
        if queue_date is None:
            queue_date = timezone.localdate()

        requested_service_id = request.query_params.get("service_id")
        
        if requested_service_id:
            services_with_options = Service.objects.filter(id=requested_service_id, has_options=True, is_active=True)
        else:
            services_with_options = Service.objects.filter(has_options=True, is_active=True)
            
        service_ids = list(services_with_options.values_list("id", flat=True))

        if not service_ids:
            return response.Response({"results": []})

        queryset = ServiceQueueTicket.objects.select_related(
            "patient", "service", "appointment"
        ).filter(
            queue_date=queue_date,
            service_id__in=service_ids
        ).order_by("service__name", "sequence_number", "created_at")

        results = []
        for ticket in queryset:
            charge = Charge.objects.filter(
                patient=ticket.patient,
                appointment=ticket.appointment,
            ).first()

            items = list(charge.items.all()) if charge else []
            body_parts = [item.description for item in items]

            referring = ticket.appointment.referring_doctor if ticket.appointment else ""
            
            results.append({
                "id": ticket.id,
                "queue_code": ticket.queue_code,
                "service_name": ticket.service.name,
                "service_id": ticket.service_id,
                "patient_id": ticket.patient.id,
                "patient_name": f"{ticket.patient.first_name} {ticket.patient.last_name}".strip(),
                "patient_phone": ticket.patient.phone,
                "patient_dob": ticket.patient.date_of_birth.isoformat() if ticket.patient.date_of_birth else None,
                "patient_gender": ticket.patient.gender,
                "body_parts": body_parts,
                "referring_doctor": referring or "",
                "status": ticket.status,
                "queue_date": ticket.queue_date.isoformat(),
                "charge_id": charge.id if charge else None,
                "charge_status": charge.status if charge else None,
                "total_amount": str(charge.total_amount) if charge else "0",
                "paid_amount": str(charge.paid_amount) if charge else "0",
                "created_at": ticket.created_at.isoformat(),
            })

        return response.Response({"results": results})


class ReferringDoctorViewSet(viewsets.ModelViewSet):
    queryset = ReferringDoctor.objects.filter(is_active=True)
    serializer_class = ReferringDoctorSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["full_name", "clinic_name"]

    def get_queryset(self):
        try:
            return super().get_queryset()
        except Exception:
            return ReferringDoctor.objects.none()
