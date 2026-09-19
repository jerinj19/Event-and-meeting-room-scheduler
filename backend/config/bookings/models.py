import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class Booking(models.Model):
    """
    Booking model representing a reservation of a Room by a User.
    Enforces foreign keys to rooms.Room and settings.AUTH_USER_MODEL,
    along with lifecycle status, overlap validation, and database constraints.
    """

    STATUS_CONFIRMED = 'CONFIRMED'
    STATUS_CANCELLED = 'CANCELLED'

    STATUS_CHOICES = [
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        'rooms.Room',
        on_delete=models.CASCADE,
        related_name='bookings',
        help_text="The meeting room being booked",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings',
        help_text="The user who created the booking",
    )
    title = models.CharField(
        max_length=200,
        help_text="Title or purpose of the meeting/event",
    )
    description = models.TextField(
        blank=True,
        default='',
        help_text="Additional details or meeting agenda",
    )
    start_time = models.DateTimeField(
        help_text="Booking start timestamp",
    )
    end_time = models.DateTimeField(
        help_text="Booking end timestamp",
    )
    attendees_count = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Number of expected attendees",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_CONFIRMED,
        help_text="Current lifecycle status of the reservation",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bookings'
        ordering = ['start_time']
        indexes = [
            models.Index(fields=['room', 'start_time', 'end_time'], name='booking_room_time_idx'),
            models.Index(fields=['status'], name='booking_status_idx'),
            models.Index(fields=['user', 'start_time'], name='booking_user_time_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_time__gt=models.F('start_time')),
                name='booking_end_time_gt_start_time',
            ),
            models.CheckConstraint(
                condition=models.Q(attendees_count__gt=0),
                name='booking_attendees_gt_0',
            ),
        ]

    def __str__(self):
        room_name = getattr(self.room, 'name', 'Unknown Room')
        return f"{self.title} - {room_name} ({self.start_time:%Y-%m-%d %H:%M} to {self.end_time:%H:%M})"

    def clean(self):
        super().clean()

        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValidationError({"end_time": "End time must be after start time."})

        if hasattr(self, 'room') and self.room:
            if not self.room.is_active:
                raise ValidationError({"room": f"Room '{self.room.name}' is currently inactive and cannot be booked."})

            if self.attendees_count and self.attendees_count > self.room.capacity:
                raise ValidationError({
                    "attendees_count": (
                        f"Attendees count ({self.attendees_count}) exceeds room capacity ({self.room.capacity})."
                    )
                })

            if self.status != self.STATUS_CANCELLED and self.start_time and self.end_time:
                conflicts = Booking.objects.filter(
                    room=self.room,
                    status=self.STATUS_CONFIRMED,
                    start_time__lt=self.end_time,
                    end_time__gt=self.start_time,
                )
                if self.pk:
                    conflicts = conflicts.exclude(pk=self.pk)

                if conflicts.exists():
                    conflict = conflicts.first()
                    raise ValidationError({
                        "non_field_errors": (
                            f"Conflict detected: '{self.room.name}' is already booked from "
                            f"{conflict.start_time:%Y-%m-%d %H:%M} to "
                            f"{conflict.end_time:%H:%M} for '{conflict.title}'."
                        )
                    })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
