from django.contrib import admin

from .models import TreatmentArea, TreatmentReferral, TreatmentRoom


@admin.register(TreatmentArea)
class TreatmentAreaAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "area_type", "clinic", "branch", "is_active")
    list_filter = ("area_type", "clinic", "branch", "is_active")
    search_fields = ("name",)


@admin.register(TreatmentRoom)
class TreatmentRoomAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "area", "daily_price", "clinic", "branch", "is_active")
    list_filter = ("clinic", "branch", "is_active", "area__area_type")
    search_fields = ("name", "area__name")


@admin.register(TreatmentReferral)
class TreatmentReferralAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "room", "service_name", "status", "created_at")
    list_filter = ("status", "room", "created_at")
    search_fields = ("service_name", "patient__first_name", "patient__last_name")
