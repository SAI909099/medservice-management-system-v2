from django.db import models
from django.db.models import UniqueConstraint


class Appointment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="appointments")
    doctor = models.ForeignKey("doctors.Doctor", on_delete=models.CASCADE, related_name="appointments")
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    complaint = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="appointments_created")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-scheduled_at"]

    def __str__(self) -> str:
        return f"{self.patient} -> {self.doctor}"


class ServiceQueueTicket(models.Model):
    class Status(models.TextChoices):
        WAITING = "waiting", "Waiting"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="service_queue_tickets")
    service = models.ForeignKey("billing.Service", on_delete=models.CASCADE, related_name="queue_tickets")
    appointment = models.ForeignKey("appointments.Appointment", on_delete=models.SET_NULL, null=True, blank=True, related_name="service_queue_tickets")
    queue_date = models.DateField()
    sequence_number = models.PositiveIntegerField()
    queue_code = models.CharField(max_length=16)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.WAITING)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="service_queue_tickets_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["queue_date", "sequence_number", "created_at"]
        constraints = [
            UniqueConstraint(
                fields=["service", "queue_date", "sequence_number"],
                name="uniq_service_queue_daily_sequence",
            )
        ]

    def __str__(self) -> str:
        return f"{self.service.name} {self.queue_code}"
