from datetime import timedelta
import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rooms.models import Room

from .models import Booking

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

