import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields.ranges import RangeOperators
from django.db.models import Func


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
            ExclusionConstraint(
                name='booking_prevent_overlapping',
                expressions=[
                    ('room', RangeOperators.EQUAL),
                    (Func('start_time', 'end_time', function='tstzrange'), RangeOperators.OVERLAPS),
                ],
                condition=models.Q(status='CONFIRMED'),
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


class TimeSlot(models.Model):
    """
    TimeSlot model representing bookable meeting time slots managed dynamically by admins.
    Supports global slots (room is NULL) as well as room-specific slots.
    """

    PERIOD_MORNING = 'morning'
    PERIOD_AFTERNOON = 'afternoon'
    PERIOD_EVENING = 'evening'

    PERIOD_CHOICES = [
        (PERIOD_MORNING, 'Morning'),
        (PERIOD_AFTERNOON, 'Afternoon'),
        (PERIOD_EVENING, 'Evening'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    label = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Custom display label (e.g. '09:00 – 10:00 AM' or 'Sprint Review')",
    )
    date = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Optional specific calendar date. If null, slot is a daily recurring template.",
    )
    start_time = models.TimeField(
        help_text="Start time of the slot (e.g. 09:00:00)",
    )
    end_time = models.TimeField(
        help_text="End time of the slot (e.g. 10:00:00)",
    )
    period = models.CharField(
        max_length=20,
        choices=PERIOD_CHOICES,
        default=PERIOD_MORNING,
        help_text="Time category: morning, afternoon, or evening",
    )
    room = models.ForeignKey(
        'rooms.Room',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='time_slots',
        help_text="Optional room restriction. If null, slot is global across all rooms.",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Controls whether this slot is available for scheduling",
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        help_text="Display ordering sequence",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'time_slots'
        ordering = ['date', 'start_time', 'sort_order']
        indexes = [
            models.Index(fields=['is_active', 'start_time'], name='timeslot_active_time_idx'),
            models.Index(fields=['room', 'is_active'], name='timeslot_room_active_idx'),
            models.Index(fields=['date', 'is_active'], name='timeslot_date_active_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_time__gt=models.F('start_time')),
                name='timeslot_end_gt_start',
            ),
        ]

    def __str__(self):
        scope = self.room.name if self.room else "Global"
        date_tag = f"[{self.date}] " if self.date else "[Recurring] "
        return f"{date_tag}{self.formatted_label} ({self.period}) - {scope}"

    @property
    def is_recurring(self):
        return self.date is None

    @property
    def duration_minutes(self):
        if not self.start_time or not self.end_time:
            return 0
        start_min = self.start_time.hour * 60 + self.start_time.minute
        end_min = self.end_time.hour * 60 + self.end_time.minute
        return end_min - start_min

    @property
    def duration_label(self):
        mins = self.duration_minutes
        if mins <= 0:
            return ""
        return f"{mins} mins"

    @property
    def formatted_label(self):
        if self.label and self.label.strip():
            return self.label.strip()
        if not self.start_time or not self.end_time:
            return ""
        from datetime import datetime
        start_dt = datetime.combine(datetime.today(), self.start_time)
        end_dt = datetime.combine(datetime.today(), self.end_time)
        return f"{start_dt.strftime('%I:%M %p')} – {end_dt.strftime('%I:%M %p')}".replace(' 0', ' ')

    def clean(self):
        super().clean()
        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValidationError({"end_time": "End time must be strictly after start time."})

        from datetime import time
        if self.start_time and not self.period:
            if self.start_time < time(12, 0):
                self.period = self.PERIOD_MORNING
            elif self.start_time < time(17, 0):
                self.period = self.PERIOD_AFTERNOON
            else:
                self.period = self.PERIOD_EVENING

    def save(self, *args, **kwargs):
        if not self.label and self.start_time and self.end_time:
            from datetime import datetime
            start_dt = datetime.combine(datetime.today(), self.start_time)
            end_dt = datetime.combine(datetime.today(), self.end_time)
            self.label = f"{start_dt.strftime('%I:%M %p')} – {end_dt.strftime('%I:%M %p')}".replace(' 0', ' ')

        from datetime import time
        if not self.period and self.start_time:
            if self.start_time < time(12, 0):
                self.period = self.PERIOD_MORNING
            elif self.start_time < time(17, 0):
                self.period = self.PERIOD_AFTERNOON
            else:
                self.period = self.PERIOD_EVENING

        self.full_clean()
        super().save(*args, **kwargs)

