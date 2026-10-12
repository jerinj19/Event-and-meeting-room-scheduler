import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Room(models.Model):
    """
    Room model representing physical or virtual meeting spaces.
    Matches the `rooms` table specification:
    id (UUID), name (unique), capacity (>0), location, amenities (JSON), is_active.
    Aligned with the users table via `created_by`.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, help_text="Unique name or number of the meeting room")
    capacity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Maximum number of occupants (must be greater than 0)"
    )
    location = models.CharField(max_length=150, help_text="Floor, wing, building, or area description")
    amenities = models.JSONField(default=list, blank=True, help_text="List of amenities/assets available in the room")
    image = models.ImageField(upload_to="room_images/", null=True, blank=True, help_text="Room cover photo or interior layout image")
    hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text="Hourly rental rate in INR (₹)"
    )
    floor_area = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Floor area in square feet (sq ft)"
    )
    av_equipment = models.JSONField(
        default=list,
        blank=True,
        help_text="List of admin-selected Audio/Visual equipment"
    )
    acoustics = models.CharField(
        max_length=150,
        blank=True,
        default="",
        help_text="Acoustics rating or specifications (e.g. 'NRC 0.88 - Soundproofed Glazing')"
    )
    connectivity = models.CharField(
        max_length=150,
        blank=True,
        default="",
        help_text="Connectivity specifications (e.g. 'Wi-Fi 6E - 1.2 Gbps Dedicated')"
    )
    is_active = models.BooleanField(default=True, help_text="Designates whether this room is available for scheduling")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_rooms",
        help_text="User who registered the room in the system"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "rooms"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["capacity"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(capacity__gt=0),
                name="room_capacity_gt_0"
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.location}) - Cap: {self.capacity}"


class RoomImage(models.Model):
    """
    Stores multiple perspective photos for a meeting room.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="images",
        help_text="Associated meeting room"
    )
    image = models.ImageField(
        upload_to="room_images/",
        help_text="Perspective photo of the room"
    )
    is_primary = models.BooleanField(
        default=False,
        help_text="Indicates whether this image is the primary cover photo"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "room_images"
        ordering = ["-is_primary", "created_at"]

    def __str__(self):
        return f"Image for {self.room.name} ({'Primary' if self.is_primary else 'Gallery'})"
