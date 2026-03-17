from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from clinics.models import Clinic
from doctors.models import Doctor
from billing.models import Charge, Service
from patients.models import Patient
from appointments.models import Appointment, ServiceQueueTicket


class AppointmentRegisterEndpointTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="root_register",
            email="root_register@example.com",
            password="secret123",
        )
        self.client.force_authenticate(self.user)

        self.clinic = Clinic.objects.create(name="Clinic Register")
        self.doctor_user = User.objects.create_user(username="doctor_register", password="secret123")
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            clinic=self.clinic,
            specialty="Terapevt",
            appointment_price=120000,
            is_active=True,
        )
        self.service1 = Service.objects.create(code="MRT-1", name="MRT", category="Diagnostika", price=200000, is_active=True)
        self.service2 = Service.objects.create(code="UZI-1", name="UZI", category="Diagnostika", price=150000, is_active=True)
        self.inactive_service = Service.objects.create(
            code="OFF-1",
            name="Nofaol",
            category="Diagnostika",
            price=50000,
            is_active=False,
        )

    def test_register_creates_patient_appointment_and_two_charges(self):
        payload = {
            "first_name": "Ali",
            "last_name": "Valiyev",
            "gender": "erkak",
            "birth_year": 1998,
            "phone": "+998900000001",
            "address": "Toshkent",
            "complaint": "Bosh og'rig'i",
            "doctor": self.doctor.id,
            "service_ids": [self.service1.id, self.service2.id],
        }

        response = self.client.post("/api/appointments/register/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Patient.objects.count(), 1)
        self.assertEqual(Charge.objects.count(), 2)
        self.assertEqual(len(response.data["created_charge_ids"]), 2)
        self.assertEqual(str(response.data["appointment_charge_total"]), "120000.00")
        self.assertEqual(str(response.data["service_charge_total"]), "350000.00")
        self.assertEqual(str(response.data["grand_total"]), "470000.00")
        self.assertEqual(len(response.data["service_queue_tickets"]), 2)
        self.assertEqual(response.data["service_queue_tickets"][0]["queue_code"], "M001")
        self.assertEqual(response.data["service_queue_tickets"][1]["queue_code"], "U001")

    def test_register_with_empty_services_creates_only_appointment_charge(self):
        payload = {
            "first_name": "Vali",
            "last_name": "Aliyev",
            "gender": "erkak",
            "doctor": self.doctor.id,
            "phone": "+998900000002",
            "service_ids": [],
        }

        response = self.client.post("/api/appointments/register/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Charge.objects.count(), 1)
        self.assertEqual(Appointment.objects.count(), 1)
        self.assertEqual(len(response.data["created_charge_ids"]), 1)
        self.assertEqual(str(response.data["service_charge_total"]), "0.00")

    def test_register_with_services_without_doctor_creates_service_charge_only(self):
        payload = {
            "first_name": "Asal",
            "last_name": "Qosimova",
            "gender": "ayol",
            "phone": "+998900000004",
            "service_ids": [self.service1.id],
        }

        response = self.client.post("/api/appointments/register/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Patient.objects.count(), 1)
        self.assertEqual(Appointment.objects.count(), 0)
        self.assertEqual(Charge.objects.count(), 1)
        self.assertEqual(str(response.data["appointment_charge_total"]), "0.00")
        self.assertEqual(str(response.data["service_charge_total"]), "200000.00")
        self.assertIsNone(response.data["appointment_id"])
        self.assertEqual(response.data["service_queue_tickets"][0]["queue_code"], "M001")

    def test_register_with_invalid_or_inactive_service_rolls_back(self):
        payload = {
            "first_name": "Sardor",
            "last_name": "Qodirov",
            "gender": "erkak",
            "doctor": self.doctor.id,
            "phone": "+998900000003",
            "service_ids": [self.inactive_service.id, 999999],
        }

        response = self.client.post("/api/appointments/register/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Patient.objects.count(), 0)
        self.assertEqual(Charge.objects.count(), 0)

    def test_register_without_doctor_and_without_services_returns_400(self):
        payload = {
            "first_name": "No",
            "last_name": "Selection",
            "gender": "erkak",
            "phone": "+998900000005",
            "service_ids": [],
        }
        response = self.client.post("/api/appointments/register/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Patient.objects.count(), 0)
        self.assertEqual(Charge.objects.count(), 0)

    def test_staff_options_returns_only_active_services(self):
        response = self.client.get("/api/appointments/staff-options/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        service_ids = {item["id"] for item in response.data["services"]}
        self.assertIn(self.service1.id, service_ids)
        self.assertIn(self.service2.id, service_ids)
        self.assertNotIn(self.inactive_service.id, service_ids)

    def test_daily_reset_starts_from_001_for_each_service(self):
        yesterday = timezone.localdate() - timedelta(days=1)
        patient = Patient.objects.create(first_name="Yesterday", last_name="Patient", clinic=self.clinic)
        ServiceQueueTicket.objects.create(
            patient=patient,
            service=self.service1,
            queue_date=yesterday,
            sequence_number=4,
            queue_code="M004",
            created_by=self.user,
        )

        payload = {
            "first_name": "Today",
            "last_name": "Patient",
            "gender": "erkak",
            "phone": "+998900000006",
            "service_ids": [self.service1.id],
        }
        response = self.client.post("/api/appointments/register/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["service_queue_tickets"][0]["queue_code"], "M001")

    def test_service_queue_endpoint_filters(self):
        p1 = {
            "first_name": "Ali",
            "last_name": "One",
            "gender": "erkak",
            "phone": "+998900000007",
            "service_ids": [self.service1.id],
        }
        p2 = {
            "first_name": "Vali",
            "last_name": "Two",
            "gender": "erkak",
            "phone": "+998900000008",
            "service_ids": [self.service2.id],
        }
        self.client.post("/api/appointments/register/", p1, format="json")
        self.client.post("/api/appointments/register/", p2, format="json")

        response = self.client.get(f"/api/appointments/service-queue/?service_id={self.service1.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data["results"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["service"], self.service1.id)
