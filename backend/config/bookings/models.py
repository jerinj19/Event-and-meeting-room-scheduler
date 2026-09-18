from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class Booking(models.Model):
    STATUS_CHOICES = [
        ('CONFIRMED', 'Confirmed'),
        ('PENDING', 'Pending'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
    ]

    title = models.CharField(max_length=200, help_text="Title or purpose of the meeting/event")
    description = models.TextField(blank=True, default='', help_text="Additional details or agenda")
    room_name = models.CharField(max_length=120, help_text="Name or identifier of the room")
    user_name = models.CharField(max_length=120, default='Organizer', help_text="Person booking the room")
    user_email = models.EmailField(blank=True, default='', help_text="Contact email of the organizer")
    start_time = models.DateTimeField(help_text="Booking start time")
    end_time = models.DateTimeField(help_text="Booking end time")
    attendees_count = models.PositiveIntegerField(default=1, help_text="Number of expected attendees")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CONFIRMED')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_time']
        indexes = [
            models.Index(fields=['room_name', 'start_time', 'end_time']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.title} - {self.room_name} ({self.start_time.strftime('%Y-%m-%d %H:%M')} to {self.end_time.strftime('%H:%M')})"

    def clean(self):
        super().clean()

        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValidationError({"end_time": "End time must be after start time."})

            # Check for conflict/overlapping bookings in the same room (ignoring cancelled bookings)
            if self.status != 'CANCELLED':
                conflicts = Booking.objects.filter(
                    room_name__iexact=self.room_name,
                    start_time__lt=self.end_time,
                    end_time__gt=self.start_time
                ).exclude(status='CANCELLED')

                if self.pk:
                    conflicts = conflicts.exclude(pk=self.pk)

                if conflicts.exists():
                    conflict = conflicts.first()
                    raise ValidationError({
                        "room_name": f"Conflict detected: '{conflict.room_name}' is already booked from "
                                     f"{conflict.start_time.strftime('%Y-%m-%d %H:%M')} to "
                                     f"{conflict.end_time.strftime('%H:%M')} for '{conflict.title}'."
                    })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
