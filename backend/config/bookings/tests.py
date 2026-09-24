from datetime import timedelta, date, time, datetime
import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rooms.models import Room

from .models import Booking, TimeSlot

User = get_user_model()


class BookingAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Regular user 1
        self.user1 = User.objects.create_user(
            email="alice@example.com",
            password="Secure-password-123",
            first_name="Alice",
            last_name="Smith",
            department="Engineering",
        )

        # Regular user 2
        self.user2 = User.objects.create_user(
            email="bob@example.com",
            password="Secure-password-123",
            first_name="Bob",
            last_name="Jones",
            department="Product",
        )

        # Admin user
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            password="Admin-password-123",
            first_name="Admin",
            last_name="User",
        )

        # Rooms
        self.room = Room.objects.create(
            name="Main Conference Room",
            capacity=10,
            location="Floor 2, Room 201",
            amenities=["Projector", "Video Conference"],
            is_active=True,
            created_by=self.admin,
        )

        self.secondary_room = Room.objects.create(
            name="Focus Room Alpha",
            capacity=4,
            location="Floor 1, Room 105",
            amenities=["Whiteboard"],
            is_active=True,
            created_by=self.admin,
        )

        self.inactive_room = Room.objects.create(
            name="Renovating Space",
            capacity=8,
            location="Floor 3",
            amenities=[],
            is_active=False,
            created_by=self.admin,
        )

        # Baseline future time reference (tomorrow 10:00 AM)
        tomorrow = (timezone.now() + timedelta(days=1)).replace(
            hour=10, minute=0, second=0, microsecond=0
        )
        self.base_start = tomorrow
        self.base_end = tomorrow + timedelta(hours=1)

    # -------------------------------------------------------------------------
    # Authentication & Access Control
    # -------------------------------------------------------------------------

    def test_unauthenticated_requests_are_rejected(self):
        """Unauthenticated requests must return 401."""
        response = self.client.get("/api/bookings/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.post("/api/bookings/", {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.get("/api/my-bookings/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.get("/api/bookings/check-availability/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # -------------------------------------------------------------------------
    # Booking Creation & Positive Flows
    # -------------------------------------------------------------------------

    def test_authenticated_user_can_create_booking(self):
        """User can book an active room for a valid future slot."""
        self.client.force_authenticate(user=self.user1)

        payload = {
            "room": str(self.room.id),
            "title": "Quarterly Roadmap Review",
            "description": "Discussing Q4 OKRs",
            "start_time": self.base_start.isoformat(),
            "end_time": self.base_end.isoformat(),
            "attendees_count": 6,
        }

        response = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Quarterly Roadmap Review")
        self.assertEqual(response.data["room"], self.room.id)
        self.assertEqual(response.data["room_name"], self.room.name)
        self.assertEqual(response.data["user_email"], self.user1.email)
        self.assertEqual(response.data["status"], "CONFIRMED")
        self.assertTrue(Booking.objects.filter(id=response.data["id"]).exists())

    def test_back_to_back_bookings_allowed(self):
        """Adjacent bookings (end_time_1 == start_time_2) should not conflict."""
        self.client.force_authenticate(user=self.user1)

        # Slot 1: 10:00 - 11:00
        b1 = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Meeting 1",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        # Slot 2: 11:00 - 12:00
        slot2_start = self.base_end
        slot2_end = self.base_end + timedelta(hours=1)

        payload = {
            "room": str(self.room.id),
            "title": "Meeting 2 (Back-to-Back)",
            "start_time": slot2_start.isoformat(),
            "end_time": slot2_end.isoformat(),
            "attendees_count": 4,
        }

        response = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_same_slot_different_room_allowed(self):
        """Simultaneous bookings in different rooms are completely valid."""
        self.client.force_authenticate(user=self.user1)

        Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Main Room Session",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        payload = {
            "room": str(self.secondary_room.id),
            "title": "Focus Alpha Session",
            "start_time": self.base_start.isoformat(),
            "end_time": self.base_end.isoformat(),
            "attendees_count": 2,
        }

        response = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_cancelled_booking_does_not_block_slot(self):
        """A cancelled booking frees the slot for another reservation."""
        self.client.force_authenticate(user=self.user2)

        Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Cancelled Meeting",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CANCELLED,
        )

        payload = {
            "room": str(self.room.id),
            "title": "New Meeting on freed slot",
            "start_time": self.base_start.isoformat(),
            "end_time": self.base_end.isoformat(),
            "attendees_count": 5,
        }

        response = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # -------------------------------------------------------------------------
    # Overlap Validation & Conflict Errors (HTTP 409)
    # -------------------------------------------------------------------------

    def test_exact_overlap_returns_409_conflict(self):
        """Identical start and end times must return HTTP 409."""
        Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Existing Booking",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user2)
        payload = {
            "room": str(self.room.id),
            "title": "Conflicting Booking",
            "start_time": self.base_start.isoformat(),
            "end_time": self.base_end.isoformat(),
        }

        response = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("error", response.data)
        self.assertEqual(response.data["error"]["code"], "BOOKING_CONFLICT")
        self.assertIn("conflicts", response.data["error"]["details"])

    def test_partial_start_overlap_returns_409(self):
        """New booking starts during an existing booking -> HTTP 409."""
        Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Existing Booking 10:00-11:00",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user2)
        # New slot: 10:30 - 11:30
        payload = {
            "room": str(self.room.id),
            "title": "Overlap at Start",
            "start_time": (self.base_start + timedelta(minutes=30)).isoformat(),
            "end_time": (self.base_end + timedelta(minutes=30)).isoformat(),
        }

        response = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["error"]["code"], "BOOKING_CONFLICT")

    def test_partial_end_overlap_returns_409(self):
        """New booking ends during an existing booking -> HTTP 409."""
        Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Existing Booking 10:00-11:00",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user2)
        # New slot: 09:30 - 10:30
        payload = {
            "room": str(self.room.id),
            "title": "Overlap at End",
            "start_time": (self.base_start - timedelta(minutes=30)).isoformat(),
            "end_time": (self.base_start + timedelta(minutes=30)).isoformat(),
        }

        response = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["error"]["code"], "BOOKING_CONFLICT")

    def test_enclosing_overlap_returns_409(self):
        """New booking completely spans/encloses an existing booking -> HTTP 409."""
        Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Existing 10:00-11:00",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user2)
        # New slot: 09:00 - 12:00
        payload = {
            "room": str(self.room.id),
            "title": "Enclosing Overlap",
            "start_time": (self.base_start - timedelta(hours=1)).isoformat(),
            "end_time": (self.base_end + timedelta(hours=1)).isoformat(),
        }

        response = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["error"]["code"], "BOOKING_CONFLICT")

    # -------------------------------------------------------------------------
    # Input Validation (HTTP 400)
    # -------------------------------------------------------------------------

    def test_end_time_before_start_time_returns_400(self):
        """End time <= start time must return 400 VALIDATION_ERROR."""
        self.client.force_authenticate(user=self.user1)

        payload = {
            "room": str(self.room.id),
            "title": "Invalid Times",
            "start_time": self.base_end.isoformat(),
            "end_time": self.base_start.isoformat(),
        }

        response = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_ERROR")

    def test_booking_in_the_past_returns_400(self):
        """Booking for past dates must be rejected."""
        self.client.force_authenticate(user=self.user1)
        past_time = timezone.now() - timedelta(days=2)

        payload = {
            "room": str(self.room.id),
            "title": "Past Meeting",
            "start_time": past_time.isoformat(),
            "end_time": (past_time + timedelta(hours=1)).isoformat(),
        }

        response = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_ERROR")

    def test_booking_inactive_room_returns_400(self):
        """Attempting to book an inactive room returns 400."""
        self.client.force_authenticate(user=self.user1)

        payload = {
            "room": str(self.inactive_room.id),
            "title": "Try Inactive Room",
            "start_time": self.base_start.isoformat(),
            "end_time": self.base_end.isoformat(),
        }

        response = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_ERROR")

    def test_attendees_exceeding_capacity_returns_400(self):
        """Attendees count greater than room capacity returns 400."""
        self.client.force_authenticate(user=self.user1)

        payload = {
            "room": str(self.room.id),
            "title": "Huge Crowd",
            "start_time": self.base_start.isoformat(),
            "end_time": self.base_end.isoformat(),
            "attendees_count": 25,  # Capacity is 10
        }

        response = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_ERROR")

    # -------------------------------------------------------------------------
    # Availability Endpoint (/api/bookings/check-availability/)
    # -------------------------------------------------------------------------

    def test_check_availability_available(self):
        """Returns is_available=True when slot is clear."""
        self.client.force_authenticate(user=self.user1)

        params = {
            "room_id": str(self.room.id),
            "start_time": self.base_start.isoformat(),
            "end_time": self.base_end.isoformat(),
        }

        response = self.client.get("/api/bookings/check-availability/", params)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_available"])
        self.assertEqual(len(response.data["conflicts"]), 0)

    def test_check_availability_conflict(self):
        """Returns is_available=False with conflicting slot when occupied."""
        Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Existing Meeting",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user2)
        params = {
            "room_id": str(self.room.id),
            "start_time": self.base_start.isoformat(),
            "end_time": self.base_end.isoformat(),
        }

        response = self.client.get("/api/bookings/check-availability/", params)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_available"])
        self.assertEqual(len(response.data["conflicts"]), 1)
        self.assertEqual(response.data["conflicts"][0]["title"], "Existing Meeting")

    # -------------------------------------------------------------------------
    # User Isolation & My Bookings (/api/my-bookings/)
    # -------------------------------------------------------------------------

    def test_my_bookings_only_returns_own_bookings(self):
        """User only retrieves their own reservations."""
        Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Alice Meeting",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        Booking.objects.create(
            room=self.secondary_room,
            user=self.user2,
            title="Bob Meeting",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get("/api/my-bookings/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["title"], "Alice Meeting")

    # -------------------------------------------------------------------------
    # Cancellation Flow & Permission Checks (/api/bookings/<id>/cancel/)
    # -------------------------------------------------------------------------

    def test_owner_can_cancel_booking(self):
        """Booking creator can cancel their reservation."""
        booking = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Meeting to Cancel",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.patch(f"/api/bookings/{booking.id}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.STATUS_CANCELLED)

    def test_non_owner_cannot_cancel_booking(self):
        """Another user cannot cancel someone else's booking (403)."""
        booking = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Alice's Private Session",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user2)
        response = self.client.patch(f"/api/bookings/{booking.id}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"]["code"], "FORBIDDEN")

    def test_double_cancellation_returns_400(self):
        """Attempting to cancel an already cancelled booking returns 400."""
        booking = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Already Cancelled",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CANCELLED,
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.patch(f"/api/bookings/{booking.id}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_ERROR")

    # -------------------------------------------------------------------------
    # Booking Stats (/api/bookings/stats/)
    # -------------------------------------------------------------------------

    def test_booking_stats_endpoint(self):
        """Stats endpoint returns accurate counts."""
        Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Confirmed 1",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )
        Booking.objects.create(
            room=self.secondary_room,
            user=self.user2,
            title="Cancelled 1",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CANCELLED,
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get("/api/bookings/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_bookings"], 2)
        self.assertEqual(response.data["confirmed_bookings"], 1)
        self.assertEqual(response.data["cancelled_bookings"], 1)

    # -------------------------------------------------------------------------
    # Booking List Filtering & Search (/api/bookings/)
    # -------------------------------------------------------------------------

    def test_list_bookings_filters(self):
        """Test filtering bookings by room, status, date, date range, and search."""
        b1 = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Design Review",
            description="Discuss wireframes",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )
        b2 = Booking.objects.create(
            room=self.secondary_room,
            user=self.user2,
            title="Sprint Planning",
            description="Agile sprint kick-off",
            start_time=self.base_start + timedelta(days=2),
            end_time=self.base_end + timedelta(days=2),
            status=Booking.STATUS_CANCELLED,
        )

        self.client.force_authenticate(user=self.user1)

        # 1. Filter by room
        res = self.client.get("/api/bookings/", {"room": str(self.room.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["id"], str(b1.id))

        # 2. Filter by status
        res = self.client.get("/api/bookings/", {"status": "CANCELLED"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["id"], str(b2.id))

        # 3. Filter by date
        res = self.client.get("/api/bookings/", {"date": self.base_start.date().isoformat()})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["id"], str(b1.id))

        # 4. Filter by date range (start_date and end_date)
        res = self.client.get("/api/bookings/", {
            "start_date": self.base_start.date().isoformat(),
            "end_date": (self.base_start + timedelta(days=3)).date().isoformat(),
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["results"]), 2)

        # 5. Filter by search query
        res = self.client.get("/api/bookings/", {"search": "wireframes"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["id"], str(b1.id))

    # -------------------------------------------------------------------------
    # Booking Detail, Update (PUT / PATCH), and Delete
    # -------------------------------------------------------------------------

    def test_retrieve_booking_detail(self):
        """Retrieve single booking detail by ID."""
        booking = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Single Detail Check",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user1)
        res = self.client.get(f"/api/bookings/{booking.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["id"], str(booking.id))
        self.assertEqual(res.data["title"], "Single Detail Check")

    def test_retrieve_nonexistent_booking_detail_returns_404(self):
        """Retrieve booking with non-existent ID returns 404."""
        self.client.force_authenticate(user=self.user1)
        res = self.client.get(f"/api/bookings/{uuid.uuid4()}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_fully_update_booking_put(self):
        """Booking owner can perform full update via PUT."""
        booking = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Old Meeting Title",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user1)
        payload = {
            "room": str(self.room.id),
            "title": "Completely Updated Meeting",
            "description": "Updated agenda",
            "start_time": self.base_start.isoformat(),
            "end_time": self.base_end.isoformat(),
            "attendees_count": 5,
        }
        res = self.client.put(f"/api/bookings/{booking.id}/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.title, "Completely Updated Meeting")
        self.assertEqual(booking.description, "Updated agenda")

    def test_non_owner_cannot_update_booking(self):
        """Non-owner cannot update someone else's booking via PUT or PATCH (403)."""
        booking = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Alice's Meeting",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user2)
        res_put = self.client.put(f"/api/bookings/{booking.id}/", {"title": "Bob Takeover"}, format="json")
        self.assertEqual(res_put.status_code, status.HTTP_403_FORBIDDEN)

        res_patch = self.client.patch(f"/api/bookings/{booking.id}/", {"title": "Bob Takeover"}, format="json")
        self.assertEqual(res_patch.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_booking_title_does_not_self_conflict(self):
        """Updating non-time fields like title/description does not trigger conflict with itself."""
        booking = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Original Title",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user1)
        res = self.client.patch(f"/api/bookings/{booking.id}/", {"title": "Renamed Title"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.title, "Renamed Title")

    def test_patch_booking_reschedule_to_conflicting_slot_returns_409(self):
        """Rescheduling an existing booking into another confirmed booking's time slot returns 409."""
        # Booking 1: 10:00 - 11:00
        Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Fixed Morning Slot",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        # Booking 2: 12:00 - 13:00
        booking2 = Booking.objects.create(
            room=self.room,
            user=self.user2,
            title="Afternoon Slot",
            start_time=self.base_end + timedelta(hours=1),
            end_time=self.base_end + timedelta(hours=2),
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user2)
        # Attempt to shift booking2 into booking1's time (10:30 - 11:30)
        res = self.client.patch(
            f"/api/bookings/{booking2.id}/",
            {
                "start_time": (self.base_start + timedelta(minutes=30)).isoformat(),
                "end_time": (self.base_end + timedelta(minutes=30)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(res.data["error"]["code"], "BOOKING_CONFLICT")

    def test_owner_can_delete_booking(self):
        """Owner can delete their own booking."""
        booking = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Meeting to Delete",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user1)
        res = self.client.delete(f"/api/bookings/{booking.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Booking.objects.filter(id=booking.id).exists())

    def test_non_owner_cannot_delete_booking(self):
        """Non-owner cannot delete someone else's booking (403)."""
        booking = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Alice's Protected Meeting",
            start_time=self.base_start,
            end_time=self.base_end,
            status=Booking.STATUS_CONFIRMED,
        )

        self.client.force_authenticate(user=self.user2)
        res = self.client.delete(f"/api/bookings/{booking.id}/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Booking.objects.filter(id=booking.id).exists())

    def test_available_slots_future_date_returns_all_slots(self):
        """Future date should return all standard time slots."""
        tomorrow_str = (timezone.localdate() + timedelta(days=1)).isoformat()
        res = self.client.get(f"/api/bookings/available-slots/?date={tomorrow_str}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_slots"], 11)
        self.assertIn("morning", res.data["grouped"])
        self.assertIn("afternoon", res.data["grouped"])
        self.assertIn("evening", res.data["grouped"])

    def test_available_slots_excludes_completed_slots_for_today(self):
        """Slots that have already completed should NOT be returned for today."""
        today_str = timezone.localdate().isoformat()
        now = timezone.now()
        res = self.client.get(f"/api/bookings/available-slots/?date={today_str}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        tz = timezone.get_current_timezone()
        from datetime import datetime, time
        # Ensure that no returned slot has end time <= now
        for slot in res.data["slots"]:
            eh, em = map(int, slot["end"].split(":"))
            slot_end = timezone.make_aware(
                datetime.combine(timezone.localdate(), time(eh, em)),
                tz,
            )
            self.assertGreater(slot_end, now, f"Slot {slot['label']} should not have been returned since end <= now")

    def test_list_time_slots_endpoint(self):
        """Anyone can list time slots."""
        res = self.client.get("/api/bookings/time-slots/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 11)

    def test_regular_user_cannot_create_time_slot(self):
        """Regular non-staff user cannot create a time slot (403 Forbidden)."""
        self.client.force_authenticate(user=self.user1)
        res = self.client.post("/api/bookings/time-slots/", {
            "start_time": "08:00:00",
            "end_time": "09:00:00",
            "label": "Early Bird",
            "period": "morning",
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_update_toggle_delete_time_slot(self):
        """Admin user can create, update, toggle active status, and delete time slots."""
        self.client.force_authenticate(user=self.admin)
        
        # 1. Create slot
        res = self.client.post("/api/bookings/time-slots/", {
            "start_time": "07:30:00",
            "end_time": "08:30:00",
            "label": "Dawn Standup",
            "period": "morning",
            "is_active": True,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        slot_id = res.data["id"]
        self.assertEqual(res.data["label"], "Dawn Standup")

        # 2. Update slot
        res_update = self.client.patch(f"/api/bookings/time-slots/{slot_id}/", {
            "label": "Updated Dawn Standup",
        })
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        self.assertEqual(res_update.data["label"], "Updated Dawn Standup")

        # 3. Toggle inactive
        res_toggle = self.client.patch(f"/api/bookings/time-slots/{slot_id}/", {
            "is_active": False,
        })
        self.assertEqual(res_toggle.status_code, status.HTTP_200_OK)
        self.assertFalse(res_toggle.data["is_active"])

        # 4. Delete slot
        res_del = self.client.delete(f"/api/bookings/time-slots/{slot_id}/")
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(TimeSlot.objects.filter(id=slot_id).exists())

    def test_dynamic_slot_reflected_in_available_slots(self):
        """Creating an active slot dynamically makes it appear in available-slots."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.post("/api/bookings/time-slots/", {
            "start_time": "06:00:00",
            "end_time": "07:00:00",
            "label": "Early Sunrise Sync",
            "period": "morning",
            "is_active": True,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        slot_id = res.data["id"]

        tomorrow_str = (timezone.localdate() + timedelta(days=1)).isoformat()
        res_avail = self.client.get(f"/api/bookings/available-slots/?date={tomorrow_str}")
        self.assertEqual(res_avail.status_code, status.HTTP_200_OK)
        labels = [s["label"] for s in res_avail.data["slots"]]
        self.assertIn("Early Sunrise Sync", labels)

        # Deactivate slot
        self.client.patch(f"/api/bookings/time-slots/{slot_id}/", {"is_active": False})
        res_avail_after = self.client.get(f"/api/bookings/available-slots/?date={tomorrow_str}")
        deactivated_slot = next((s for s in res_avail_after.data["slots"] if s["label"] == "Early Sunrise Sync"), None)
        self.assertIsNotNone(deactivated_slot)
        self.assertFalse(deactivated_slot["is_active"])

    def test_admin_can_reset_default_time_slots(self):
        """Admin can trigger reset-defaults action."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.post("/api/bookings/time-slots/reset-defaults/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("Standard default time slots restored", res.data["message"])

    def test_bulk_create_time_slots_admin(self):
        """Admin can create multiple time slots in a single batch request."""
        self.client.force_authenticate(user=self.admin)
        batch = [
            {"start_time": "06:00:00", "end_time": "06:30:00", "label": "Batch Slot 1", "period": "morning"},
            {"start_time": "06:30:00", "end_time": "07:00:00", "label": "Batch Slot 2", "period": "morning"},
            {"start_time": "07:00:00", "end_time": "07:30:00", "label": "Batch Slot 3", "period": "morning"},
        ]
        res = self.client.post("/api/bookings/time-slots/bulk-create/", batch, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(res.data["slots"]), 3)
        self.assertTrue(TimeSlot.objects.filter(label="Batch Slot 1").exists())
        self.assertTrue(TimeSlot.objects.filter(label="Batch Slot 2").exists())
        self.assertTrue(TimeSlot.objects.filter(label="Batch Slot 3").exists())

    def test_bulk_create_time_slots_forbidden_for_regular_user(self):
        """Regular user cannot bulk create time slots (403 Forbidden)."""
        self.client.force_authenticate(user=self.user1)
        batch = [
            {"start_time": "06:00:00", "end_time": "06:30:00", "label": "Unauthorized Batch", "period": "morning"},
        ]
        res = self.client.post("/api/bookings/time-slots/bulk-create/", batch, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_booking_list_pagination_and_metadata(self):
        """Booking list endpoint returns paginated metadata (count, total_pages, results)."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/bookings/?page=1&page_size=5")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("count", res.data)
        self.assertIn("total_pages", res.data)
        self.assertIn("current_page", res.data)
        self.assertIn("results", res.data)
        self.assertEqual(res.data["current_page"], 1)

    def test_booking_filter_by_room_and_all(self):
        """Booking list can filter by specific room and 'ALL' bypass."""
        self.client.force_authenticate(user=self.admin)
        # Create a booking in secondary room
        now = timezone.now() + timedelta(days=2)
        Booking.objects.create(
            room=self.secondary_room,
            user=self.user1,
            title="Secondary Room Meeting",
            start_time=now.replace(hour=10, minute=0, second=0),
            end_time=now.replace(hour=11, minute=0, second=0),
            status=Booking.STATUS_CONFIRMED,
        )

        # Filter by secondary_room
        res = self.client.get(f"/api/bookings/?room={self.secondary_room.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for item in res.data["results"]:
            self.assertEqual(item["room"], self.secondary_room.id)

        # 'ALL' room parameter returns bookings without room restriction
        res_all = self.client.get("/api/bookings/?room=ALL")
        self.assertEqual(res_all.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res_all.data["count"], 1)

    def test_booking_filter_by_period_and_session(self):
        """Booking list filters by period (this_month, this_week, custom) and session (morning, afternoon, evening)."""
        self.client.force_authenticate(user=self.admin)
        now = timezone.now()

        # Morning booking (09:00 AM)
        b_morning = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Morning Sync",
            start_time=now.replace(hour=9, minute=0, second=0),
            end_time=now.replace(hour=10, minute=0, second=0),
            status=Booking.STATUS_CONFIRMED,
        )

        # Afternoon booking (02:00 PM)
        b_afternoon = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Afternoon Retro",
            start_time=now.replace(hour=14, minute=0, second=0),
            end_time=now.replace(hour=15, minute=0, second=0),
            status=Booking.STATUS_CONFIRMED,
        )

        # Evening booking (06:00 PM)
        b_evening = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Evening Wrap",
            start_time=now.replace(hour=18, minute=0, second=0),
            end_time=now.replace(hour=19, minute=0, second=0),
            status=Booking.STATUS_CONFIRMED,
        )

        # 1. Filter by morning session
        res_m = self.client.get("/api/bookings/?session=morning")
        self.assertEqual(res_m.status_code, status.HTTP_200_OK)
        titles_m = [b["title"] for b in res_m.data["results"]]
        self.assertIn("Morning Sync", titles_m)
        self.assertNotIn("Afternoon Retro", titles_m)
        self.assertNotIn("Evening Wrap", titles_m)

        # 2. Filter by afternoon session
        res_a = self.client.get("/api/bookings/?session=afternoon")
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
        titles_a = [b["title"] for b in res_a.data["results"]]
        self.assertIn("Afternoon Retro", titles_a)
        self.assertNotIn("Morning Sync", titles_a)

        # 3. Filter by evening session
        res_e = self.client.get("/api/bookings/?session=evening")
        self.assertEqual(res_e.status_code, status.HTTP_200_OK)
        titles_e = [b["title"] for b in res_e.data["results"]]
        self.assertIn("Evening Wrap", titles_e)
        self.assertNotIn("Morning Sync", titles_e)

        # 4. Filter by period this_month
        res_month = self.client.get("/api/bookings/?period=this_month")
        self.assertEqual(res_month.status_code, status.HTTP_200_OK)
        titles_month = [b["title"] for b in res_month.data["results"]]
        self.assertIn("Morning Sync", titles_month)

        # 5. Serializer session and time_slot_label
        for item in res_m.data["results"]:
            if item["id"] == str(b_morning.id):
                self.assertEqual(item["session"], "morning")
                self.assertIn("AM", item["time_slot_label"])

    def test_booking_timezone_header_support(self):
        """Verify that X-Timezone header activates client timezone for time_slot_label and session."""
        self.client.force_authenticate(user=self.admin)
        from datetime import timezone as dt_tz
        dt_start = datetime(2026, 9, 23, 15, 0, 0, tzinfo=dt_tz.utc)
        dt_end = datetime(2026, 9, 23, 16, 30, 0, tzinfo=dt_tz.utc)

        b = Booking.objects.create(
            room=self.room,
            user=self.user1,
            title="Late Sync",
            start_time=dt_start,
            end_time=dt_end,
            status=Booking.STATUS_CONFIRMED,
        )

        # 1. With X-Timezone: Asia/Kolkata (UTC+5:30) -> 15:00 UTC is 20:30 IST (08:30 PM, Evening)
        res_ist = self.client.get(f"/api/bookings/{b.id}/", HTTP_X_TIMEZONE="Asia/Kolkata")
        self.assertEqual(res_ist.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ist.data["session"], "evening")
        self.assertIn("8:30 PM", res_ist.data["time_slot_label"])
        self.assertIn("10:00 PM", res_ist.data["time_slot_label"])

        # 2. Without X-Timezone header -> defaults to UTC (03:00 PM, Afternoon)
        res_utc = self.client.get(f"/api/bookings/{b.id}/")
        self.assertEqual(res_utc.status_code, status.HTTP_200_OK)
        self.assertEqual(res_utc.data["session"], "afternoon")
        self.assertIn("3:00 PM", res_utc.data["time_slot_label"])


class TimeSlotModelAndAPITests(TestCase):
    """
    Tests for TimeSlot model date field, filtering, pagination, bulk creation across multiple dates,
    and available-slots priority.
    """

    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            email="admin_ts@example.com",
            password="StrongPassword123!",
            first_name="Admin",
            last_name="TS",
            is_staff=True,
        )
        self.room_a = Room.objects.create(
            name="Alpha Room",
            capacity=10,
            location="Floor 1",
            is_active=True,
        )
        self.room_b = Room.objects.create(
            name="Beta Room",
            capacity=20,
            location="Floor 2",
            is_active=True,
        )

    def test_timeslot_model_date_and_recurring_property(self):
        recurring_slot = TimeSlot.objects.create(
            start_time=time(9, 0),
            end_time=time(10, 0),
            period="morning",
            date=None,
        )
        self.assertTrue(recurring_slot.is_recurring)
        self.assertIn("[Recurring]", str(recurring_slot))

        dated_slot = TimeSlot.objects.create(
            start_time=time(10, 0),
            end_time=time(11, 0),
            period="morning",
            date=date(2026, 9, 25),
        )
        self.assertFalse(dated_slot.is_recurring)
        self.assertIn("[2026-09-25]", str(dated_slot))

    def test_timeslot_api_pagination(self):
        # Create 5 recurring slots
        for i in range(5):
            TimeSlot.objects.create(
                start_time=time(9 + i, 0),
                end_time=time(10 + i, 0),
                period="morning",
                sort_order=i,
            )

        self.client.force_authenticate(user=self.staff_user)
        res = self.client.get("/api/bookings/time-slots/?page=1&page_size=3")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("results", res.data)
        self.assertIn("count", res.data)
        self.assertEqual(res.data["current_page"], 1)
        self.assertEqual(res.data["page_size"], 3)
        self.assertEqual(len(res.data["results"]), 3)
        self.assertGreaterEqual(res.data["count"], 5)

    def test_timeslot_api_filtering_by_date_and_session(self):
        self.client.force_authenticate(user=self.staff_user)

        # Clear standard slots for controlled testing
        TimeSlot.objects.all().delete()

        # Slot 1: recurring morning slot
        s1 = TimeSlot.objects.create(
            start_time=time(9, 0),
            end_time=time(10, 0),
            period="morning",
            date=None,
        )
        # Slot 2: dated afternoon slot
        s2 = TimeSlot.objects.create(
            start_time=time(14, 0),
            end_time=time(15, 0),
            period="afternoon",
            date=date(2026, 9, 25),
            room=self.room_a,
        )
        # Slot 3: dated evening slot
        s3 = TimeSlot.objects.create(
            start_time=time(18, 0),
            end_time=time(19, 0),
            period="evening",
            date=date(2026, 10, 5),
            room=self.room_b,
        )

        # 1. Filter by session
        res_m = self.client.get("/api/bookings/time-slots/?session=morning")
        self.assertEqual(len(res_m.data), 1)
        self.assertEqual(res_m.data[0]["id"], str(s1.id))

        # 2. Filter by date_type = recurring
        res_rec = self.client.get("/api/bookings/time-slots/?date_type=recurring")
        self.assertEqual(len(res_rec.data), 1)
        self.assertEqual(res_rec.data[0]["id"], str(s1.id))

        # 3. Filter by date_type = dated
        res_dated = self.client.get("/api/bookings/time-slots/?date_type=dated")
        self.assertEqual(len(res_dated.data), 2)

        # 4. Filter by exact room
        res_room_a = self.client.get(f"/api/bookings/time-slots/?room={self.room_a.id}&exact_room=true")
        self.assertEqual(len(res_room_a.data), 1)
        self.assertEqual(res_room_a.data[0]["id"], str(s2.id))

        # 5. Filter by custom date range
        res_custom = self.client.get("/api/bookings/time-slots/?period=custom&start_date=2026-09-20&end_date=2026-09-30")
        self.assertEqual(len(res_custom.data), 1)
        self.assertEqual(res_custom.data[0]["id"], str(s2.id))

    def test_timeslot_bulk_create_with_multiple_dates(self):
        self.client.force_authenticate(user=self.staff_user)

        payload = {
            "dates": ["2026-11-01", "2026-11-02", "2026-11-03"],
            "slots": [
                {
                    "start_time": "09:00:00",
                    "end_time": "10:00:00",
                    "period": "morning",
                    "label": "Morning Session",
                    "room": str(self.room_a.id),
                },
                {
                    "start_time": "14:00:00",
                    "end_time": "15:00:00",
                    "period": "afternoon",
                    "label": "Afternoon Session",
                    "room": str(self.room_a.id),
                },
            ],
        }

        res = self.client.post("/api/bookings/time-slots/bulk-create/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # 3 dates x 2 slots = 6 created instances
        self.assertEqual(len(res.data["slots"]), 6)
        created_count = TimeSlot.objects.filter(room=self.room_a, date__in=["2026-11-01", "2026-11-02", "2026-11-03"]).count()
        self.assertEqual(created_count, 6)

    def test_available_slots_prefers_date_specific_slot(self):
        TimeSlot.objects.all().delete()

        # Recurring fallback slot
        TimeSlot.objects.create(
            start_time=time(9, 0),
            end_time=time(10, 0),
            label="Daily Generic Slot",
            period="morning",
            date=None,
            is_active=True,
        )

        # Date-specific special slot for 2026-12-25
        special_date = "2026-12-25"
        TimeSlot.objects.create(
            start_time=time(11, 0),
            end_time=time(12, 0),
            label="Christmas Special Slot",
            period="morning",
            date=date(2026, 12, 25),
            is_active=True,
        )

        res = self.client.get(f"/api/bookings/available-slots/?date={special_date}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should prefer the date-specific slot
        labels = [s["label"] for s in res.data["slots"]]
        self.assertIn("Christmas Special Slot", labels)
        self.assertNotIn("Daily Generic Slot", labels)

    def test_available_slots_merges_room_slots_with_non_overlapping_global_evening_slots(self):
        TimeSlot.objects.all().delete()
        future_date = (timezone.localdate() + timedelta(days=5))
        future_date_str = future_date.isoformat()

        # 1. Global corporate evening slot (18:30 - 19:30)
        TimeSlot.objects.create(
            start_time=time(18, 30),
            end_time=time(19, 30),
            label="Corporate Evening Slot",
            period="evening",
            date=future_date,
            room=None,
            is_active=True,
        )

        # 2. Global corporate morning slot (09:00 - 10:00) - to be overridden
        TimeSlot.objects.create(
            start_time=time(9, 0),
            end_time=time(10, 0),
            label="Corporate Global Morning",
            period="morning",
            date=future_date,
            room=None,
            is_active=True,
        )

        # 3. Room-specific 30-min morning slot (09:00 - 09:30)
        TimeSlot.objects.create(
            start_time=time(9, 0),
            end_time=time(9, 30),
            label="Room Morning 30m",
            period="morning",
            date=future_date,
            room=self.room_a,
            is_active=True,
        )

        # Query for room_a
        res = self.client.get(f"/api/bookings/available-slots/?date={future_date_str}&room_id={self.room_a.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        labels = [s["label"] for s in res.data["slots"]]
        # Room-specific slot must be included
        self.assertIn("Room Morning 30m", labels)
        # Non-overlapping global evening slot must be included
        self.assertIn("Corporate Evening Slot", labels)
        # Overlapping global morning slot must be overridden/excluded
        self.assertNotIn("Corporate Global Morning", labels)




