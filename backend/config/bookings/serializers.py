from datetime import time, timedelta

from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.exceptions import APIException
from rooms.models import Room

from .models import Booking, TimeSlot


class BookingConflictException(APIException):
    """
    HTTP 409 Conflict exception returned when an overlapping reservation exists.
    Maintains the project's standard error envelope.
    """

    status_code = status.HTTP_409_CONFLICT
    default_code = "BOOKING_CONFLICT"

    def __init__(self, detail=None, code=None, conflicts=None):
        conflict_list = conflicts or []
        if detail is None:
            payload = {
                "error": {
                    "code": code or self.default_code,
                    "message": "The selected room is already booked for the requested time slot.",
                    "details": {"conflicts": conflict_list},
                }
            }
        elif isinstance(detail, dict) and "error" in detail:
            payload = detail
        else:
            payload = {
                "error": {
                    "code": code or self.default_code,
                    "message": str(detail),
                    "details": {"conflicts": conflict_list},
                }
            }
        super().__init__(detail=payload, code=code)


class BookingSerializer(serializers.ModelSerializer):
    """
    Serializer for the Booking model.
    Handles booking creation, serialization, capacity checking,
    and server-side overlap detection returning HTTP 409 on conflict.
    """

    room_name = serializers.ReadOnlyField(source="room.name")
    room_location = serializers.ReadOnlyField(source="room.location")
    room_capacity = serializers.ReadOnlyField(source="room.capacity")
    room_image = serializers.SerializerMethodField()
    user_email = serializers.ReadOnlyField(source="user.email")
    user_name = serializers.ReadOnlyField(source="user.full_name")
    session = serializers.SerializerMethodField()
    time_slot_label = serializers.SerializerMethodField()

    def get_room_image(self, obj):
        if obj.room and obj.room.image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.room.image.url)
            return obj.room.image.url
        return None

    def get_session(self, obj):
        if not obj.start_time:
            return "morning"
        local_dt = timezone.localtime(obj.start_time)
        t = local_dt.time()
        if t < time(12, 0):
            return "morning"
        elif t < time(17, 0):
            return "afternoon"
        return "evening"

    def get_time_slot_label(self, obj):
        if not obj.start_time or not obj.end_time:
            return ""
        local_start = timezone.localtime(obj.start_time)
        local_end = timezone.localtime(obj.end_time)
        return f"{local_start.strftime('%I:%M %p')} – {local_end.strftime('%I:%M %p')}".replace(" 0", " ")

    class Meta:
        model = Booking
        fields = [
            "id",
            "room",
            "room_name",
            "room_location",
            "room_capacity",
            "room_image",
            "user",
            "user_email",
            "user_name",
            "title",
            "description",
            "start_time",
            "end_time",
            "session",
            "time_slot_label",
            "attendees_count",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "user_email",
            "user_name",
            "room_name",
            "room_location",
            "room_capacity",
            "room_image",
            "session",
            "time_slot_label",
            "status",
            "created_at",
            "updated_at",
        ]

    def validate_title(self, value):
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Booking title cannot be blank.")
        return stripped

    def validate_attendees_count(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Attendees count must be greater than 0.")
        return value

    def validate(self, attrs):
        room = attrs.get("room") or (self.instance.room if self.instance else None)
        start_time = attrs.get("start_time") or (self.instance.start_time if self.instance else None)
        end_time = attrs.get("end_time") or (self.instance.end_time if self.instance else None)
        attendees_count = attrs.get("attendees_count") or (self.instance.attendees_count if self.instance else 1)

        # 1. Start and End time ordering
        if start_time and end_time:
            if end_time <= start_time:
                raise serializers.ValidationError({"end_time": "End time must be strictly after start time."})

        # 2. Prevent creating bookings in the past (allow 5-minute latency tolerance)
        if not self.instance and start_time:
            grace_period = timezone.now() - timedelta(minutes=5)
            if start_time < grace_period:
                raise serializers.ValidationError({"start_time": "Cannot book a time slot in the past."})

        # 3. Room active check
        if room and not room.is_active:
            raise serializers.ValidationError({
                "room": f"Room '{room.name}' is currently inactive and cannot be scheduled."
            })

        # 4. Room capacity check
        if room and attendees_count:
            if attendees_count > room.capacity:
                raise serializers.ValidationError({
                    "attendees_count": (
                        f"Attendees count ({attendees_count}) exceeds room capacity ({room.capacity})."
                    )
                })

        # 5. Overlap detection (excluding CANCELLED bookings)
        if room and start_time and end_time:
            conflicts = Booking.objects.filter(
                room=room,
                status=Booking.STATUS_CONFIRMED,
                start_time__lt=end_time,
                end_time__gt=start_time,
            )
            if self.instance:
                conflicts = conflicts.exclude(pk=self.instance.pk)

            if conflicts.exists():
                conflict_details = [
                    {
                        "id": str(c.id),
                        "title": c.title,
                        "start_time": c.start_time.isoformat(),
                        "end_time": c.end_time.isoformat(),
                        "booked_by": c.user.email,
                    }
                    for c in conflicts
                ]
                raise BookingConflictException(
                    conflicts=conflict_details,
                    detail={
                        "error": {
                            "code": "BOOKING_CONFLICT",
                            "message": (
                                f"Conflict detected: Room '{room.name}' is already booked "
                                f"for the requested time slot."
                            ),
                            "details": {
                                "room_id": str(room.id),
                                "room_name": room.name,
                                "conflicts": conflict_details,
                            },
                        }
                    },
                )

        return attrs


class CheckAvailabilitySerializer(serializers.Serializer):
    """
    Serializer for validating query parameters in /api/bookings/check-availability/.
    """

    room_id = serializers.UUIDField(required=True)
    start_time = serializers.DateTimeField(required=True)
    end_time = serializers.DateTimeField(required=True)

    def validate(self, attrs):
        start_time = attrs["start_time"]
        end_time = attrs["end_time"]

        if end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})

        try:
            attrs["room"] = Room.objects.get(id=attrs["room_id"])
        except Room.DoesNotExist:
            raise serializers.ValidationError({"room_id": "Specified room does not exist."})

        return attrs


class TimeSlotSerializer(serializers.ModelSerializer):
    """
    Serializer for managing TimeSlot entities dynamically.
    Provides formatted start/end strings, calculated duration, room name,
    and validates logical time ordering.
    """

    start = serializers.SerializerMethodField()
    end = serializers.SerializerMethodField()
    duration = serializers.ReadOnlyField(source="duration_label")
    duration_minutes = serializers.ReadOnlyField()
    formatted_label = serializers.ReadOnlyField()
    room_name = serializers.ReadOnlyField(source="room.name")
    is_recurring = serializers.ReadOnlyField()

    class Meta:
        model = TimeSlot
        fields = [
            "id",
            "label",
            "date",
            "is_recurring",
            "start_time",
            "end_time",
            "start",
            "end",
            "period",
            "duration",
            "duration_minutes",
            "formatted_label",
            "room",
            "room_name",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        ]

    def get_start(self, obj):
        return obj.start_time.strftime("%H:%M") if obj.start_time else ""

    def get_end(self, obj):
        return obj.end_time.strftime("%H:%M") if obj.end_time else ""

    def validate(self, attrs):
        start_time = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end_time = attrs.get("end_time", getattr(self.instance, "end_time", None))

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})

        return attrs

