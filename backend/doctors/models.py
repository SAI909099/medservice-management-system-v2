from django.db import models


class Doctor(models.Model):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="doctor_profile")
    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.CASCADE, related_name="doctors", null=True, blank=True)
    branch = models.ForeignKey("clinics.Branch", on_delete=models.SET_NULL, null=True, blank=True, related_name="doctors")
    specialty = models.CharField(max_length=120)
    appointment_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    license_number = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"Dr. {self.user.get_full_name() or self.user.username}"


class DoctorSchedule(models.Model):
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="schedules")
    weekday = models.PositiveSmallIntegerField()  # 0 Monday ... 6 Sunday
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        unique_together = ("doctor", "weekday", "start_time", "end_time")

    def __str__(self) -> str:
        return f"{self.doctor} [{self.weekday}]"
