from django.db import models


class Patient(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=10, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.CharField(max_length=255, blank=True)
    passport_id = models.CharField(max_length=30, blank=True)
    notes = models.TextField(blank=True)
    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.CASCADE, related_name="patients")
    branch = models.ForeignKey("clinics.Branch", on_delete=models.SET_NULL, null=True, blank=True, related_name="patients")
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="created_patients")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
