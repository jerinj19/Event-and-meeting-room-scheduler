from django.contrib import admin

from .models import Room


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("name", "location", "capacity", "is_active", "created_by", "created_at")
    list_filter = ("is_active", "capacity", "created_at")
    search_fields = ("name", "location")
    ordering = ("name",)
