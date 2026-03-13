from decimal import Decimal
from datetime import date
from datetime import datetime
from datetime import timedelta

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


def create_daily_treatment_charge_for_referral(referral, for_date: date | None = None):
    from .models import ChargeItem

    target_date = for_date or timezone.localdate()
    existing = Charge.objects.filter(treatment_referral=referral, created_at__date=target_date).first()
    if existing:
        return existing, False

    charge = Charge.objects.create(
        patient=referral.patient,
        treatment_referral=referral,
        notes=f"Yotoq kunlik to'lovi ({target_date.isoformat()})",
    )
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
        _, is_created = create_daily_treatment_charge_for_referral(referral, for_date=target_date)
        if is_created:
            created += 1
        else:
            existing += 1
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


def _get_scoped_patient_charge_queryset(user, patient_id: int, treatment_only: bool = False):
    queryset = Charge.objects.filter(
        patient_id=patient_id,
    ).order_by("created_at")
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

    remaining = amount
    processed = 0
    last_charge = None

    for charge in queryset:
        debt = max(charge.total_amount - charge.paid_amount, Decimal("0.00"))
        if debt <= 0:
            continue
        pay_amount = debt if debt <= remaining else remaining
        record_payment(
            charge=charge,
            amount=pay_amount,
            payment_method=payment_method,
            note=note,
        )
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
        record_payment(
            charge=fallback_charge,
            amount=remaining,
            payment_method=payment_method,
            note=note,
        )
        processed += 1
        last_charge = fallback_charge
        remaining = Decimal("0.00")

    total_applied = amount - remaining
    debt_after = total_debt - total_applied
    advance_amount = abs(debt_after) if debt_after < 0 else Decimal("0.00")
    return {
        "patient_id": patient_id,
        "processed_charges": processed,
        "debt_before": total_debt,
        "applied_amount": total_applied,
        "debt_after": debt_after,
        "advance_amount": advance_amount,
        "last_charge_id": last_charge.id if last_charge else None,
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
