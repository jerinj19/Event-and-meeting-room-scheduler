import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import timedelta
import uuid

from django.contrib.auth import get_user_model
from django.db import connection, transaction, IntegrityError, OperationalError
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rooms.models import Room

from bookings.models import Booking

User = get_user_model()


class ConcurrentDoubleBookingTests(TransactionTestCase):
    """
    Concurrency tests for double-booking prevention.
    Uses TransactionTestCase so that multiple worker threads can open separate
    database connections and test race conditions against PostgreSQL.
    """

    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_superuser(
            email=f"admin_{uuid.uuid4().hex[:8]}@example.com",
            password="Admin-password-123",
            first_name="Admin",
            last_name="User",
        )
        self.user1 = User.objects.create_user(
            email=f"alice_{uuid.uuid4().hex[:8]}@example.com",
            password="Alice-password-123",
            first_name="Alice",
            last_name="Smith",
        )
        self.user2 = User.objects.create_user(
            email=f"bob_{uuid.uuid4().hex[:8]}@example.com",
            password="Bob-password-123",
            first_name="Bob",
            last_name="Jones",
        )

        self.room = Room.objects.create(
            name=f"Executive Boardroom {uuid.uuid4().hex[:6]}",
            capacity=12,
            location="Floor 4, Suite 400",
            amenities=["Video Conference", "Digital Whiteboard"],
            is_active=True,
            created_by=self.admin,
        )

        tomorrow = (timezone.now() + timedelta(days=2)).replace(
            hour=14, minute=0, second=0, microsecond=0
        )
        self.start_time = tomorrow
        self.end_time = tomorrow + timedelta(hours=1)

    def test_concurrent_api_booking_race_condition_prevents_double_booking(self):
        """
        Simulate 2 concurrent threads simultaneously submitting POST /api/bookings/
        for the exact same room and overlapping time slot.

        Guarantees:
        - Exactly ONE request succeeds with HTTP 201 CREATED.
        - The competing request is rejected with HTTP 409 CONFLICT (BOOKING_CONFLICT).
        - Exactly ONE confirmed booking exists in the database.
        - No double booking is created.
        """
        start_barrier = threading.Barrier(2)

        def make_booking_request(user, title):
            client = APIClient()
            client.force_authenticate(user=user)
            payload = {
                "room": str(self.room.id),
                "title": title,
                "description": f"Concurrent booking test by {user.email}",
                "start_time": self.start_time.isoformat(),
                "end_time": self.end_time.isoformat(),
                "attendees_count": 4,
            }
            # Wait for all threads to synchronize so requests are fired simultaneously
            start_barrier.wait(timeout=10)
            res = client.post("/api/bookings/", payload, format="json")
            # Close connection for this thread
            connection.close()
            return res.status_code, res.data

        with ThreadPoolExecutor(max_workers=2) as executor:
            future1 = executor.submit(make_booking_request, self.user1, "Meeting Alice")
            future2 = executor.submit(make_booking_request, self.user2, "Meeting Bob")
            results = [future1.result(), future2.result()]

        status_codes = [r[0] for r in results]

        # Exactly one must succeed with 201
        self.assertEqual(
            status_codes.count(status.HTTP_201_CREATED),
            1,
            f"Expected exactly 1 booking to succeed, got status codes: {status_codes}",
        )

        # The other must fail with 409 Conflict
        self.assertEqual(
            status_codes.count(status.HTTP_409_CONFLICT),
            1,
            f"Expected the competing booking to fail with 409, got status codes: {status_codes}",
        )

        # Confirm at database level: exactly 1 booking exists
        confirmed_count = Booking.objects.filter(
            room=self.room,
            status=Booking.STATUS_CONFIRMED,
        ).count()
        self.assertEqual(
            confirmed_count,
            1,
            f"Database has {confirmed_count} bookings! Double booking prevention failed!",
        )

    def test_database_exclusion_constraint_enforced_under_concurrency(self):
        """
        Directly test PostgreSQL's ExclusionConstraint under concurrent transactions,
        bypassing Python serializer validation to prove that database-level
        exclusion constraint mathematically prevents double-booking.
        """
        start_barrier = threading.Barrier(2)

        def create_booking_direct(user, title):
            start_barrier.wait(timeout=10)
            error_occurred = None
            try:
                with transaction.atomic():
                    b = Booking(
                        room=self.room,
                        user=user,
                        title=title,
                        start_time=self.start_time,
                        end_time=self.end_time,
                        status=Booking.STATUS_CONFIRMED,
                    )
                    # Bypass model.clean() to test the raw database ExclusionConstraint
                    super(Booking, b).save()
            except (IntegrityError, OperationalError) as exc:
                error_occurred = exc
            finally:
                connection.close()
            return error_occurred

        with ThreadPoolExecutor(max_workers=2) as executor:
            future1 = executor.submit(create_booking_direct, self.user1, "Direct Insert 1")
            future2 = executor.submit(create_booking_direct, self.user2, "Direct Insert 2")
            results = [future1.result(), future2.result()]

        # Exactly one should have None (success) and the other should have IntegrityError or OperationalError
        errors = [r for r in results if r is not None]
        successes = [r for r in results if r is None]

        self.assertEqual(len(successes), 1, "Expected exactly one direct insert to succeed.")
        self.assertEqual(len(errors), 1, "Expected exactly one direct insert to fail with IntegrityError or OperationalError.")
        
        error_str = str(errors[0]).lower()
        self.assertTrue(
            "booking_prevent_overlapping" in error_str or "deadlock detected" in error_str or "exclusion constraint" in error_str,
            f"Expected PostgreSQL exclusion constraint or deadlock in error: {error_str}",
        )

        # Database must still have only 1 confirmed booking
        total_in_db = Booking.objects.filter(
            room=self.room,
            status=Booking.STATUS_CONFIRMED,
        ).count()
        self.assertEqual(total_in_db, 1)

    def test_concurrent_multiple_overlapping_slots_race_condition(self):
        """
        Test 4 concurrent requests with varying overlaps on the same room:
        Thread 1: 14:00 - 15:00 (base)
        Thread 2: 14:15 - 14:45 (inner)
        Thread 3: 13:30 - 14:30 (partial start)
        Thread 4: 14:30 - 15:30 (partial end)

        Only ONE should succeed, and remaining THREE must be rejected with 409.
        """
        workers = 4
        start_barrier = threading.Barrier(workers)

        # All 4 slots mutually intersect each other on [14:15, 14:45]
        slots = [
            (self.start_time, self.end_time),  # 14:00 - 15:00
            (self.start_time + timedelta(minutes=15), self.start_time + timedelta(minutes=45)),  # 14:15 - 14:45
            (self.start_time - timedelta(minutes=15), self.start_time + timedelta(minutes=45)),  # 13:45 - 14:45
            (self.start_time + timedelta(minutes=15), self.end_time + timedelta(minutes=15)),    # 14:15 - 15:15
        ]

        def attempt_booking(idx, start_t, end_t):
            client = APIClient()
            client.force_authenticate(user=self.user1)
            payload = {
                "room": str(self.room.id),
                "title": f"Concurrent Candidate {idx}",
                "start_time": start_t.isoformat(),
                "end_time": end_t.isoformat(),
                "attendees_count": 2,
            }
            start_barrier.wait(timeout=10)
            res = client.post("/api/bookings/", payload, format="json")
            connection.close()
            return res.status_code

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [
                executor.submit(attempt_booking, i, s[0], s[1])
                for i, s in enumerate(slots)
            ]
            results = [f.result() for f in futures]

        # Verify only 1 succeeded
        self.assertEqual(
            results.count(status.HTTP_201_CREATED),
            1,
            f"Expected exactly 1 booking out of 4 to succeed, got: {results}",
        )
        self.assertEqual(
            results.count(status.HTTP_409_CONFLICT),
            3,
            f"Expected 3 bookings to be rejected with 409, got: {results}",
        )

        # Verify database has exactly 1 booking
        self.assertEqual(
            Booking.objects.filter(room=self.room, status=Booking.STATUS_CONFIRMED).count(),
            1,
        )
