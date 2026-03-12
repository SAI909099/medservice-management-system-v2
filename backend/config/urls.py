from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter

from appointments.views import AppointmentViewSet
from billing.views import ChargeViewSet, PaymentViewSet, ReceiptView, ServiceViewSet
from clinics.views import BranchViewSet, ClinicViewSet
from doctors.views import DoctorPricingViewSet, DoctorScheduleViewSet, DoctorViewSet
from laboratory.views import LabReferralViewSet, LabServiceViewSet
from patients.views import PatientViewSet
from reports.views import ReportsView
from treatment_rooms.views import TreatmentAreaViewSet, TreatmentReferralViewSet, TreatmentRoomViewSet

router = DefaultRouter()
router.register(r"clinics", ClinicViewSet, basename="clinic")
router.register(r"branches", BranchViewSet, basename="branch")
router.register(r"patients", PatientViewSet, basename="patient")
router.register(r"doctors", DoctorViewSet, basename="doctor")
router.register(r"doctor-prices", DoctorPricingViewSet, basename="doctor-prices")
router.register(r"doctor-schedules", DoctorScheduleViewSet, basename="doctor-schedule")
router.register(r"appointments", AppointmentViewSet, basename="appointment")
router.register(r"lab-services", LabServiceViewSet, basename="lab-service")
router.register(r"lab-referrals", LabReferralViewSet, basename="lab-referral")
router.register(r"treatment-rooms", TreatmentRoomViewSet, basename="treatment-room")
router.register(r"treatment-areas", TreatmentAreaViewSet, basename="treatment-area")
router.register(r"treatment-referrals", TreatmentReferralViewSet, basename="treatment-referral")
router.register(r"charges", ChargeViewSet, basename="charge")
router.register(r"payments", PaymentViewSet, basename="payment")
router.register(r"services", ServiceViewSet, basename="service")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/auth/", include("accounts.urls")),
    path("api/reports/", ReportsView.as_view(), name="reports"),
    path("api/receipts/<int:payment_id>/", ReceiptView.as_view(), name="receipt"),
    path("api/", include(router.urls)),
]
