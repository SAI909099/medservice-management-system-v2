from rest_framework import decorators, response, viewsets

from accounts.permissions import PageAccessPermission, RoleBasedPermission
from appointments.models import Appointment
from clinics.models import Clinic

from .models import Patient
from .serializers import PatientSerializer, PatientVisitHistorySerializer


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.select_related("clinic", "branch", "created_by").all()
    serializer_class = PatientSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "patients"
    allowed_roles = ["admin", "registrator", "doctor", "lab_staff", "treatment_staff"]
    filterset_fields = ["clinic", "branch", "gender"]
    search_fields = ["first_name", "last_name", "phone", "passport_id"]
    ordering_fields = ["created_at", "last_name"]

    def perform_create(self, serializer):
        user = self.request.user
        clinic = serializer.validated_data.get("clinic") or getattr(user, "clinic", None)
        branch = serializer.validated_data.get("branch") or getattr(user, "branch", None)
        if clinic is None:
            clinic = Clinic.objects.filter(is_active=True).order_by("id").first()
        if clinic is None:
            clinic = Clinic.objects.order_by("id").first()
        if clinic is None:
            clinic = Clinic.objects.create(name="Asosiy klinika", is_active=True)
        serializer.save(created_by=user, clinic=clinic, branch=branch)

    @decorators.action(detail=True, methods=["get"])
    def visits(self, request, pk=None):
        visits = Appointment.objects.filter(patient_id=pk).select_related("doctor__user")
        page = self.paginate_queryset(visits)
        serializer = PatientVisitHistorySerializer(page or visits, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return response.Response(serializer.data)
