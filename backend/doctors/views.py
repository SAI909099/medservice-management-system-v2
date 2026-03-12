from django.db.models import Q
from django.utils import timezone
from rest_framework import decorators, mixins, response, viewsets

from accounts.permissions import PageAccessPermission, RoleBasedPermission
from appointments.models import Appointment
from appointments.serializers import AppointmentSerializer

from .models import Doctor, DoctorSchedule
from .services import resolve_doctor_for_user
from .serializers import DoctorPricingSerializer, DoctorScheduleSerializer, DoctorSerializer


class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.select_related("user", "clinic", "branch").all()
    serializer_class = DoctorSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "doctors"
    allowed_roles = ["admin", "registrator", "doctor"]
    filterset_fields = ["clinic", "branch", "specialty", "is_active"]
    search_fields = ["user__first_name", "user__last_name", "specialty"]

    @decorators.action(detail=True, methods=["get"])
    def worklist(self, request, pk=None):
        queryset = Appointment.objects.filter(doctor_id=pk).select_related("patient")
        data = [
            {
                "appointment_id": item.id,
                "scheduled_at": item.scheduled_at,
                "patient": str(item.patient),
                "status": item.status,
                "complaint": item.complaint,
            }
            for item in queryset
        ]
        return response.Response(data)

    @decorators.action(detail=False, methods=["get"], url_path="my-worklist")
    def my_worklist(self, request):
        doctor = resolve_doctor_for_user(request.user)
        if doctor is None:
            return response.Response({"detail": "Doctor profile topilmadi."}, status=400)

        queryset = Appointment.objects.filter(doctor=doctor).select_related("patient")

        today_only = request.query_params.get("today", "1")
        if today_only == "1":
            queryset = queryset.filter(scheduled_at__date=timezone.localdate())

        status_value = request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(status=status_value)

        search_value = request.query_params.get("search")
        if search_value:
            queryset = queryset.filter(
                Q(patient__first_name__icontains=search_value)
                | Q(patient__last_name__icontains=search_value)
                | Q(complaint__icontains=search_value)
            )

        queryset = queryset.order_by("-scheduled_at")
        page = self.paginate_queryset(queryset)
        serializer = AppointmentSerializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return response.Response(serializer.data)


class DoctorScheduleViewSet(viewsets.ModelViewSet):
    queryset = DoctorSchedule.objects.select_related("doctor").all()
    serializer_class = DoctorScheduleSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "doctors"
    allowed_roles = ["admin", "doctor", "registrator"]
    filterset_fields = ["doctor", "weekday"]


class DoctorPricingViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    queryset = Doctor.objects.select_related("user").all()
    serializer_class = DoctorPricingSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "pricing"
    filterset_fields = ["is_active", "specialty"]
    search_fields = ["user__first_name", "user__last_name", "specialty"]

    def get_allowed_roles(self, request):
        if self.action in {"list", "retrieve"}:
            return ["admin", "cashier", "super_admin", "registrator"]
        return ["admin", "cashier", "super_admin"]
