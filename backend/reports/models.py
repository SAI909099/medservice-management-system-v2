from django.db import models
from django.utils import timezone


class Expense(models.Model):
    class Source(models.TextChoices):
        ACCOUNTANT = "accountant", "Accountant"
        CASH_REGISTER = "cash_register", "Cash Register"

    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Cash"
        CARD = "card", "Card"
        TRANSFER = "transfer", "Transfer"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.CASCADE, related_name="expenses")
    branch = models.ForeignKey("clinics.Branch", on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses")
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.ACCOUNTANT)
    category = models.CharField(max_length=100, blank=True)
    description = models.CharField(max_length=255)
    note = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH, blank=True)
    spent_at = models.DateField(default=timezone.localdate)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses_created")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-spent_at", "-id"]

    def __str__(self) -> str:
        return f"{self.description} ({self.amount})"
