def prepare_expense_payload(user, validated_data, existing=None):
    from clinics.models import Clinic

    payload = dict(validated_data)

    clinic = payload.get("clinic") or (existing.clinic if existing and existing.clinic_id else None) or getattr(user, "clinic", None)
    branch = payload.get("branch")
    if branch is None and existing and existing.branch_id:
        branch = existing.branch
    if branch is None:
        branch = getattr(user, "branch", None)

    if clinic is None:
        clinic = Clinic.objects.filter(is_active=True).order_by("id").first()
    if clinic is None:
        clinic = Clinic.objects.order_by("id").first()
    if clinic is None:
        raise ValueError("clinic maydoni talab qilinadi.")

    payload["clinic"] = clinic
    payload["branch"] = branch
    if existing is None:
        payload["created_by"] = user
    return payload
