from django.contrib import admin
from .models import Appointment, ServiceQueueTicket, ReferringDoctor


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ["id", "patient", "doctor", "scheduled_at", "status"]
    list_filter = ["status", "scheduled_at"]
    search_fields = ["patient__first_name", "patient__last_name", "referring_doctor"]


@admin.register(ServiceQueueTicket)
class ServiceQueueTicketAdmin(admin.ModelAdmin):
    list_display = ["id", "patient", "service", "queue_date", "queue_code", "status"]
    list_filter = ["status", "queue_date"]
    search_fields = ["patient__first_name", "patient__last_name"]


@admin.register(ReferringDoctor)
class ReferringDoctorAdmin(admin.ModelAdmin):
    list_display = ["id", "full_name", "phone", "clinic_name", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["full_name", "clinic_name"]
