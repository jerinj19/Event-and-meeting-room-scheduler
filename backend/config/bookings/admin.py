from django.contrib import admin

from .models import Booking, TimeSlot


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "room",
        "user",
        "start_time",
        "end_time",
        "attendees_count",
        "status",
        "created_at",
    ]
    list_filter = ["status", "room", "start_time"]
    search_fields = [
        "title",
        "description",
        "user__first_name",
        "user__last_name",
        "user__email",
        "room__name",
    ]
    ordering = ["start_time"]
    date_hierarchy = "start_time"


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = [
        "formatted_label",
        "date",
        "start_time",
        "end_time",
        "period",
        "room",
        "is_active",
        "sort_order",
    ]
    list_filter = ["date", "period", "is_active", "room"]
    search_fields = ["label", "room__name"]
    ordering = ["start_time", "sort_order"]
    list_editable = ["is_active", "sort_order"]

