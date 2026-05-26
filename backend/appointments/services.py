from datetime import date
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone

from billing.models import Charge, ChargeItem, Service
from billing.services import recalculate_charge
from clinics.models import Clinic
from doctors.models import Doctor
from patients.models import Patient

from .models import Appointment, ServiceQueueTicket


def generate_doctor_queue_number(doctor: Doctor | int, queue_date: date = None) -> str:
    """Generate queue number for doctor on given date. Format: D{doctor_id}-{sequence}"""
    if queue_date is None:
        queue_date = timezone.localdate()
    
    if isinstance(doctor, int):
        try:
            doctor_obj = Doctor.objects.get(id=doctor)
            doctor_id = doctor_obj.id
        except Doctor.DoesNotExist:
            return ""
    else:
        doctor_id = doctor.id
    
    last_sequence = Appointment.objects.filter(
        doctor_id=doctor_id,
        scheduled_at__date=queue_date
    ).aggregate(last=Max("queue_number"))["last"]
    
    if last_sequence:
        try:
            parts = last_sequence.split("-")
            if len(parts) == 2 and parts[0].startswith(f"D{doctor_id}"):
                last_num = int(parts[1])
                next_num = last_num + 1
            else:
                next_num = 1
        except (ValueError, IndexError):
            next_num = 1
    else:
        next_num = 1
    
    return f"D{doctor_id}-{next_num:03d}"


def validate_appointment_datetime(scheduled_at):
    if scheduled_at < timezone.now():
        raise ValueError("Appointment time cannot be in the past")


def update_appointment_status(appointment: Appointment, status: str) -> Appointment:
    appointment.status = status
    appointment.save(update_fields=["status"])
    return appointment


def _resolve_patient_clinic(user, doctor: Doctor | int | None):
    if doctor is None:
        clinic = None
    elif isinstance(doctor, int):
        try:
            doctor_obj = Doctor.objects.get(id=doctor)
            clinic = doctor_obj.clinic
        except Doctor.DoesNotExist:
            clinic = None
    else:
        clinic = doctor.clinic
    
    clinic = clinic or getattr(user, "clinic", None)
    if clinic is None:
        clinic = Clinic.objects.filter(is_active=True).order_by("id").first()
    if clinic is None:
        clinic = Clinic.objects.order_by("id").first()
    if clinic is None:
        clinic = Clinic.objects.create(name="Asosiy klinika", is_active=True)
    return clinic


def _build_patient_birth_fields(birth_year: int | None):
    if not birth_year:
        return None, None
    today = timezone.localdate()
    if birth_year < 1900 or birth_year > today.year:
        raise ValueError("Tug'ilgan yil noto'g'ri.")
    return date(birth_year, 1, 1), max(0, today.year - birth_year)


def _create_charge_with_items(*, patient, appointment, notes: str, items: list[dict]):
    charge = Charge.objects.create(
        patient=patient,
        appointment=appointment,
        notes=notes,
    )
    for item in items:
        ChargeItem.objects.create(
            charge=charge,
            service=item.get("service"),
            description=item["description"],
            quantity=item.get("quantity", 1),
            unit_price=item["unit_price"],
            total_price=item["total_price"],
        )
    recalculate_charge(charge)
    return charge


def _queue_prefix_from_service_code(service: Service) -> str:
    code = (service.code or "").strip()
    for char in code:
        if char.isalpha():
            return char.upper()
    name = (service.name or "").strip()
    for char in name:
        if char.isalpha():
            return char.upper()
    return "X"


def _create_service_queue_ticket(*, user, patient: Patient, service: Service, appointment: Appointment | None, queue_date: date, referring_doctor: str = ""):
    prefix = _queue_prefix_from_service_code(service)

    for _ in range(5):
        last_sequence = (
            ServiceQueueTicket.objects.select_for_update()
            .filter(service=service, queue_date=queue_date)
            .aggregate(last=Max("sequence_number"))["last"]
            or 0
        )
        next_sequence = last_sequence + 1
        queue_code = f"{prefix}{next_sequence:03d}"
        try:
            return ServiceQueueTicket.objects.create(
                patient=patient,
                service=service,
                appointment=appointment,
                queue_date=queue_date,
                sequence_number=next_sequence,
                queue_code=queue_code,
                referring_doctor=referring_doctor,
                created_by=user,
            )
        except IntegrityError:
            continue
    raise ValueError("Navbat raqamini yaratib bo'lmadi. Qayta urinib ko'ring.")


@transaction.atomic
def register_patient_appointment_with_charges(
    *,
    user,
    first_name: str,
    last_name: str,
    gender: str | None,
    birth_year: int | None,
    phone: str | None,
    address: str | None,
    complaint: str | None,
    doctor: Doctor | int | None,
    services: list[Service],
    service_options_map: dict = None,
    referring_doctor: str = "",
):
    if service_options_map is None:
        service_options_map = {}

    if doctor is not None and isinstance(doctor, int):
        try:
            doctor = Doctor.objects.get(id=doctor)
        except Doctor.DoesNotExist:
            doctor = None

    queue_date = timezone.localdate()
    birth_date, age = _build_patient_birth_fields(birth_year)
    
    gender_value = gender or ""
    phone_value = (phone or "").strip()
    address_value = (address or "").strip()
    complaint_value = (complaint or "").strip()
    
    patient = Patient.objects.create(
        first_name=first_name.strip(),
        last_name=last_name.strip(),
        gender=gender_value,
        date_of_birth=birth_date,
        age=age,
        phone=phone_value,
        address=address_value,
        clinic=_resolve_patient_clinic(user, doctor),
        branch=getattr(user, "branch", None),
        created_by=user,
    )
    appointment = None
    if doctor is not None or referring_doctor:
        queue_num = generate_doctor_queue_number(doctor, queue_date) if doctor else ""
        appointment = Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            scheduled_at=timezone.now(),
            queue_number=queue_num,
            complaint=complaint_value,
            referring_doctor=referring_doctor.strip() if referring_doctor else "",
            created_by=user,
        )

    created_charge_ids: list[int] = []
    appointment_total = Decimal(doctor.appointment_price or 0) if doctor else Decimal("0.00")

    service_items = []
    service_total = Decimal("0.00")
    for service in services:
        options = service_options_map.get(service.id, [])
        if options:
            for opt in options:
                service_items.append({
                    "service": service,
                    "description": f"{service.name} - {opt.name}",
                    "quantity": 1,
                    "unit_price": Decimal(opt.price or 0),
                    "total_price": Decimal(opt.price or 0),
                })
                service_total += Decimal(opt.price or 0)
        else:
            service_items.append({
                "service": service,
                "description": service.name,
                "quantity": 1,
                "unit_price": Decimal(service.price or 0),
                "total_price": Decimal(service.price or 0),
            })
            service_total += Decimal(service.price or 0)

    if doctor is not None:
        appointment_charge = _create_charge_with_items(
            patient=patient,
            appointment=appointment,
            notes=complaint_value,
            items=[
                {
                    "description": f"Qabul: {doctor.user.get_full_name() or doctor.user.username}",
                    "quantity": 1,
                    "unit_price": appointment_total,
                    "total_price": appointment_total,
                }
            ],
        )
        created_charge_ids.append(appointment_charge.id)

    if service_items:
        service_charge = _create_charge_with_items(
            patient=patient,
            appointment=appointment,
            notes="Ro'yxatga olishdagi xizmatlar",
            items=service_items,
        )
        created_charge_ids.append(service_charge.id)

    queue_tickets = []
    for service in services:
        queue_tickets.append(
            _create_service_queue_ticket(
                user=user,
                patient=patient,
                service=service,
                appointment=appointment,
                queue_date=queue_date,
                referring_doctor=referring_doctor,
            )
        )

    grand_total = appointment_total + service_total
    patient_birth_year = patient.date_of_birth.year if patient.date_of_birth else None
    return {
        "patient_id": patient.id,
        "patient_birth_year": patient_birth_year,
        "appointment_id": appointment.id if appointment else None,
        "queue_number": appointment.queue_number if appointment else None,
        "doctor_name": doctor.user.get_full_name() if doctor else None,
        "created_charge_ids": created_charge_ids,
        "appointment_charge_total": appointment_total,
        "service_charge_total": service_total,
        "grand_total": grand_total,
        "service_queue_tickets": [
            {
                "id": item.id,
                "service_id": item.service_id,
                "service_name": item.service.name,
                "queue_code": item.queue_code,
                "queue_date": item.queue_date.isoformat(),
                "status": item.status,
                "patient_name": str(item.patient),
                "patient_birth_year": patient_birth_year,
            }
            for item in queue_tickets
        ],
    }


@transaction.atomic
def create_appointment_for_existing_patient(
    *,
    user,
    patient: Patient,
    doctor: Doctor | int | None,
    services: list[Service],
    service_options_map: dict = None,
    complaint: str = "",
    referring_doctor: str = "",
):
    if service_options_map is None:
        service_options_map = {}

    complaint_value = (complaint or "").strip()

    if doctor is not None and isinstance(doctor, int):
        try:
            doctor = Doctor.objects.get(id=doctor)
        except Doctor.DoesNotExist:
            doctor = None

    queue_date = timezone.localdate()
    
    appointment = None
    if doctor is not None:
        appointment = Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            scheduled_at=timezone.now(),
            complaint=complaint.strip() if complaint else "",
            queue_number=generate_doctor_queue_number(doctor, queue_date) if doctor else "",
            referring_doctor=referring_doctor.strip() if referring_doctor else "",
        )

    created_charge_ids: list[int] = []
    appointment_total = Decimal(doctor.appointment_price or 0) if doctor else Decimal("0.00")

    service_items = []
    service_total = Decimal("0.00")
    for service in services:
        options = service_options_map.get(service.id, [])
        if options:
            for opt in options:
                service_items.append({
                    "service": service,
                    "description": f"{service.name} - {opt.name}",
                    "quantity": 1,
                    "unit_price": Decimal(opt.price or 0),
                    "total_price": Decimal(opt.price or 0),
                })
                service_total += Decimal(opt.price or 0)
        else:
            service_items.append({
                "service": service,
                "description": service.name,
                "quantity": 1,
                "unit_price": Decimal(service.price or 0),
                "total_price": Decimal(service.price or 0),
            })
            service_total += Decimal(service.price or 0)

    if doctor is not None:
        appointment_charge = _create_charge_with_items(
            patient=patient,
            appointment=appointment,
            notes=complaint_value,
            items=[
                {
                    "description": f"Qabul: {doctor.user.get_full_name() or doctor.user.username}",
                    "quantity": 1,
                    "unit_price": appointment_total,
                    "total_price": appointment_total,
                }
            ],
        )
        created_charge_ids.append(appointment_charge.id)

    if service_items:
        service_charge = _create_charge_with_items(
            patient=patient,
            appointment=appointment,
            notes="Ro'yxatga olishdagi xizmatlar",
            items=service_items,
        )
        created_charge_ids.append(service_charge.id)

    queue_tickets = []
    for service in services:
        queue_tickets.append(
            _create_service_queue_ticket(
                user=user,
                patient=patient,
                service=service,
                appointment=appointment,
                queue_date=queue_date,
                referring_doctor=referring_doctor,
            )
        )

    grand_total = appointment_total + service_total
    doctor_name = ""
    if doctor and hasattr(doctor, 'user'):
        doctor_name = f"{doctor.user.first_name} {doctor.user.last_name}".strip()
    
    patient_birth_year = patient.date_of_birth.year if patient.date_of_birth else None
    
    return {
        "patient_id": patient.id,
        "patient_name": f"{patient.first_name} {patient.last_name}".strip(),
        "patient_birth_year": patient_birth_year,
        "appointment_id": appointment.id if appointment else None,
        "queue_number": appointment.queue_number if appointment else "",
        "doctor_name": doctor_name,
        "created_charge_ids": created_charge_ids,
        "appointment_charge_total": appointment_total,
        "service_charge_total": service_total,
        "grand_total": grand_total,
        "service_queue_tickets": [
            {
                "id": item.id,
                "service_id": item.service_id,
                "service_name": item.service.name,
                "queue_code": item.queue_code,
                "queue_date": item.queue_date.isoformat(),
                "status": item.status,
                "patient_name": str(item.patient),
                "patient_birth_year": patient_birth_year,
            }
            for item in queue_tickets
        ],
    }
