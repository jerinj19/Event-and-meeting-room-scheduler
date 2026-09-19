import uuid
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import Room

User = get_user_model()


class RoomAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Regular authenticated user
        self.regular_user = User.objects.create_user(
            email="user@example.com",
            password="A-secure-password-123",
            first_name="Regular",
            last_name="User",
            department="Design",
        )

        # Admin / staff user
        self.admin_user = User.objects.create_superuser(
            email="admin@example.com",
            password="An-admin-password-123",
            first_name="Admin",
            last_name="Boss",
        )

        # Pre-seed rooms
        self.room_a = Room.objects.create(
            name="Boardroom Alpha",
            capacity=20,
            location="Floor 3, East Wing",
            amenities=["Video Conference", "Projector", "Whiteboard"],
            is_active=True,
            created_by=self.admin_user,
        )

        self.room_b = Room.objects.create(
            name="Huddle Beta",
            capacity=6,
            location="Floor 2, West Wing",
            amenities=["TV Screen", "Whiteboard"],
            is_active=True,
            created_by=self.admin_user,
        )

        self.inactive_room = Room.objects.create(
            name="Storage Gamma",
            capacity=4,
            location="Basement",
            amenities=[],
            is_active=False,
            created_by=self.admin_user,
        )

    # -------------------------------------------------------------
    # Authentication & Permission Tests
    # -------------------------------------------------------------

    def test_unauthenticated_user_cannot_access_rooms_list(self):
        """Unauthenticated requests to /api/rooms/ must receive 401."""
        response = self.client.get("/api/rooms/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_user_cannot_access_room_detail(self):
        """Unauthenticated requests to /api/rooms/<id>/ must receive 401."""
        response = self.client.get(f"/api/rooms/{self.room_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_rooms(self):
        """Authenticated regular user can browse rooms."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get("/api/rooms/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Regular users only see active rooms by default (room_a, room_b)
        self.assertEqual(len(response.data), 2)
        names = [r["name"] for r in response.data]
        self.assertIn("Boardroom Alpha", names)
        self.assertIn("Huddle Beta", names)
        self.assertNotIn("Storage Gamma", names)

    def test_authenticated_user_can_retrieve_room_detail(self):
        """Authenticated regular user can retrieve a single room."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(f"/api/rooms/{self.room_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Boardroom Alpha")
        self.assertEqual(response.data["capacity"], 20)
        self.assertIn("Video Conference", response.data["amenities"])

    def test_regular_user_cannot_create_room(self):
        """Regular non-staff users must be forbidden from creating rooms (403)."""
        self.client.force_authenticate(user=self.regular_user)
        payload = {
            "name": "Unauthorized Room",
            "capacity": 10,
            "location": "Floor 1",
            "amenities": ["Whiteboard"],
        }
        response = self.client.post("/api/rooms/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_cannot_update_room(self):
        """Regular non-staff users must be forbidden from updating rooms (403)."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.patch(
            f"/api/rooms/{self.room_a.id}/",
            {"capacity": 25},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_cannot_delete_room(self):
        """Regular non-staff users must be forbidden from deleting rooms (403)."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.delete(f"/api/rooms/{self.room_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # -------------------------------------------------------------
    # Admin CRUD & Alignment Tests
    # -------------------------------------------------------------

    def test_admin_can_create_room_successfully(self):
        """Admin can create a new room, auto-aligning created_by with the User table."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "name": "Conference Hall C",
            "capacity": 50,
            "location": "Ground Floor",
            "amenities": ["Projector", "Sound System", "Stage"],
            "is_active": True,
        }
        response = self.client.post("/api/rooms/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Conference Hall C")
        self.assertEqual(response.data["created_by_email"], self.admin_user.email)

        # Verify persisted in database
        created = Room.objects.get(name="Conference Hall C")
        self.assertEqual(created.created_by, self.admin_user)
        self.assertEqual(created.capacity, 50)

    def test_admin_can_update_room(self):
        """Admin can update room capacity or details."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            f"/api/rooms/{self.room_b.id}/",
            {"capacity": 8, "location": "Floor 2, Renovated Wing"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.room_b.refresh_from_db()
        self.assertEqual(self.room_b.capacity, 8)
        self.assertEqual(self.room_b.location, "Floor 2, Renovated Wing")

    def test_admin_can_delete_room(self):
        """Admin can delete a room."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f"/api/rooms/{self.inactive_room.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Room.objects.filter(id=self.inactive_room.id).exists())

    # -------------------------------------------------------------
    # Validation Tests
    # -------------------------------------------------------------

    def test_create_room_rejects_duplicate_name(self):
        """Room name must be unique."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "name": "Boardroom Alpha",  # Already exists
            "capacity": 15,
            "location": "Anywhere",
        }
        response = self.client.post("/api/rooms/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_room_rejects_zero_or_negative_capacity(self):
        """Capacity must be greater than 0."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            "/api/rooms/",
            {"name": "Zero Room", "capacity": 0, "location": "Any"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_room_rejects_invalid_amenities_format(self):
        """Amenities must be a list of strings."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            "/api/rooms/",
            {"name": "Invalid Amenities Room", "capacity": 10, "location": "Any", "amenities": "Just a string"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------
    # Query Filtering Tests
    # -------------------------------------------------------------

    def test_filter_by_min_capacity(self):
        """Filter rooms with ?min_capacity=10."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get("/api/rooms/", {"min_capacity": 10})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Boardroom Alpha")

    def test_filter_by_amenity(self):
        """Filter rooms having a specific amenity."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get("/api/rooms/", {"amenity": "Video Conference"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Boardroom Alpha")

    def test_filter_by_location(self):
        """Filter rooms by location substring."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get("/api/rooms/", {"location": "West Wing"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Huddle Beta")

    def test_search_by_name_or_location(self):
        """Search query matching name or location."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get("/api/rooms/", {"search": "Alpha"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Boardroom Alpha")
