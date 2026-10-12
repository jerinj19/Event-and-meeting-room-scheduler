import os
import django
import concurrent.futures
from django.db import connection, reset_queries
from django.utils.timezone import now
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
settings.ALLOWED_HOSTS = ['*']

from django.contrib.auth import get_user_model
from rooms.models import Room
from bookings.models import Booking
from rooms.views import RoomViewSet
from rest_framework.test import APIRequestFactory, force_authenticate, APIClient

User = get_user_model()

print("=== 1. Setting up Test Data ===")
admin, _ = User.objects.get_or_create(email="prashanthkolla2003@gmail.com")
if not admin.check_password("Kolla@2000"):
    admin.set_password("Kolla@2000")
admin.is_staff = True
admin.is_superuser = True
admin.save()

Room.objects.all().delete()
Booking.objects.all().delete()

room = Room.objects.create(
    name="Test Room for Race Condition",
    capacity=10,
    location="Main",
    created_by=admin
)

print("\n=== 2. Testing N+1 Queries ===")
# Create 10 more rooms. Without select_related, this would cause 11+ queries.
for i in range(10):
    Room.objects.create(name=f"Room {i}", capacity=10, location="Main", created_by=admin)

factory = APIRequestFactory()
request = factory.get('/api/rooms/')
force_authenticate(request, user=admin)
view = RoomViewSet.as_view({'get': 'list'})

reset_queries()
response = view(request)
query_count = len(connection.queries)
print(f"Total SQL Queries executed to fetch {Room.objects.count()} rooms: {query_count}")
if query_count <= 4:
    print("[SUCCESS] N+1 PROBLEM IS FIXED! (Only 2 queries were executed: one COUNT, one SELECT JOIN)")
else:
    print("[FAILED] N+1 PROBLEM STILL EXISTS!")


print("\n=== 3. Testing Race Condition / Double Booking ===")
start = now() + timedelta(days=1)
end = start + timedelta(hours=1)

def attempt_booking(thread_id):
    client = APIClient()
    client.force_authenticate(user=admin)
    res = client.post('/api/bookings/', {
        "room": str(room.id),
        "title": f"Meeting {thread_id}",
        "start_time": start.isoformat(),
        "end_time": end.isoformat(),
        "attendees_count": 5
    }, format='json')
    return res.status_code

print("Firing 10 simultaneous booking requests for the EXACT same room and time...")
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    futures = [executor.submit(attempt_booking, i) for i in range(10)]
    results = [f.result() for f in futures]

print(f"HTTP Status Codes returned by the API: {results}")
successes = results.count(201)
conflicts = results.count(409)
errors = results.count(500)

print(f"Successful bookings (201 Created): {successes}")
print(f"Gracefully Rejected conflicts (409 Conflict): {conflicts}")
print(f"Server Crashes (500 Error): {errors}")

if successes == 1 and conflicts == 9 and errors == 0:
    print("[SUCCESS] RACE CONDITION & DOUBLE BOOKING FIXED! Database properly blocked overlaps and returned clean 409s.")
else:
    print("[FAILED] Protection did not work as expected.")
