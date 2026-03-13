from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from clinics.models import Clinic
from patients.models import Patient
from treatment_rooms.models import TreatmentArea, TreatmentReferral, TreatmentRoom

from .models import Charge
from .services import create_daily_treatment_charge_for_referral, create_treatment_charges_for_referral_period


class TreatmentRoomDailyChargeTests(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(name="Clinic A")
        self.area = TreatmentArea.objects.create(clinic=self.clinic, area_type=TreatmentArea.AreaType.FLOOR, name="1")
        self.room = TreatmentRoom.objects.create(clinic=self.clinic, area=self.area, name="101", daily_price=100000, capacity=2)
        self.patient = Patient.objects.create(first_name="Ali", last_name="Valiyev", clinic=self.clinic)
        self.referral = TreatmentReferral.objects.create(
            patient=self.patient,
            room=self.room,
            service_name="Yotoq joylashuvi",
            status=TreatmentReferral.Status.IN_PROGRESS,
        )

    def test_daily_charge_created_once_per_day_for_referral(self):
        charge1, created1 = create_daily_treatment_charge_for_referral(self.referral)
        charge2, created2 = create_daily_treatment_charge_for_referral(self.referral)

        self.assertTrue(created1)
        self.assertFalse(created2)
        self.assertEqual(charge1.id, charge2.id)
        self.assertEqual(Charge.objects.filter(treatment_referral=self.referral).count(), 1)

    def test_backdated_assignment_generates_charge_for_each_day_until_today(self):
        start_date = timezone.localdate() - timedelta(days=3)

        stats = create_treatment_charges_for_referral_period(self.referral, start_date=start_date, end_date=timezone.localdate())

        self.assertEqual(stats["created"], 4)
        self.assertEqual(Charge.objects.filter(treatment_referral=self.referral).count(), 4)
