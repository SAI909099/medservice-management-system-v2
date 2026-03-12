from django.contrib.auth.models import AbstractUser
from django.db import models

from .page_permissions import PAGE_PERMISSIONS


class Role(models.Model):
    class Name(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super Admin"
        ADMIN = "admin", "Admin"
        REGISTRATOR = "registrator", "Registrator"
        CASHIER = "cashier", "Cashier"
        DOCTOR = "doctor", "Doctor"
        LAB_STAFF = "lab_staff", "Lab Staff"
        TREATMENT_STAFF = "treatment_staff", "Treatment Room Staff"

    name = models.CharField(max_length=40, choices=Name.choices, unique=True)
    description = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:
        return self.get_name_display()


class User(AbstractUser):
    role = models.ForeignKey(Role, null=True, blank=True, on_delete=models.SET_NULL, related_name="users")
    phone = models.CharField(max_length=20, blank=True)
    clinic = models.ForeignKey("clinics.Clinic", null=True, blank=True, on_delete=models.SET_NULL, related_name="users")
    branch = models.ForeignKey("clinics.Branch", null=True, blank=True, on_delete=models.SET_NULL, related_name="users")

    def __str__(self) -> str:
        return self.username


class UserPagePermission(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="page_permissions")
    page_code = models.CharField(max_length=50, choices=PAGE_PERMISSIONS)
    enabled = models.BooleanField(default=True)

    class Meta:
        unique_together = ("user", "page_code")

    def __str__(self) -> str:
        return f"{self.user.username} | {self.page_code}={self.enabled}"
