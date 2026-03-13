from rest_framework import decorators, response, viewsets

from accounts.permissions import PageAccessPermission, RoleBasedPermission

from .selectors import (
    get_treatment_area_queryset,
    get_treatment_patient_options_queryset,
    get_treatment_referral_queryset,
    get_treatment_room_queryset,
)
from .serializers import TreatmentAreaSerializer, TreatmentReferralSerializer, TreatmentRoomSerializer


class TreatmentAreaViewSet(viewsets.ModelViewSet):
    serializer_class = TreatmentAreaSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "treatment"
    allowed_roles = ["admin", "treatment_staff", "registrator"]
    filterset_fields = ["clinic", "branch", "area_type", "is_active"]

    def get_queryset(self):
        return get_treatment_area_queryset(self.request.user)


class TreatmentRoomViewSet(viewsets.ModelViewSet):
    serializer_class = TreatmentRoomSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "treatment"
    allowed_roles = ["admin", "treatment_staff", "registrator"]
    filterset_fields = ["clinic", "branch", "area", "is_active"]

    def get_queryset(self):
        return get_treatment_room_queryset(self.request.user)


class TreatmentReferralViewSet(viewsets.ModelViewSet):
    serializer_class = TreatmentReferralSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "treatment"
    allowed_roles = ["admin", "doctor", "treatment_staff", "registrator"]
    filterset_fields = ["status", "room", "doctor", "patient"]

    def get_queryset(self):
        return get_treatment_referral_queryset(self.request.user)

    @decorators.action(detail=False, methods=["get"], url_path="patient-options")
    def patient_options(self, request):
        search = request.query_params.get("search", "").strip()
        queryset = get_treatment_patient_options_queryset(request.user, search=search)[:30]
        data = [
            {
                "id": patient.id,
                "full_name": f"{patient.first_name} {patient.last_name}".strip(),
                "phone": patient.phone,
            }
            for patient in queryset
        ]
        return response.Response({"results": data})
