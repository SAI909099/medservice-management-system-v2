from django.db.models import Count, Prefetch, Q, QuerySet

from patients.models import Patient

from .models import TreatmentArea, TreatmentReferral, TreatmentRoom


def _scoped_queryset(queryset: QuerySet, user, clinic_field: str = "clinic_id", branch_field: str = "branch_id") -> QuerySet:
    if user.is_superuser:
        return queryset

    clinic_id = getattr(user, "clinic_id", None)
    branch_id = getattr(user, "branch_id", None)

    if clinic_id:
        queryset = queryset.filter(**{clinic_field: clinic_id})

    if branch_id:
        queryset = queryset.filter(**{branch_field: branch_id})

    return queryset


def get_treatment_area_queryset(user) -> QuerySet:
    queryset = TreatmentArea.objects.select_related("clinic", "branch").order_by("area_type", "name")
    return _scoped_queryset(queryset, user)


def get_treatment_room_queryset(user) -> QuerySet:
    active_referrals_qs = (
        TreatmentReferral.objects.filter(status=TreatmentReferral.Status.IN_PROGRESS)
        .select_related("patient")
        .order_by("-created_at")
    )
    queryset = (
        TreatmentRoom.objects.select_related("clinic", "branch", "area")
        .prefetch_related(Prefetch("referrals", queryset=active_referrals_qs, to_attr="active_referrals"))
        .annotate(
            occupied_count=Count(
                "referrals",
                filter=Q(referrals__status=TreatmentReferral.Status.IN_PROGRESS),
                distinct=True,
            )
        )
        .order_by("area__name", "name")
    )
    return _scoped_queryset(queryset, user)


def get_treatment_referral_queryset(user) -> QuerySet:
    queryset = TreatmentReferral.objects.select_related("patient", "doctor__user", "room", "room__clinic", "room__branch").all()
    return _scoped_queryset(queryset, user, clinic_field="room__clinic_id", branch_field="room__branch_id")


def get_treatment_patient_options_queryset(user, search: str | None = None) -> QuerySet:
    queryset = Patient.objects.order_by("-created_at")
    queryset = _scoped_queryset(queryset, user)
    if search:
        queryset = queryset.filter(
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(phone__icontains=search)
        )
    return queryset
