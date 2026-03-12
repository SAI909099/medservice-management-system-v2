from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import Role
from doctors.services import resolve_doctor_for_user

User = get_user_model()


class DoctorServicesTests(TestCase):
    def setUp(self):
        self.doctor_role = Role.objects.create(name=Role.Name.DOCTOR)

    def test_resolve_doctor_for_user_creates_missing_profile_for_doctor_role(self):
        user = User.objects.create_user(username="doc-missing", password="pass1234", role=self.doctor_role)

        doctor = resolve_doctor_for_user(user)

        self.assertIsNotNone(doctor)
        self.assertEqual(doctor.user_id, user.id)
