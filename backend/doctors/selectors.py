from datetime import date
from decimal import Decimal
from django.db.models import Sum
from django.db.models.functions import Coalesce
from .models import Doctor


def get_doctor_salary_summary(year: int, month: int):
    """
    Calculate treatment income and salary for each doctor for a given month.
    
    Returns list of dicts with:
    - doctor_id, doctor_name, specialty
    - salary_percentage
    - treatment_income (total payments for treatment referrals)
    - calculated_salary (income * percentage / 100)
    """
    from billing.models import Payment
    from django.db.models import Count
    from django.utils import timezone
    
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
    
    doctors = Doctor.objects.filter(is_active=True).select_related("user")
    
    result = []
    for doctor in doctors:
        treatment_income = Payment.objects.filter(
            charge__treatment_referral__doctor=doctor,
            charge__treatment_referral__isnull=False,
            created_at__gte=start_date,
            created_at__lt=end_date,
        ).aggregate(total=Coalesce(Sum("amount"), Decimal("0")))["total"] or Decimal("0")
        
        percentage = doctor.salary_percentage or Decimal("0")
        calculated_salary = (treatment_income * percentage / 100) if percentage > 0 else Decimal("0")
        
        result.append({
            "doctor_id": doctor.id,
            "doctor_name": f"{doctor.user.first_name} {doctor.user.last_name}".strip() or doctor.user.username,
            "specialty": doctor.specialty,
            "salary_percentage": float(percentage),
            "treatment_income": float(treatment_income),
            "calculated_salary": float(calculated_salary),
        })
    
    return result