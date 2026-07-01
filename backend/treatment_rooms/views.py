from datetime import datetime

from rest_framework import decorators, response, viewsets
from rest_framework.permissions import IsAuthenticated

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
    pagination_class = None

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

    @decorators.action(detail=True, methods=["post"], url_path="move", permission_classes=[IsAuthenticated])
    def move(self, request, pk=None):
        from django.utils import timezone
        from decimal import Decimal

        try:
            old_referral = self.get_queryset().get(pk=pk)
        except self.get_queryset().model.DoesNotExist:
            return response.Response({"detail": "Referral topilmadi."}, status=404)

        if old_referral.status != "in_progress":
            return response.Response({"detail": "Faqat active referral ko'chirilishi mumkin."}, status=400)

        new_room_id = request.data.get("room")
        if not new_room_id:
            return response.Response({"detail": "room kiritilishi shart."}, status=400)

        from .models import TreatmentRoom
        try:
            new_room = TreatmentRoom.objects.get(pk=new_room_id)
        except TreatmentRoom.DoesNotExist:
            return response.Response({"detail": "Yangi xona topilmadi."}, status=404)

        today = timezone.localdate()

        old_referral.status = "completed"
        old_referral.save(update_fields=["status"])

        new_referral = TreatmentReferral.objects.create(
            patient=old_referral.patient,
            room=new_room,
            doctor=old_referral.doctor,
            service_name=old_referral.service_name,
            status="in_progress",
            notes=f"Ko'chirildi: {old_referral.room.name} -> {new_room.name}",
        )

        current_local_time = timezone.localtime().time().replace(microsecond=0)
        new_referral.created_at = timezone.make_aware(
            datetime.combine(today, current_local_time),
            timezone.get_current_timezone(),
        )
        new_referral.save(update_fields=["created_at"])

        from billing.services import create_treatment_charges_for_referral_period
        create_treatment_charges_for_referral_period(new_referral, start_date=today, end_date=today)

        return response.Response({
            "detail": "Bemor muvaffaqiyatli ko'chirildi.",
            "old_referral_id": old_referral.id,
            "new_referral_id": new_referral.id,
            "from_room": old_referral.room.name,
            "to_room": new_room.name,
        })
