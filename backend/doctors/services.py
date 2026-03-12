from accounts.models import Role

from .models import Doctor


def resolve_doctor_for_user(user):
    """
    Return a Doctor profile for the authenticated doctor user.
    If a doctor-role user is missing a profile, create it with safe defaults.
    """
    doctor = getattr(user, "doctor_profile", None)
    if doctor is not None:
        return doctor

    role_name = getattr(getattr(user, "role", None), "name", None)
    if role_name != Role.Name.DOCTOR:
        return None

    doctor, _ = Doctor.objects.get_or_create(
        user=user,
        defaults={
            "clinic": user.clinic,
            "branch": user.branch,
            "specialty": "Umumiy shifokor",
            "is_active": True,
        },
    )
    return doctor
