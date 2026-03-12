from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import Role, UserPagePermission
from accounts.services import get_effective_pages_for_user

User = get_user_model()


class PagePermissionDefaultsTests(TestCase):
    def setUp(self):
        self.doctor_role = Role.objects.create(name=Role.Name.DOCTOR)

    def test_doctor_role_includes_doctors_page_by_default(self):
        user = User.objects.create_user(username="doctor1", password="pass1234", role=self.doctor_role)

        allowed = get_effective_pages_for_user(user)

        self.assertIn("doctors", allowed)

    def test_doctor_page_can_be_disabled_with_override(self):
        user = User.objects.create_user(username="doctor2", password="pass1234", role=self.doctor_role)
        UserPagePermission.objects.create(user=user, page_code="doctors", enabled=False)

        allowed = get_effective_pages_for_user(user)

        self.assertNotIn("doctors", allowed)
