from django.db import models


class TreatmentArea(models.Model):
    class AreaType(models.TextChoices):
        FLOOR = "floor", "Floor"
        APARTMENT = "apartment", "Apartment"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.CASCADE, related_name="treatment_areas")
    branch = models.ForeignKey("clinics.Branch", on_delete=models.SET_NULL, null=True, blank=True, related_name="treatment_areas")
    area_type = models.CharField(max_length=20, choices=AreaType.choices, default=AreaType.FLOOR)
    name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("clinic", "area_type", "name")

    def __str__(self) -> str:
        return f"{self.get_area_type_display()}: {self.name}"


class TreatmentRoom(models.Model):
    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.CASCADE, related_name="treatment_rooms")
    branch = models.ForeignKey("clinics.Branch", on_delete=models.SET_NULL, null=True, blank=True, related_name="treatment_rooms")
    area = models.ForeignKey(TreatmentArea, on_delete=models.SET_NULL, null=True, blank=True, related_name="rooms")
    name = models.CharField(max_length=120)
    capacity = models.PositiveIntegerField(default=1)
    daily_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("clinic", "area", "name")

    def __str__(self) -> str:
        return self.name


class TreatmentReferral(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="treatment_referrals")
    doctor = models.ForeignKey("doctors.Doctor", on_delete=models.SET_NULL, null=True, blank=True, related_name="treatment_referrals")
    room = models.ForeignKey(TreatmentRoom, on_delete=models.CASCADE, related_name="referrals")
    service_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.patient} - {self.service_name}"
