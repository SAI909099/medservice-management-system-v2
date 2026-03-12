from decimal import Decimal

from .models import Charge


def recalculate_charge(charge: Charge) -> Charge:
    total_amount = sum((item.total_price for item in charge.items.all()), Decimal("0.00"))
    charge.total_amount = total_amount
    if charge.paid_amount <= 0:
        charge.status = Charge.Status.UNPAID
    elif charge.paid_amount < charge.total_amount:
        charge.status = Charge.Status.PARTIAL
    else:
        charge.status = Charge.Status.PAID
    charge.save(update_fields=["total_amount", "status"])
    return charge
