from rest_framework import decorators, response, viewsets
from django.utils import timezone

from accounts.models import Role, User
from accounts.permissions import PageAccessPermission, RoleBasedPermission
from doctors.models import Doctor

from .models import Appointment
from .serializers import AppointmentSerializer


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
        return response.Response({"doctors": doctors_data, "lab_staff": lab_staff_data})
