from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from .models import Booking


class BookingModelAndAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.now = timezone.now().replace(microsecond=0)
        self.base_start = self.now + timedelta(days=1, hours=10)
        self.base_end = self.base_start + timedelta(hours=2)

        self.booking1 = Booking.objects.create(
            title="Team Sync",
            description="Weekly sync meeting",
            room_name="Conference Room A",
            user_name="Alice",
            user_email="alice@example.com",
            start_time=self.base_start,
            end_time=self.base_end,
            attendees_count=8,
            status="CONFIRMED"
        )

    def test_create_booking_success(self):
        response = self.client.post('/api/bookings/', {
            "title": "Design Review",
            "description": "Discuss UI mockups",
            "room_name": "Conference Room B",
            "user_name": "Bob",
            "user_email": "bob@example.com",
            "start_time": (self.base_start).isoformat(),
            "end_time": (self.base_end).isoformat(),
            "attendees_count": 4,
            "status": "CONFIRMED"
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], "Design Review")

    def test_conflict_detection_overlapping_booking_rejected(self):
        # Attempt to book same room with overlapping 1 hour
        overlap_start = self.base_start + timedelta(hours=1)
        overlap_end = self.base_end + timedelta(hours=1)

        response = self.client.post('/api/bookings/', {
            "title": "Conflicting Meeting",
            "room_name": "Conference Room A",
            "user_name": "Charlie",
            "start_time": overlap_start.isoformat(),
            "end_time": overlap_end.isoformat(),
            "attendees_count": 2
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('conflict', response.data)

    def test_consecutive_bookings_in_same_room_allowed(self):
        # Meeting right after booking1 ends
        next_start = self.base_end
        next_end = next_start + timedelta(hours=1)

        response = self.client.post('/api/bookings/', {
            "title": "Followup Meeting",
            "room_name": "Conference Room A",
            "user_name": "Dave",
            "start_time": next_start.isoformat(),
            "end_time": next_end.isoformat(),
            "attendees_count": 5
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_invalid_time_end_before_start(self):
        response = self.client.post('/api/bookings/', {
            "title": "Invalid Meeting",
            "room_name": "Boardroom",
            "user_name": "Eve",
            "start_time": self.base_end.isoformat(),
            "end_time": self.base_start.isoformat(),
            "attendees_count": 3
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('end_time', response.data)

    def test_cancel_booking_frees_up_slot(self):
        # Cancel booking1
        response = self.client.post(f'/api/bookings/{self.booking1.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.booking1.refresh_from_db()
        self.assertEqual(self.booking1.status, 'CANCELLED')

        # Now booking the exact same slot in Conference Room A should succeed
        response = self.client.post('/api/bookings/', {
            "title": "New Booking After Cancellation",
            "room_name": "Conference Room A",
            "user_name": "Frank",
            "start_time": self.base_start.isoformat(),
            "end_time": self.base_end.isoformat(),
            "attendees_count": 6
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_check_availability_endpoint(self):
        # Check available room
        response = self.client.get('/api/bookings/check-availability/', {
            "room_name": "Conference Room B",
            "start_time": self.base_start.isoformat(),
            "end_time": self.base_end.isoformat()
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_available'])

        # Check busy room
        response = self.client.get('/api/bookings/check-availability/', {
            "room_name": "Conference Room A",
            "start_time": self.base_start.isoformat(),
            "end_time": self.base_end.isoformat()
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_available'])
        self.assertGreater(len(response.data['conflicts']), 0)

    def test_list_and_filter_bookings(self):
        response = self.client.get('/api/bookings/', {'room_name': 'Conference Room A'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        response_empty = self.client.get('/api/bookings/', {'room_name': 'NonExistentRoom'})
        self.assertEqual(response_empty.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_empty.data), 0)

    def test_booking_stats_endpoint(self):
        response = self.client.get('/api/bookings/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_bookings'], 1)
        self.assertEqual(response.data['confirmed_bookings'], 1)
