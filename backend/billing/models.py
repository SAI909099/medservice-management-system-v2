from decimal import Decimal

from django.db import models


class Service(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.name


class Charge(models.Model):
    class Status(models.TextChoices):
        UNPAID = "unpaid", "Unpaid"
        PARTIAL = "partial", "Partial"
        PAID = "paid", "Paid"

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="charges")
    appointment = models.ForeignKey("appointments.Appointment", on_delete=models.SET_NULL, null=True, blank=True, related_name="charges")
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.UNPAID)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Charge #{self.id} - {self.patient}"


class ChargeItem(models.Model):
    charge = models.ForeignKey(Charge, on_delete=models.CASCADE, related_name="items")
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True, related_name="charge_items")
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:
        return f"{self.description} x {self.quantity}"


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        CARD = "card", "Card"
        INSURANCE = "insurance", "Insurance"
        TRANSFER = "transfer", "Transfer"

    charge = models.ForeignKey(Charge, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=Method.choices)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Receipt(models.Model):
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name="receipt")
    receipt_no = models.CharField(max_length=40, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.receipt_no
