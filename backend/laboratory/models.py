from django.db import models


class LabService(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.name


class LabReferral(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="lab_referrals")
    doctor = models.ForeignKey("doctors.Doctor", on_delete=models.SET_NULL, null=True, blank=True, related_name="lab_referrals")
    appointment = models.ForeignKey("appointments.Appointment", on_delete=models.SET_NULL, null=True, blank=True, related_name="lab_referrals")
    service = models.ForeignKey(LabService, on_delete=models.CASCADE, related_name="referrals")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    result_text = models.TextField(blank=True)
    result_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.patient} - {self.service}"
