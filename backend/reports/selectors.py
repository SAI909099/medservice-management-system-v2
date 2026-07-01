from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Case, CharField, Count, Sum, Value, When
from django.db.models.functions import TruncDay, TruncMonth
from django.utils import timezone

from billing.models import Charge, Payment

from .models import Expense


def scoped_payments_queryset(user):
    queryset = Payment.objects.select_related("charge__patient")
    if user.is_superuser:
        return queryset
    clinic_id = getattr(user, "clinic_id", None)
    branch_id = getattr(user, "branch_id", None)
    if clinic_id:
        queryset = queryset.filter(charge__patient__clinic_id=clinic_id)
    if branch_id:
        queryset = queryset.filter(charge__patient__branch_id=branch_id)
    return queryset


def scoped_expenses_queryset(user):
    queryset = Expense.objects.select_related("clinic", "branch")
    if user.is_superuser:
        return queryset
    clinic_id = getattr(user, "clinic_id", None)
    branch_id = getattr(user, "branch_id", None)
    if clinic_id:
        queryset = queryset.filter(clinic_id=clinic_id)
    if branch_id:
        queryset = queryset.filter(branch_id=branch_id)
    return queryset


def scoped_cashier_outputs_queryset(user):
    return scoped_expenses_queryset(user).filter(created_by_id=user.id)


def scoped_charges_queryset(user):
    queryset = Charge.objects.select_related("patient")
    if user.is_superuser:
        return queryset
    clinic_id = getattr(user, "clinic_id", None)
    branch_id = getattr(user, "branch_id", None)
    if clinic_id:
        queryset = queryset.filter(patient__clinic_id=clinic_id)
    if branch_id:
        queryset = queryset.filter(patient__branch_id=branch_id)
    return queryset


def get_base_reports_payload(user):
    payment_qs = scoped_payments_queryset(user)
    expense_qs = scoped_expenses_queryset(user)

    daily = list(
        payment_qs
        .annotate(day=TruncDay("created_at"))
        .values("day")
        .annotate(total=Sum("amount"))
        .order_by("-day")[:30]
    )
    daily_refunds = {
        (item["day"].date() if hasattr(item["day"], "date") else item["day"]).isoformat(): item["total"]
        for item in expense_qs.filter(category="Qaytarish (Refund)").annotate(day=TruncDay("spent_at")).values("day").annotate(total=Sum("amount"))
    }
    for row in daily:
        day_key = (row["day"].date() if hasattr(row["day"], "date") else row["day"]).isoformat()
        refund = daily_refunds.get(day_key, Decimal("0.00"))
        row["total"] = row["total"] - refund

    monthly = list(
        payment_qs
        .annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(total=Sum("amount"))
        .order_by("-month")[:12]
    )
    monthly_refunds = {
        (item["month"].date() if hasattr(item["month"], "date") else item["month"]).isoformat()[:7]: item["total"]
        for item in expense_qs.filter(category="Qaytarish (Refund)").annotate(month=TruncMonth("spent_at")).values("month").annotate(total=Sum("amount"))
    }
    for row in monthly:
        month_key = (row["month"].date() if hasattr(row["month"], "date") else row["month"]).isoformat()[:7]
        refund = monthly_refunds.get(month_key, Decimal("0.00"))
        row["total"] = row["total"] - refund

    debtors = scoped_charges_queryset(user).filter(status__in=[Charge.Status.UNPAID, Charge.Status.PARTIAL]).values(
        "id", "patient__first_name", "patient__last_name", "total_amount", "paid_amount", "status"
    )
    return {
        "daily_revenue": daily,
        "monthly_revenue": monthly,
        "debtors": list(debtors),
    }


def get_finance_overview(
    user,
    days: int = 30,
    period: str = "window",
    date_from: str | None = None,
    date_to: str | None = None,
    income_page: int = 1,
    income_page_size: int = 20,
    output_page: int = 1,
    output_page_size: int = 20,
):
    start_date, end_date, resolved_period = _resolve_finance_range(
        period=period,
        date_from=date_from,
        date_to=date_to,
        days=days,
    )
    resolved_days = (end_date - start_date).days + 1

    payment_qs = scoped_payments_queryset(user).filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
    expense_qs = scoped_expenses_queryset(user).filter(spent_at__gte=start_date, spent_at__lte=end_date)

    income_total = payment_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    output_total = expense_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    refund_total = expense_qs.filter(category="Qaytarish (Refund)").aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    effective_income = income_total - refund_total
    net_total = effective_income - output_total

    income_by_day = {
        (item["day"].date() if hasattr(item["day"], "date") else item["day"]).isoformat(): item["total"]
        for item in payment_qs.annotate(day=TruncDay("created_at")).values("day").annotate(total=Sum("amount"))
    }
    refund_by_day = {
        (item["day"].isoformat() if hasattr(item["day"], "isoformat") else item["day"]): item["total"]
        for item in expense_qs.filter(category="Qaytarish (Refund)").annotate(day=TruncDay("spent_at")).values("day").annotate(total=Sum("amount"))
    }
    output_by_day = {
        (item["day"].date() if hasattr(item["day"], "date") else item["day"]).isoformat(): item["total"]
        for item in expense_qs.annotate(day=TruncDay("spent_at")).values("day").annotate(total=Sum("amount"))
    }

    timeline = []
    current = start_date
    while current <= end_date:
        key = current.isoformat()
        income = income_by_day.get(key, Decimal("0.00"))
        refund = refund_by_day.get(key, Decimal("0.00"))
        effective = income - refund
        output = output_by_day.get(key, Decimal("0.00"))
        timeline.append(
            {
                "date": key,
                "income": effective,
                "output": output,
                "net": effective - output,
            }
        )
        current += timedelta(days=1)

    method_breakdown = list(
        payment_qs.values("payment_method")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )

    recent_income_qs = (
        payment_qs.select_related("charge__patient", "charge__appointment", "charge__treatment_referral")
        .annotate(
            income_type=Case(
                When(charge__treatment_referral_id__isnull=False, then=Value("treatment")),
                When(charge__appointment_id__isnull=False, then=Value("doctor")),
                default=Value("service"),
                output_field=CharField(),
            )
        )
        .order_by("-created_at")
    )

    recent_outputs_qs = expense_qs.select_related("created_by__role").order_by("-spent_at", "-id")

    income_total_count = recent_income_qs.count()
    output_total_count = recent_outputs_qs.count()

    safe_income_page = max(income_page, 1)
    safe_income_page_size = max(min(income_page_size, 100), 5)
    safe_output_page = max(output_page, 1)
    safe_output_page_size = max(min(output_page_size, 100), 5)

    income_start = (safe_income_page - 1) * safe_income_page_size
    income_end = income_start + safe_income_page_size
    output_start = (safe_output_page - 1) * safe_output_page_size
    output_end = output_start + safe_output_page_size

    recent_income = list(
        recent_income_qs.values(
            "id",
            "charge_id",
            "amount",
            "payment_method",
            "created_at",
            "income_type",
            "charge__notes",
            "charge__patient__first_name",
            "charge__patient__last_name",
            "charge__appointment__doctor__user__first_name",
            "charge__appointment__doctor__user__last_name",
            "charge__treatment_referral__room__name",
        )[income_start:income_end]
    )
    recent_outputs = list(
        recent_outputs_qs.values(
            "id",
            "source",
            "description",
            "category",
            "note",
            "amount",
            "spent_at",
            "created_by__username",
            "created_by__role__name",
        )[output_start:output_end]
    )

    for row in recent_income:
        row["flow_from_role"] = "patient"
        row["flow_from"] = "patient_payment"
        income_type = row.get("income_type")
        if income_type == "doctor":
            first_name = row.get("charge__appointment__doctor__user__first_name") or ""
            last_name = row.get("charge__appointment__doctor__user__last_name") or ""
            doctor_name = f"{first_name} {last_name}".strip()
            row["flow_to"] = doctor_name or "doctor_consultation"
            row["flow_to_role"] = "doctor"
        elif income_type == "treatment":
            room_name = row.get("charge__treatment_referral__room__name") or ""
            row["flow_to"] = room_name or "treatment_room"
            row["flow_to_role"] = "treatment_staff"
        else:
            row["flow_to"] = "clinic_service"
            row["flow_to_role"] = "cashier"

    for row in recent_outputs:
        row["flow_from_role"] = row.get("created_by__role__name") or "unknown"
        row["flow_to"] = "clinic_expense"
        row["flow_to_role"] = "clinic"

    income_by_type = list(
        recent_income_qs.values("income_type")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total")
    )
    output_by_role = list(
        expense_qs.values("created_by__role__name")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total")
    )

    return {
        "period": resolved_period,
        "date_from": start_date,
        "date_to": end_date,
        "days": resolved_days,
        "income_total": effective_income,
        "output_total": output_total,
        "refund_total": refund_total,
        "net_total": net_total,
        "timeline": timeline,
        "payment_methods": method_breakdown,
        "income_by_type": income_by_type,
        "output_by_role": output_by_role,
        "recent_income": recent_income,
        "recent_outputs": recent_outputs,
        "recent_income_pagination": {
            "page": safe_income_page,
            "page_size": safe_income_page_size,
            "total": income_total_count,
            "total_pages": (income_total_count + safe_income_page_size - 1) // safe_income_page_size,
        },
        "recent_outputs_pagination": {
            "page": safe_output_page,
            "page_size": safe_output_page_size,
            "total": output_total_count,
            "total_pages": (output_total_count + safe_output_page_size - 1) // safe_output_page_size,
        },
    }


def _resolve_finance_range(period: str, date_from: str | None, date_to: str | None, days: int):
    today = timezone.localdate()
    selected_period = (period or "window").lower()

    if selected_period == "daily":
        return today, today, "daily"

    if selected_period == "monthly":
        return today.replace(day=1), today, "monthly"

    if selected_period == "yearly":
        return today.replace(month=1, day=1), today, "yearly"

    if selected_period == "custom":
        try:
            start_date = date.fromisoformat(date_from) if date_from else today
        except Exception:
            start_date = today
        try:
            end_date = date.fromisoformat(date_to) if date_to else today
        except Exception:
            end_date = today
        if start_date > end_date:
            start_date, end_date = end_date, start_date
        return start_date, end_date, "custom"

    safe_days = max(1, min(days, 366))
    end_date = today
    start_date = end_date - timedelta(days=max(safe_days - 1, 0))
    return start_date, end_date, "window"


def _resolve_income_range(period: str, date_from: str | None, date_to: str | None):
    today = timezone.localdate()
    selected_period = (period or "month").lower()

    if selected_period == "today":
        return today, today, selected_period

    if selected_period == "custom":
        try:
            start_date = date.fromisoformat(date_from) if date_from else today
        except Exception:
            start_date = today
        try:
            end_date = date.fromisoformat(date_to) if date_to else today
        except Exception:
            end_date = today
        if start_date > end_date:
            start_date, end_date = end_date, start_date
        return start_date, end_date, selected_period

    if selected_period == "30d":
        return today - timedelta(days=29), today, selected_period

    # Default month range.
    start_of_month = today.replace(day=1)
    return start_of_month, today, "month"


def get_income_analytics(user, period: str = "month", date_from: str | None = None, date_to: str | None = None, group_by: str = "day"):
    start_date, end_date, resolved_period = _resolve_income_range(period=period, date_from=date_from, date_to=date_to)
    truncate_fn = TruncMonth if (group_by or "").lower() == "month" else TruncDay
    resolved_group_by = "month" if (group_by or "").lower() == "month" else "day"

    payment_qs = scoped_payments_queryset(user).filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
    expense_qs = scoped_expenses_queryset(user).filter(spent_at__gte=start_date, spent_at__lte=end_date, category="Qaytarish (Refund)")

    doctor_qs = payment_qs.filter(charge__appointment_id__isnull=False)
    treatment_qs = payment_qs.filter(charge__treatment_referral_id__isnull=False)
    service_qs = payment_qs.filter(charge__appointment_id__isnull=True, charge__treatment_referral_id__isnull=True)

    income_total = payment_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    doctor_total = doctor_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    treatment_total = treatment_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    service_total = service_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

    refund_total = expense_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    refund_by_source = {
        item["source"]: item["total"]
        for item in expense_qs.values("source").annotate(total=Sum("amount"))
    }
    doctor_refund = Decimal("0.00")
    treatment_refund = Decimal("0.00")
    service_refund = refund_total

    effective_income = income_total - refund_total
    doctor_total = doctor_total - doctor_refund
    treatment_total = treatment_total - treatment_refund
    service_total = service_total - service_refund
    other_total = Decimal("0.00")

    timeline = list(
        payment_qs.annotate(period_value=truncate_fn("created_at"))
        .values("period_value")
        .annotate(total=Sum("amount"))
        .order_by("period_value")
    )
    refund_timeline = {
        (item["period_value"].date() if hasattr(item["period_value"], "date") else item["period_value"]).isoformat()[:7] if resolved_group_by == "month"
        else (item["period_value"].date() if hasattr(item["period_value"], "date") else item["period_value"]).isoformat(): item["total"]
        for item in expense_qs.annotate(period_value=truncate_fn("spent_at")).values("period_value").annotate(total=Sum("amount"))
    }
    for row in timeline:
        key = (row["period_value"].date() if hasattr(row["period_value"], "date") else row["period_value"]).isoformat()
        if resolved_group_by == "month":
            key = key[:7]
        refund = refund_timeline.get(key, Decimal("0.00"))
        row["total"] = row["total"] - refund

    doctor_breakdown = list(
        doctor_qs.values(
            "charge__appointment__doctor_id",
            "charge__appointment__doctor__user__first_name",
            "charge__appointment__doctor__user__last_name",
            "charge__appointment__doctor__specialty",
        )
        .annotate(total=Sum("amount"), payments_count=Count("id"))
        .order_by("-total")
    )

    treatment_room_breakdown = list(
        treatment_qs.values(
            "charge__treatment_referral__room_id",
            "charge__treatment_referral__room__name",
        )
        .annotate(total=Sum("amount"), payments_count=Count("id"))
        .order_by("-total")
    )

    return {
        "period": resolved_period,
        "group_by": resolved_group_by,
        "date_from": start_date,
        "date_to": end_date,
        "income_total": effective_income,
        "refund_total": refund_total,
        "sources": {
            "doctor": doctor_total,
            "treatment_room": treatment_total,
            "service": service_total,
            "other": other_total,
        },
        "timeline": timeline,
        "doctor_breakdown": doctor_breakdown,
        "treatment_room_breakdown": treatment_room_breakdown,
        "service_breakdown": [],
        "other_breakdown": [],
    }
