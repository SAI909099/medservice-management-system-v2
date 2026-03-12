from django.test import TestCase

from rest_framework.exceptions import ValidationError

from accounts.models import Role, User
from clinics.models import Clinic
from patients.models import Patient
from treatment_rooms.models import TreatmentArea, TreatmentReferral, TreatmentRoom
from treatment_rooms.selectors import get_treatment_room_queryset
from treatment_rooms.serializers import TreatmentRoomSerializer
from treatment_rooms.services import prepare_room_payload


class TreatmentRoomServicesTests(TestCase):
    def setUp(self):
        self.role = Role.objects.create(name=Role.Name.ADMIN)
        self.clinic_a = Clinic.objects.create(name="Clinic A")
        self.clinic_b = Clinic.objects.create(name="Clinic B")
        self.user = User.objects.create_user(username="admin1", password="pass1234", role=self.role, clinic=self.clinic_a)
        self.area = TreatmentArea.objects.create(clinic=self.clinic_a, area_type=TreatmentArea.AreaType.FLOOR, name="1")

    def test_prepare_room_payload_requires_area(self):
        with self.assertRaises(ValidationError):
            prepare_room_payload(self.user, {"name": "101"})

    def test_prepare_room_payload_blocks_cross_clinic_area(self):
        area_b = TreatmentArea.objects.create(clinic=self.clinic_b, area_type=TreatmentArea.AreaType.FLOOR, name="2")
        with self.assertRaises(ValidationError):
            prepare_room_payload(self.user, {"name": "201", "area": area_b, "daily_price": 100})

    def test_prepare_room_payload_blocks_negative_daily_price(self):
        with self.assertRaises(ValidationError):
            prepare_room_payload(self.user, {"name": "101", "area": self.area, "daily_price": -1})

    def test_prepare_room_payload_blocks_invalid_capacity(self):
        with self.assertRaises(ValidationError):
            prepare_room_payload(self.user, {"name": "101", "area": self.area, "daily_price": 100, "capacity": 0})


class TreatmentRoomOccupancyTests(TestCase):
    def setUp(self):
        self.role = Role.objects.create(name=Role.Name.ADMIN)
        self.clinic = Clinic.objects.create(name="Clinic A")
        self.user = User.objects.create_user(username="admin2", password="pass1234", role=self.role, clinic=self.clinic)
        self.area = TreatmentArea.objects.create(clinic=self.clinic, area_type=TreatmentArea.AreaType.FLOOR, name="3")

    def test_room_serializer_returns_free_partial_and_patient_names(self):
        room_free = TreatmentRoom.objects.create(clinic=self.clinic, area=self.area, name="301", capacity=2, daily_price=100)
        room_partial = TreatmentRoom.objects.create(clinic=self.clinic, area=self.area, name="302", capacity=2, daily_price=150)

        patient = Patient.objects.create(first_name="Ali", last_name="Karimov", clinic=self.clinic)
        TreatmentReferral.objects.create(patient=patient, room=room_partial, service_name="Muolaja", status=TreatmentReferral.Status.IN_PROGRESS)
        TreatmentReferral.objects.create(patient=patient, room=room_partial, service_name="Muolaja 2", status=TreatmentReferral.Status.COMPLETED)

        queryset = get_treatment_room_queryset(self.user)
        rooms_by_name = {room.name: room for room in queryset}

        free_data = TreatmentRoomSerializer(rooms_by_name["301"]).data
        partial_data = TreatmentRoomSerializer(rooms_by_name["302"]).data

        self.assertEqual(free_data["occupancy_status"], "free")
        self.assertEqual(free_data["occupied_count"], 0)

        self.assertEqual(partial_data["occupancy_status"], "partial")
        self.assertEqual(partial_data["occupied_count"], 1)
        self.assertEqual(len(partial_data["current_patients"]), 1)
        self.assertEqual(partial_data["current_patients"][0]["full_name"], "Ali Karimov")
