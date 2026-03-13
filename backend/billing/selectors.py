from decimal import Decimal

from django.db.models import Count, Max, Sum

from .models import Charge


def _scoped_charge_queryset(user):
    queryset = Charge.objects.select_related("patient", "appointment", "treatment_referral__room").prefetch_related("items", "items__service")
    if user.is_superuser:
        return queryset
    clinic_id = getattr(user, "clinic_id", None)
    branch_id = getattr(user, "branch_id", None)
    if clinic_id:
        queryset = queryset.filter(patient__clinic_id=clinic_id)
    if branch_id:
        queryset = queryset.filter(patient__branch_id=branch_id)
    return queryset


def get_patient_ledger_rows(user):
    rows = (
        _scoped_charge_queryset(user)
        .values("patient_id", "patient__first_name", "patient__last_name")
        .annotate(
            total_amount=Sum("total_amount"),
            paid_amount=Sum("paid_amount"),
            charge_count=Count("id"),
            last_charge_at=Max("created_at"),
        )
        .order_by("-last_charge_at")
    )

    result = []
    for row in rows:
        total_amount = row["total_amount"] or Decimal("0.00")
        paid_amount = row["paid_amount"] or Decimal("0.00")
        balance = total_amount - paid_amount
        debt_amount = balance if balance > 0 else Decimal("0.00")
        advance_amount = abs(balance) if balance < 0 else Decimal("0.00")
        if paid_amount <= 0:
            status = "unpaid"
        elif balance > 0:
            status = "partial"
        elif balance < 0:
            status = "prepaid"
        else:
            status = "paid"

        result.append(
            {
                "patient_id": row["patient_id"],
                "patient_name": f"{row['patient__first_name']} {row['patient__last_name']}".strip(),
                "charge_count": row["charge_count"],
                "total_amount": total_amount,
                "paid_amount": paid_amount,
                "debt_amount": debt_amount,
                "advance_amount": advance_amount,
                "status": status,
                "last_charge_at": row["last_charge_at"],
            }
        )
    return result


def get_patient_ledger_print_data(user, patient_id: int):
    charges = (
        _scoped_charge_queryset(user)
        .filter(patient_id=patient_id)
        .prefetch_related("items", "items__service")
        .order_by("created_at")
    )
    first = charges.first()
    if first is None:
        return None

    charge_rows = []
    total_amount = Decimal("0.00")
    paid_amount = Decimal("0.00")

    for charge in charges:
        source = "Boshqa"
        if charge.appointment_id:
            source = "Qabul"
        elif charge.treatment_referral_id:
            source = "Yotoq"
        for item in charge.items.all():
            charge_rows.append(
                {
                    "date": charge.created_at,
                    "source": source,
                    "description": item.description,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "total_price": item.total_price,
                }
            )
        total_amount += charge.total_amount
        paid_amount += charge.paid_amount

    balance = total_amount - paid_amount
    debt_amount = balance if balance > 0 else Decimal("0.00")
    advance_amount = abs(balance) if balance < 0 else Decimal("0.00")
    if paid_amount <= 0:
        status = "unpaid"
    elif balance > 0:
        status = "partial"
    elif balance < 0:
        status = "prepaid"
    else:
        status = "paid"

    return {
        "patient_id": first.patient_id,
        "patient_name": f"{first.patient.first_name} {first.patient.last_name}".strip(),
        "total_amount": total_amount,
        "paid_amount": paid_amount,
        "debt_amount": debt_amount,
        "advance_amount": advance_amount,
        "status": status,
        "rows": charge_rows,
    }


def get_treatment_room_patient_rows(user, status_value: str | None = None, today_only: bool = False):
    queryset = _scoped_charge_queryset(user).filter(treatment_referral__isnull=False)
    if today_only:
        from django.utils import timezone

        queryset = queryset.filter(created_at__date=timezone.localdate())

    rows = (
        queryset.values("patient_id", "patient__first_name", "patient__last_name")
        .annotate(
            total_amount=Sum("total_amount"),
            paid_amount=Sum("paid_amount"),
            charge_count=Count("id"),
            last_charge_at=Max("created_at"),
        )
        .order_by("-last_charge_at")
    )

    result = []
    for row in rows:
        total_amount = row["total_amount"] or Decimal("0.00")
        paid_amount = row["paid_amount"] or Decimal("0.00")
        balance = total_amount - paid_amount
        debt_amount = balance if balance > 0 else Decimal("0.00")
        advance_amount = abs(balance) if balance < 0 else Decimal("0.00")
        if paid_amount <= 0:
            row_status = "unpaid"
        elif balance > 0:
            row_status = "partial"
        elif balance < 0:
            row_status = "prepaid"
        else:
            row_status = "paid"
        if status_value and row_status != status_value:
            continue
        result.append(
            {
                "patient_id": row["patient_id"],
                "patient_name": f"{row['patient__first_name']} {row['patient__last_name']}".strip(),
                "status": row_status,
                "total_amount": total_amount,
                "paid_amount": paid_amount,
                "debt_amount": debt_amount,
                "advance_amount": advance_amount,
                "charge_count": row["charge_count"],
                "last_charge_at": row["last_charge_at"],
            }
        )
    return result
