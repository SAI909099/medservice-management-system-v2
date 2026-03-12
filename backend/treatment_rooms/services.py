from decimal import Decimal

from rest_framework.exceptions import ValidationError

from .models import TreatmentArea


def _resolve_clinic_branch(user, clinic_id, branch_id):
    if user.is_superuser:
        return clinic_id, branch_id

    user_clinic_id = getattr(user, "clinic_id", None)
    user_branch_id = getattr(user, "branch_id", None)

    resolved_clinic_id = clinic_id or user_clinic_id
    if not resolved_clinic_id:
        raise ValidationError({"clinic": "Clinic required."})
    if user_clinic_id and resolved_clinic_id != user_clinic_id:
        raise ValidationError({"clinic": "Cross-clinic create is not allowed."})

    resolved_branch_id = branch_id if branch_id is not None else user_branch_id
    if user_branch_id and resolved_branch_id and resolved_branch_id != user_branch_id:
        raise ValidationError({"branch": "Cross-branch create is not allowed."})

    return resolved_clinic_id, resolved_branch_id


def prepare_area_payload(user, validated_data):
    clinic_id, branch_id = _resolve_clinic_branch(
        user,
        validated_data.get("clinic").id if validated_data.get("clinic") else None,
        validated_data.get("branch").id if validated_data.get("branch") else None,
    )
    validated_data["clinic_id"] = clinic_id
    validated_data["branch_id"] = branch_id
    validated_data.pop("clinic", None)
    validated_data.pop("branch", None)
    return validated_data


def prepare_room_payload(user, validated_data):
    if not validated_data.get("area"):
        raise ValidationError({"area": "Area (floor/apartment) is required."})

    area: TreatmentArea = validated_data["area"]
    clinic_id, branch_id = _resolve_clinic_branch(
        user,
        validated_data.get("clinic").id if validated_data.get("clinic") else area.clinic_id,
        validated_data.get("branch").id if validated_data.get("branch") else area.branch_id,
    )

    if area.clinic_id != clinic_id:
        raise ValidationError({"area": "Selected area belongs to a different clinic."})
    if branch_id and area.branch_id and area.branch_id != branch_id:
        raise ValidationError({"area": "Selected area belongs to a different branch."})

    daily_price = validated_data.get("daily_price")
    if daily_price is None:
        validated_data["daily_price"] = Decimal("0.00")
    elif daily_price < 0:
        raise ValidationError({"daily_price": "Daily price cannot be negative."})

    capacity = validated_data.get("capacity")
    if capacity is None:
        validated_data["capacity"] = 1
    elif capacity < 1:
        raise ValidationError({"capacity": "Capacity must be at least 1."})

    validated_data["clinic_id"] = clinic_id
    validated_data["branch_id"] = branch_id
    validated_data.pop("clinic", None)
    validated_data.pop("branch", None)
    return validated_data
