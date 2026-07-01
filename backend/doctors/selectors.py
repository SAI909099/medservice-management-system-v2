from datetime import date
from decimal import Decimal
from django.db.models import F, Sum, Value
from django.db.models.functions import Coalesce, Concat
from .models import Doctor


def get_doctor_salary_summary(year: int, month: int):
    from billing.models import Payment
    from reports.models import Expense

    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)

    doctors = Doctor.objects.filter(is_active=True).select_related("user")

    result = []
    for doctor in doctors:
        payments_qs = Payment.objects.filter(
            charge__treatment_referral__doctor=doctor,
            charge__treatment_referral__isnull=False,
            created_at__gte=start_date,
            created_at__lt=end_date,
        )

        treatment_income = payments_qs.aggregate(
            total=Coalesce(Sum("amount"), Decimal("0"))
        )["total"] or Decimal("0")

        refund_amount = Expense.objects.filter(
            doctor=doctor,
            category="Qaytarish (Refund)",
            spent_at__gte=start_date,
            spent_at__lt=end_date,
        ).aggregate(total=Coalesce(Sum("amount"), Decimal("0")))["total"] or Decimal("0")
        treatment_income = treatment_income - refund_amount

        patient_breakdown = (
            payments_qs
            .values("charge__patient_id")
            .annotate(
                patient_name=Coalesce(
                    Concat("charge__patient__first_name", Value(" "), "charge__patient__last_name"),
                    Value(""),
                ),
                total_paid=Coalesce(Sum("amount"), Decimal("0")),
            )
            .order_by("-total_paid")
        )

        patients_list = [
            {
                "patient_id": p["charge__patient_id"],
                "patient_name": p["patient_name"],
                "total_paid": float(p["total_paid"]),
            }
            for p in patient_breakdown
        ]

        paid_amount = Expense.objects.filter(
            doctor=doctor,
            category="Shifokor maoshi",
            spent_at__gte=start_date,
            spent_at__lt=end_date,
        ).aggregate(total=Coalesce(Sum("amount"), Decimal("0")))["total"] or Decimal("0")

        percentage = doctor.salary_percentage or Decimal("0")
        calculated_salary = (treatment_income * percentage / 100) if percentage > 0 else Decimal("0")
        remaining = calculated_salary - paid_amount

        result.append({
            "doctor_id": doctor.id,
            "doctor_name": f"{doctor.user.first_name} {doctor.user.last_name}".strip() or doctor.user.username,
            "specialty": doctor.specialty,
            "salary_percentage": float(percentage),
            "treatment_income": float(treatment_income),
            "calculated_salary": float(calculated_salary),
            "paid_amount": float(paid_amount),
            "remaining": float(max(remaining, Decimal("0"))),
            "patients": patients_list,
        })

    return result


def get_doctor_appointment_salary_summary(year: int, month: int, day: int | None = None):
    from billing.models import Payment
    from reports.models import Expense

    if day is not None:
        start_date = date(year, month, day)
        end_date = date(year, month, day + 1)
    else:
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)

    doctors = Doctor.objects.filter(is_active=True).select_related("user")

    result = []
    for doctor in doctors:
        payments_qs = Payment.objects.filter(
            charge__appointment__doctor=doctor,
            charge__appointment__isnull=False,
            charge__appointment__scheduled_at__gte=start_date,
            charge__appointment__scheduled_at__lt=end_date,
        )

        treatment_income = payments_qs.aggregate(
            total=Coalesce(Sum("amount"), Decimal("0"))
        )["total"] or Decimal("0")

        refund_amount = Expense.objects.filter(
            doctor=doctor,
            category="Qaytarish (Refund)",
            spent_at__gte=start_date,
            spent_at__lt=end_date,
        ).aggregate(total=Coalesce(Sum("amount"), Decimal("0")))["total"] or Decimal("0")
        treatment_income = treatment_income - refund_amount

        patient_count = (
            payments_qs
            .values("charge__patient_id")
            .distinct()
            .count()
        )

        patient_breakdown = (
            payments_qs
            .values("charge__patient_id")
            .annotate(
                patient_name=Coalesce(
                    Concat("charge__patient__first_name", Value(" "), "charge__patient__last_name"),
                    Value(""),
                ),
                total_paid=Coalesce(Sum("amount"), Decimal("0")),
            )
            .order_by("-total_paid")
        )

        patients_list = [
            {
                "patient_id": p["charge__patient_id"],
                "patient_name": p["patient_name"],
                "total_paid": float(p["total_paid"]),
            }
            for p in patient_breakdown
        ]

        paid_amount = Expense.objects.filter(
            doctor=doctor,
            category="Shifokor maoshi (qabul)",
            spent_at__gte=start_date,
            spent_at__lt=end_date,
        ).aggregate(total=Coalesce(Sum("amount"), Decimal("0")))["total"] or Decimal("0")

        percentage = doctor.appointment_salary_percentage or Decimal("0")
        calculated_salary = (treatment_income * percentage / 100) if percentage > 0 else Decimal("0")
        remaining = calculated_salary - paid_amount

        result.append({
            "doctor_id": doctor.id,
            "doctor_name": f"{doctor.user.first_name} {doctor.user.last_name}".strip() or doctor.user.username,
            "specialty": doctor.specialty,
            "salary_percentage": float(percentage),
            "treatment_income": float(treatment_income),
            "patient_count": patient_count,
            "calculated_salary": float(calculated_salary),
            "paid_amount": float(paid_amount),
            "remaining": float(max(remaining, Decimal("0"))),
            "patients": patients_list,
        })

    return result