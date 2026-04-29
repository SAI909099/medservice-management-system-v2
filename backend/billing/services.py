from decimal import Decimal
from datetime import date
from datetime import datetime
from datetime import timedelta

from django.db import IntegrityError
from django.db.models import Max
from django.utils import timezone

from .models import Charge
from .models import Payment
from .models import Receipt


def recalculate_charge(charge: Charge) -> Charge:
    total_amount = sum((item.total_price for item in charge.items.all()), Decimal("0.00"))
    charge.total_amount = total_amount
    if charge.paid_amount <= 0:
        charge.status = Charge.Status.UNPAID
    elif charge.paid_amount < charge.total_amount:
        charge.status = Charge.Status.PARTIAL
    else:
        charge.status = Charge.Status.PAID
    charge.save(update_fields=["total_amount", "status"])
    return charge


def record_payment(charge: Charge, amount: Decimal, payment_method: str, note: str = "") -> Payment:
    payment = Payment.objects.create(
        charge=charge,
        amount=amount,
        payment_method=payment_method,
        note=note,
    )
    charge.paid_amount += amount
    charge.save(update_fields=["paid_amount"])
    recalculate_charge(charge)
    Receipt.objects.get_or_create(
        payment=payment,
        defaults={"receipt_no": f"RCP-{payment.id:06d}"},
    )
    return payment


def _charge_source_label(charge: Charge) -> str:
    if charge.appointment_id:
        return "qabul"
    if charge.treatment_referral_id:
        return "yotoq"
    return "boshqa"


def create_daily_treatment_charge_for_referral(referral, for_date: date | None = None):
    from .models import ChargeItem

    target_date = for_date or timezone.localdate()
    existing = Charge.objects.filter(treatment_referral=referral, treatment_charge_date=target_date).first()
    if existing:
        return existing, False

    try:
        charge = Charge.objects.create(
            patient=referral.patient,
            treatment_referral=referral,
            treatment_charge_date=target_date,
            notes=f"Yotoq kunlik to'lovi ({target_date.isoformat()})",
        )
    except IntegrityError:
        existing = Charge.objects.filter(treatment_referral=referral, treatment_charge_date=target_date).first()
        if existing:
            return existing, False
        raise
    if target_date != timezone.localdate():
        current_local_time = timezone.localtime().time().replace(microsecond=0)
        backdated_dt = timezone.make_aware(datetime.combine(target_date, current_local_time), timezone.get_current_timezone())
        charge.created_at = backdated_dt
        charge.save(update_fields=["created_at"])
    daily_price = referral.room.daily_price or Decimal("0.00")
    ChargeItem.objects.create(
        charge=charge,
        description=f"Yotoq: {referral.room.name} ({target_date.isoformat()})",
        quantity=1,
        unit_price=daily_price,
        total_price=daily_price,
    )
    recalculate_charge(charge)
    return charge, True


def create_daily_treatment_room_charges(for_date: date | None = None):
    from treatment_rooms.models import TreatmentReferral

    target_date = for_date or timezone.localdate()
    referrals = TreatmentReferral.objects.select_related("patient", "room").filter(status=TreatmentReferral.Status.IN_PROGRESS)
    created = 0
    existing = 0

    for referral in referrals:
        referral_start_date = timezone.localtime(referral.created_at).date()
        last_generated_date = (
            Charge.objects.filter(
                treatment_referral=referral,
                treatment_charge_date__isnull=False,
            ).aggregate(last=Max("treatment_charge_date"))["last"]
        )
        start_date = referral_start_date
        if last_generated_date:
            start_date = max(start_date, last_generated_date + timedelta(days=1))

        current = start_date
        while current <= target_date:
            _, is_created = create_daily_treatment_charge_for_referral(referral, for_date=current)
            if is_created:
                created += 1
            else:
                existing += 1
            current += timedelta(days=1)

    return {"created": created, "existing": existing, "date": target_date.isoformat()}


def create_treatment_charges_for_referral_period(referral, start_date: date, end_date: date | None = None):
    target_end = end_date or timezone.localdate()
    if start_date > target_end:
        target_end = start_date

    created = 0
    existing = 0
    current = start_date
    while current <= target_end:
        _, is_created = create_daily_treatment_charge_for_referral(referral, for_date=current)
        if is_created:
            created += 1
        else:
            existing += 1
        current += timedelta(days=1)

    return {
        "created": created,
        "existing": existing,
        "start_date": start_date.isoformat(),
        "end_date": target_end.isoformat(),
    }


def create_interval_treatment_charge_for_referral(referral, interval_minutes: int = 1, for_datetime=None):
    from .models import ChargeItem

    safe_interval = max(int(interval_minutes or 1), 1)
    now_dt = timezone.localtime(for_datetime or timezone.now())
    latest_charge = (
        Charge.objects.filter(treatment_referral=referral)
        .order_by("-created_at", "-id")
        .first()
    )
    if latest_charge:
        latest_dt = timezone.localtime(latest_charge.created_at)
        if now_dt - latest_dt < timedelta(minutes=safe_interval):
            return latest_charge, False

    charge = Charge.objects.create(
        patient=referral.patient,
        treatment_referral=referral,
        treatment_charge_date=None,
        notes=f"Yotoq interval to'lovi ({now_dt.isoformat(timespec='minutes')})",
    )
    if for_datetime is not None:
        charge.created_at = now_dt
        charge.save(update_fields=["created_at"])
    daily_price = referral.room.daily_price or Decimal("0.00")
    ChargeItem.objects.create(
        charge=charge,
        description=f"Yotoq interval: {referral.room.name} ({now_dt.strftime('%Y-%m-%d %H:%M')})",
        quantity=1,
        unit_price=daily_price,
        total_price=daily_price,
    )
    recalculate_charge(charge)
    return charge, True


def create_interval_treatment_room_charges(interval_minutes: int = 1, for_datetime=None):
    from treatment_rooms.models import TreatmentReferral

    safe_interval = max(int(interval_minutes or 1), 1)
    now_dt = timezone.localtime(for_datetime or timezone.now())
    referrals = TreatmentReferral.objects.select_related("patient", "room").filter(status=TreatmentReferral.Status.IN_PROGRESS)
    created = 0
    existing = 0
    for referral in referrals:
        _, is_created = create_interval_treatment_charge_for_referral(
            referral=referral,
            interval_minutes=safe_interval,
            for_datetime=now_dt,
        )
        if is_created:
            created += 1
        else:
            existing += 1
    return {
        "created": created,
        "existing": existing,
        "datetime": now_dt.isoformat(timespec="minutes"),
        "interval_minutes": safe_interval,
    }


def _get_scoped_patient_charge_queryset(user, patient_id: int, treatment_only: bool = False):
    queryset = (
        Charge.objects.select_related(
            "patient",
            "patient__clinic",
            "patient__branch",
            "appointment",
            "treatment_referral",
        )
        .filter(patient_id=patient_id)
        .order_by("created_at")
    )
    if treatment_only:
        queryset = queryset.filter(treatment_referral__isnull=False)

    if not user.is_superuser:
        clinic_id = getattr(user, "clinic_id", None)
        branch_id = getattr(user, "branch_id", None)
        if clinic_id:
            queryset = queryset.filter(patient__clinic_id=clinic_id)
        if branch_id:
            queryset = queryset.filter(patient__branch_id=branch_id)
    return queryset


def apply_patient_payment(
    user,
    patient_id: int,
    amount: Decimal,
    payment_method: str,
    note: str = "",
    treatment_only: bool = False,
):
    if amount <= 0:
        raise ValueError("Summa 0 dan katta bo'lishi kerak.")

    queryset = _get_scoped_patient_charge_queryset(user=user, patient_id=patient_id, treatment_only=treatment_only)

    total_debt = Decimal("0.00")
    for charge in queryset:
        total_debt += max(charge.total_amount - charge.paid_amount, Decimal("0.00"))

    if not queryset.exists():
        raise ValueError("Bemor uchun charge topilmadi.")

    entered_amount = amount
    remaining = amount
    processed = 0
    last_charge = None
    created_payments = []

    for charge in queryset:
        debt = max(charge.total_amount - charge.paid_amount, Decimal("0.00"))
        if debt <= 0:
            continue
        pay_amount = debt if debt <= remaining else remaining
        payment = record_payment(
            charge=charge,
            amount=pay_amount,
            payment_method=payment_method,
            note=note,
        )
        created_payments.append((payment, charge, pay_amount))
        remaining -= pay_amount
        processed += 1
        last_charge = charge
        if remaining <= 0:
            break

    # Extra payment becomes advance (oldindan to'langan) on the latest patient charge.
    if remaining > 0:
        fallback_charge = queryset.last()
        if fallback_charge is None:
            raise ValueError("Bemor uchun charge topilmadi.")
        payment = record_payment(
            charge=fallback_charge,
            amount=remaining,
            payment_method=payment_method,
            note=note,
        )
        created_payments.append((payment, fallback_charge, remaining))
        processed += 1
        last_charge = fallback_charge
        remaining = Decimal("0.00")

    total_applied = amount - remaining
    debt_after = total_debt - total_applied
    advance_amount = abs(debt_after) if debt_after < 0 else Decimal("0.00")
    patient = queryset.first().patient if queryset.exists() else None
    payments_payload = []
    for payment, charge, pay_amount in created_payments:
        items = list(charge.items.all())
        payments_payload.append(
            {
                "payment_id": payment.id,
                "receipt_no": payment.receipt.receipt_no,
                "applied_amount": pay_amount,
                "charge_id": charge.id,
                "charge_source": _charge_source_label(charge),
                "charge_date": charge.created_at.date().isoformat(),
                "items": [
                    {
                        "description": item.description,
                        "quantity": item.quantity,
                        "unit_price": str(item.unit_price),
                        "total_price": str(item.total_price),
                    }
                    for item in items
                ],
            }
        )

    return {
        "patient_id": patient_id,
        "patient_name": f"{patient.first_name} {patient.last_name}".strip() if patient else "",
        "clinic_name": patient.clinic.name if patient and patient.clinic_id else "",
        "branch_name": patient.branch.name if patient and patient.branch_id else "",
        "processed_charges": processed,
        "entered_amount": entered_amount,
        "debt_before": total_debt,
        "applied_amount": total_applied,
        "debt_after": debt_after,
        "advance_amount": advance_amount,
        "last_charge_id": last_charge.id if last_charge else None,
        "payments": payments_payload,
    }


def apply_treatment_patient_payment(user, patient_id: int, amount: Decimal, payment_method: str, note: str = ""):
    return apply_patient_payment(
        user=user,
        patient_id=patient_id,
        amount=amount,
        payment_method=payment_method,
        note=note,
        treatment_only=True,
    )
