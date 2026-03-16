from datetime import timedelta
from datetime import datetime
from io import StringIO

from django.core.management import call_command
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.test.utils import override_settings
from django.utils import timezone
from unittest.mock import patch

from clinics.models import Clinic
from patients.models import Patient
from treatment_rooms.models import TreatmentArea, TreatmentReferral, TreatmentRoom

from .models import Charge
from .selectors import get_patient_ledger_rows, get_treatment_room_patient_rows
from .services import (
    apply_patient_payment,
    apply_treatment_patient_payment,
    create_daily_treatment_charge_for_referral,
    create_daily_treatment_room_charges,
    create_interval_treatment_room_charges,
    create_treatment_charges_for_referral_period,
)


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
        self.assertEqual(charge1.treatment_charge_date, timezone.localdate())

    def test_backdated_assignment_generates_charge_for_each_day_until_today(self):
        start_date = timezone.localdate() - timedelta(days=3)

        stats = create_treatment_charges_for_referral_period(self.referral, start_date=start_date, end_date=timezone.localdate())

        self.assertEqual(stats["created"], 4)
        self.assertEqual(Charge.objects.filter(treatment_referral=self.referral).count(), 4)

    def test_daily_generation_catchup_fills_missing_days(self):
        today = timezone.localdate()
        referral_start = today - timedelta(days=3)
        referral_created_dt = timezone.make_aware(datetime.combine(referral_start, datetime.min.time()))
        TreatmentReferral.objects.filter(id=self.referral.id).update(created_at=referral_created_dt)
        self.referral.refresh_from_db()

        create_daily_treatment_charge_for_referral(self.referral, for_date=today - timedelta(days=2))
        stats = create_daily_treatment_room_charges(for_date=today)

        self.assertEqual(stats["created"], 2)
        self.assertEqual(
            Charge.objects.filter(treatment_referral=self.referral, treatment_charge_date__isnull=False).count(),
            3,
        )


class TreatmentDailyCommandScheduleTests(TestCase):
    @override_settings(TREATMENT_DAILY_CHARGE_ENABLED=True, TREATMENT_DAILY_CHARGE_HOUR=11, TREATMENT_DAILY_CHARGE_MINUTE=59)
    @patch("billing.management.commands.run_treatment_daily_charge.create_daily_treatment_room_charges")
    @patch("billing.management.commands.run_treatment_daily_charge.timezone.localtime")
    def test_command_skips_before_configured_time(self, localtime_mock, generate_mock):
        localtime_mock.return_value = timezone.make_aware(datetime(2026, 3, 15, 11, 58))
        out = StringIO()
        call_command("run_treatment_daily_charge", stdout=out)
        self.assertFalse(generate_mock.called)

    @override_settings(TREATMENT_DAILY_CHARGE_ENABLED=True, TREATMENT_DAILY_CHARGE_HOUR=11, TREATMENT_DAILY_CHARGE_MINUTE=59)
    @patch("billing.management.commands.run_treatment_daily_charge.create_daily_treatment_room_charges")
    @patch("billing.management.commands.run_treatment_daily_charge.timezone.localtime")
    def test_command_runs_at_or_after_configured_time(self, localtime_mock, generate_mock):
        localtime_mock.return_value = timezone.make_aware(datetime(2026, 3, 15, 12, 1))
        generate_mock.return_value = {"date": "2026-03-15", "created": 2, "existing": 0}
        out = StringIO()
        call_command("run_treatment_daily_charge", stdout=out)
        self.assertTrue(generate_mock.called)


class TreatmentIntervalChargeTests(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(name="Clinic B")
        self.area = TreatmentArea.objects.create(clinic=self.clinic, area_type=TreatmentArea.AreaType.FLOOR, name="2")
        self.room = TreatmentRoom.objects.create(clinic=self.clinic, area=self.area, name="201", daily_price=100000, capacity=2)
        self.patient = Patient.objects.create(first_name="Vali", last_name="Aliyev", clinic=self.clinic)
        self.referral = TreatmentReferral.objects.create(
            patient=self.patient,
            room=self.room,
            service_name="Yotoq joylashuvi",
            status=TreatmentReferral.Status.IN_PROGRESS,
        )

    def test_interval_charge_grows_every_minute(self):
        t1 = timezone.make_aware(datetime(2026, 3, 16, 10, 0, 0))
        t2 = timezone.make_aware(datetime(2026, 3, 16, 10, 0, 30))
        t3 = timezone.make_aware(datetime(2026, 3, 16, 10, 1, 1))

        s1 = create_interval_treatment_room_charges(interval_minutes=1, for_datetime=t1)
        s2 = create_interval_treatment_room_charges(interval_minutes=1, for_datetime=t2)
        s3 = create_interval_treatment_room_charges(interval_minutes=1, for_datetime=t3)

        self.assertEqual(s1["created"], 1)
        self.assertEqual(s2["created"], 0)
        self.assertEqual(s3["created"], 1)

        charges = Charge.objects.filter(treatment_referral=self.referral).order_by("created_at")
        self.assertEqual(charges.count(), 2)
        self.assertEqual(charges[0].total_amount, 100000)
        self.assertEqual(charges[1].total_amount, 100000)


class BillingScopeSeparationTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_superuser(username="root_scope", email="root@example.com", password="secret123")
        self.clinic = Clinic.objects.create(name="Clinic C")
        self.area = TreatmentArea.objects.create(clinic=self.clinic, area_type=TreatmentArea.AreaType.FLOOR, name="3")
        self.room = TreatmentRoom.objects.create(clinic=self.clinic, area=self.area, name="301", daily_price=100000, capacity=2)
        self.patient = Patient.objects.create(first_name="Sardor", last_name="Nur", clinic=self.clinic)
        self.referral = TreatmentReferral.objects.create(
            patient=self.patient,
            room=self.room,
            service_name="Yotoq joylashuvi",
            status=TreatmentReferral.Status.IN_PROGRESS,
        )

        self.treatment_charge = Charge.objects.create(
            patient=self.patient,
            treatment_referral=self.referral,
            treatment_charge_date=timezone.localdate(),
            total_amount=100000,
            paid_amount=0,
        )
        self.normal_charge = Charge.objects.create(
            patient=self.patient,
            total_amount=50000,
            paid_amount=0,
        )

    def test_patient_ledger_excludes_treatment_by_default(self):
        rows = get_patient_ledger_rows(user=self.user, include_treatment=False)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["total_amount"], 50000)

    def test_patient_ledger_includes_treatment_when_enabled(self):
        rows = get_patient_ledger_rows(user=self.user, include_treatment=True)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["total_amount"], 150000)

    def test_treatment_state_left_when_no_active_referral(self):
        TreatmentReferral.objects.filter(id=self.referral.id).update(status=TreatmentReferral.Status.COMPLETED)
        rows = get_treatment_room_patient_rows(
            user=self.user,
            treatment_state="left",
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["treatment_state"], "left")

    def test_treatment_state_active_priority_when_any_active(self):
        TreatmentReferral.objects.create(
            patient=self.patient,
            room=self.room,
            service_name="Yotoq 2",
            status=TreatmentReferral.Status.COMPLETED,
        )
        rows = get_treatment_room_patient_rows(
            user=self.user,
            treatment_state="active",
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["treatment_state"], "active")


class PaymentReceiptPayloadTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_superuser(username="root_receipt", email="root_receipt@example.com", password="secret123")
        self.clinic = Clinic.objects.create(name="Clinic D")
        self.area = TreatmentArea.objects.create(clinic=self.clinic, area_type=TreatmentArea.AreaType.FLOOR, name="4")
        self.room = TreatmentRoom.objects.create(clinic=self.clinic, area=self.area, name="401", daily_price=100000, capacity=2)
        self.patient = Patient.objects.create(first_name="Temur", last_name="Xolmatov", clinic=self.clinic)
        self.referral = TreatmentReferral.objects.create(
            patient=self.patient,
            room=self.room,
            service_name="Yotoq joylashuvi",
            status=TreatmentReferral.Status.IN_PROGRESS,
        )

    def test_apply_patient_payment_includes_receipt_allocation_payload(self):
        Charge.objects.create(patient=self.patient, total_amount=60000, paid_amount=0)
        Charge.objects.create(patient=self.patient, total_amount=50000, paid_amount=0)

        result = apply_patient_payment(
            user=self.user,
            patient_id=self.patient.id,
            amount=70000,
            payment_method="cash",
            note="test",
        )

        self.assertEqual(result["entered_amount"], 70000)
        self.assertEqual(result["applied_amount"], 70000)
        self.assertEqual(len(result["payments"]), 2)
        applied_sum = sum(item["applied_amount"] for item in result["payments"])
        self.assertEqual(applied_sum, result["applied_amount"])
        self.assertTrue(all(item["receipt_no"].startswith("RCP-") for item in result["payments"]))

    def test_apply_treatment_patient_payment_uses_same_payload_shape(self):
        Charge.objects.create(
            patient=self.patient,
            treatment_referral=self.referral,
            treatment_charge_date=timezone.localdate(),
            total_amount=100000,
            paid_amount=0,
        )

        result = apply_treatment_patient_payment(
            user=self.user,
            patient_id=self.patient.id,
            amount=50000,
            payment_method="cash",
            note="test",
        )

        self.assertEqual(result["entered_amount"], 50000)
        self.assertEqual(result["applied_amount"], 50000)
        self.assertEqual(len(result["payments"]), 1)
        self.assertEqual(result["payments"][0]["charge_source"], "yotoq")
