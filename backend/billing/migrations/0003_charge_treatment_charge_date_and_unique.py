from decimal import Decimal

from django.db import migrations, models
from django.db.models import Count, Q, Sum


def backfill_treatment_charge_date_and_dedupe(apps, schema_editor):
    Charge = apps.get_model("billing", "Charge")
    ChargeItem = apps.get_model("billing", "ChargeItem")
    Payment = apps.get_model("billing", "Payment")

    # Backfill missing daily date for treatment charges from created_at date.
    for charge in Charge.objects.filter(treatment_referral_id__isnull=False).only("id", "created_at").iterator():
        Charge.objects.filter(id=charge.id).update(treatment_charge_date=charge.created_at.date())

    duplicate_groups = (
        Charge.objects.filter(treatment_referral_id__isnull=False, treatment_charge_date__isnull=False)
        .values("treatment_referral_id", "treatment_charge_date")
        .annotate(total=Count("id"))
        .filter(total__gt=1)
    )

    # Deterministic dedupe policy:
    # keep oldest charge, move items/payments to it, recalc totals/status, delete rest.
    for group in duplicate_groups.iterator():
        charges = list(
            Charge.objects.filter(
                treatment_referral_id=group["treatment_referral_id"],
                treatment_charge_date=group["treatment_charge_date"],
            ).order_by("created_at", "id")
        )
        if len(charges) <= 1:
            continue

        primary = charges[0]
        duplicate_ids = [item.id for item in charges[1:]]

        if duplicate_ids:
            ChargeItem.objects.filter(charge_id__in=duplicate_ids).update(charge_id=primary.id)
            Payment.objects.filter(charge_id__in=duplicate_ids).update(charge_id=primary.id)
            Charge.objects.filter(id__in=duplicate_ids).delete()

        total_amount = ChargeItem.objects.filter(charge_id=primary.id).aggregate(total=Sum("total_price"))["total"] or Decimal("0.00")
        paid_amount = Payment.objects.filter(charge_id=primary.id).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        if paid_amount <= 0:
            status = "unpaid"
        elif paid_amount < total_amount:
            status = "partial"
        else:
            status = "paid"
        Charge.objects.filter(id=primary.id).update(
            total_amount=total_amount,
            paid_amount=paid_amount,
            status=status,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("billing", "0002_charge_treatment_referral"),
    ]

    operations = [
        migrations.AddField(
            model_name="charge",
            name="treatment_charge_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.RunPython(
            backfill_treatment_charge_date_and_dedupe,
            migrations.RunPython.noop,
        ),
        migrations.AddConstraint(
            model_name="charge",
            constraint=models.UniqueConstraint(
                condition=Q(treatment_referral__isnull=False, treatment_charge_date__isnull=False),
                fields=("treatment_referral", "treatment_charge_date"),
                name="uniq_treatment_referral_daily_charge",
            ),
        ),
    ]
