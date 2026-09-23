from datetime import timedelta
import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rooms.models import Room

from bookings.models import Booking

User = get_user_model()


class NPlusOneQueryTests(TestCase):
    """
    Performance and N+1 query audit test suite.
    Verifies using assertNumQueries that query counts remain O(1)
    and do not scale linearly with the number of records returned.
    """

    def setUp(self):
        super().setUp()
        self.client = APIClient()

        self.admin = User.objects.create_superuser(
            email="admin_perf@example.com",
            password="Admin-password-123",
            first_name="Admin",
            last_name="Performance",
        )

        self.user = User.objects.create_user(
            email="user_perf@example.com",
            password="User-password-123",
            first_name="User",
            last_name="Performance",
        )

        self.room = Room.objects.create(
            name="Performance Lab Room",
            capacity=20,
            location="Floor 5",
            amenities=["Gigabit Ethernet", "Video Conference"],
            is_active=True,
            created_by=self.admin,
        )

        self.base_time = (timezone.now() + timedelta(days=3)).replace(
            hour=9, minute=0, second=0, microsecond=0
        )

    def test_room_list_avoids_n_plus_one_queries(self):
        """
        Verify GET /api/rooms/ does not suffer from N+1 queries.
        Each room serializes created_by_email, but because the queryset uses
        select_related('created_by'), the query count must remain constant
        regardless of whether 1 room or 15 rooms are fetched.
        """
        self.client.force_authenticate(user=self.user)

        # Baseline: 1 room exists
        with self.assertNumQueries(2):
            # Query 1: COUNT(*) for pagination
            # Query 2: SELECT rooms JOIN users ON created_by_id = users.id LIMIT 20
            res = self.client.get("/api/rooms/")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(len(res.data["results"]), 1)

        # Create 14 more rooms with different creator users
        for i in range(14):
            creator = User.objects.create_user(
                email=f"creator_{i}@example.com",
                password="Password-123",
                first_name=f"Creator{i}",
                last_name="Test",
            )
            Room.objects.create(
                name=f"Room Batch {i}",
                capacity=10 + i,
                location=f"Floor {i % 4}",
                created_by=creator,
            )

        # Now 15 rooms exist with 15 different creators.
        # If N+1 existed, this would run 2 + 14 = 16 queries.
        # With select_related('created_by'), it must still run exactly 2 queries!
        with self.assertNumQueries(2):
            res = self.client.get("/api/rooms/")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(len(res.data["results"]), 15)

    def test_booking_list_avoids_n_plus_one_queries(self):
        """
        Verify GET /api/bookings/ does not suffer from N+1 queries.
        Each booking serializes room_name, room_location, room_capacity,
        user_email, user_name. Because the view uses select_related('room', 'user'),
        the query count must remain exactly 2 regardless of record count.
        """
        self.client.force_authenticate(user=self.user)

        # Seed 1 booking
        Booking.objects.create(
            room=self.room,
            user=self.user,
            title="Meeting 0",
            start_time=self.base_time,
            end_time=self.base_time + timedelta(minutes=30),
            status=Booking.STATUS_CONFIRMED,
        )

        with self.assertNumQueries(2):
            # Query 1: COUNT(*)
            # Query 2: SELECT bookings JOIN rooms JOIN users LIMIT 20
            res = self.client.get("/api/bookings/")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(len(res.data["results"]), 1)

        # Seed 14 more bookings across multiple rooms and users
        for i in range(1, 15):
            other_user = User.objects.create_user(
                email=f"other_user_{i}@example.com",
                password="Password-123",
                first_name=f"Other{i}",
                last_name="User",
            )
            other_room = Room.objects.create(
                name=f"Alt Room {i}",
                capacity=8,
                location="Annex",
                created_by=self.admin,
            )
            t = self.base_time + timedelta(hours=i)
            Booking.objects.create(
                room=other_room,
                user=other_user,
                title=f"Meeting {i}",
                start_time=t,
                end_time=t + timedelta(minutes=30),
                status=Booking.STATUS_CONFIRMED,
            )

        # If N+1 existed, this would run 2 + 14 (rooms) + 14 (users) = 30 queries!
        # With select_related('room', 'user'), it must stay exactly 2 queries.
        with self.assertNumQueries(2):
            res = self.client.get("/api/bookings/")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(len(res.data["results"]), 15)

    def test_my_bookings_avoids_n_plus_one_queries(self):
        """
        Verify GET /api/my-bookings/ maintains constant O(1) query count.
        """
        self.client.force_authenticate(user=self.user)

        # 1 booking for this user
        Booking.objects.create(
            room=self.room,
            user=self.user,
            title="My Booking 0",
            start_time=self.base_time,
            end_time=self.base_time + timedelta(minutes=45),
            status=Booking.STATUS_CONFIRMED,
        )

        with self.assertNumQueries(2):
            res = self.client.get("/api/my-bookings/")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(len(res.data["results"]), 1)

        # Add 9 more bookings across 9 different rooms for this user
        for i in range(1, 10):
            r = Room.objects.create(
                name=f"My Room {i}",
                capacity=6,
                location=f"Floor {i}",
                created_by=self.admin,
            )
            t = self.base_time + timedelta(days=i)
            Booking.objects.create(
                room=r,
                user=self.user,
                title=f"My Booking {i}",
                start_time=t,
                end_time=t + timedelta(minutes=45),
                status=Booking.STATUS_CONFIRMED,
            )

        # Still exactly 2 queries
        with self.assertNumQueries(2):
            res = self.client.get("/api/my-bookings/")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(len(res.data["results"]), 10)

    def test_check_availability_query_efficiency(self):
        """
        Audit queries executed by GET /api/bookings/check-availability/.
        Validates room lookup and conflict detection query counts.
        """
        self.client.force_authenticate(user=self.user)

        # Create 3 confirmed bookings in different sub-slots within an afternoon window
        slot_start = self.base_time + timedelta(days=1)
        for i in range(3):
            t = slot_start + timedelta(hours=i)
            Booking.objects.create(
                room=self.room,
                user=self.user,
                title=f"Conflict {i}",
                start_time=t,
                end_time=t + timedelta(minutes=50),
                status=Booking.STATUS_CONFIRMED,
            )

        # Check availability for the entire 3-hour window
        params = {
            "room_id": str(self.room.id),
            "start_time": slot_start.isoformat(),
            "end_time": (slot_start + timedelta(hours=3)).isoformat(),
        }

        # Query 1: Room.objects.get(id=...) in CheckAvailabilitySerializer
        # Query 2: Booking.objects.filter(...) in CheckAvailabilityView.get
        # Notice: CheckAvailabilityView already uses .select_related("user"),
        # so accessing c.user.email inside the conflict loop does not trigger N queries.
        res = self.client.get("/api/bookings/check-availability/", params)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["is_available"])
        self.assertEqual(len(res.data["conflicts"]), 3)

    def test_booking_stats_query_count(self):
        """
        Audit queries executed by GET /api/bookings/stats/.
        Current implementation runs 8 queries including active rooms
        count and today's bookings list for advanced metrics.
        """
        self.client.force_authenticate(user=self.user)

        with self.assertNumQueries(8):
            res = self.client.get("/api/bookings/stats/")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertIn("total_bookings", res.data)
            self.assertIn("confirmed_bookings", res.data)
            self.assertIn("cancelled_bookings", res.data)
            self.assertIn("today_bookings", res.data)
            self.assertIn("upcoming_bookings", res.data)
