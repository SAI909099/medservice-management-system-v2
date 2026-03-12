from django.utils import timezone

from .models import Appointment


def validate_appointment_datetime(scheduled_at):
    if scheduled_at < timezone.now():
        raise ValueError("Appointment time cannot be in the past")


def update_appointment_status(appointment: Appointment, status: str) -> Appointment:
    appointment.status = status
    appointment.save(update_fields=["status"])
    return appointment
