import os
import sys
import django
from datetime import timedelta
import random

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from django.contrib.auth import get_user_model
from rooms.models import Room
from bookings.models import Booking

User = get_user_model()

WORDS = ["Alpha", "Beta", "Gamma", "Delta", "Echo", "Strategy", "Sync", "Planning", "Review", "Creative"]
SENTS = ["Discussing Q3 goals.", "Weekly sync up.", "Project planning session.", "Client review meeting.", "Design workshop."]

def seed_database():
    print("Starting database seeding...")

    # 1. Create Users
    admin_email = "prashanthkolla123@gmail.com"
    user_email = "zzz@gmail.com"
    password = "Kolla@2000"

    admin_user, created = User.objects.get_or_create(email=admin_email)
    if created:
        admin_user.set_password(password)
        admin_user.is_superuser = True
        admin_user.is_staff = True
        admin_user.first_name = "Prashanth"
        admin_user.last_name = "Admin"
        admin_user.save()
        print(f"Created admin: {admin_email}")

    normal_user, created = User.objects.get_or_create(email=user_email)
    if created:
        normal_user.set_password(password)
        normal_user.first_name = "Test"
        normal_user.last_name = "User"
        normal_user.save()
        print(f"Created user: {user_email}")
        
    dummy_users = []
    for i in range(3):
        email = f"dummy{i}@innovyx.com"
        u, c = User.objects.get_or_create(email=email)
        if c:
            u.set_password(password)
            u.first_name = random.choice(["John", "Jane", "Alice", "Bob", "Charlie"])
            u.last_name = random.choice(["Doe", "Smith", "Johnson", "Williams", "Brown"])
            u.save()
        dummy_users.append(u)
        
    all_users = [admin_user, normal_user] + dummy_users

    # 2. Create Rooms
    # Categories: pods (1-4), hubs (5-10), boardrooms (11-20), townhalls (21+)
    capacities = [
        2, 3, 4, 4, 4,       # 5 Pods
        6, 8, 8, 10, 10,     # 5 Hubs
        12, 14, 15, 18, 20,  # 5 Boardrooms
        30, 50, 100, 150, 200 # 5 Townhalls
    ]
    
    rooms = []
    for i, cap in enumerate(capacities, 1):
        room_name = f"Room {random.choice(WORDS)} {i}"
        room, created = Room.objects.get_or_create(
            name=room_name,
            defaults={
                'capacity': cap,
                'location': f"Floor {random.randint(1, 5)}",
                'amenities': ["Projector", "Whiteboard", "Video Conferencing"],
                'is_active': True
            }
        )
        if not created:
            # Update capacity if it exists but is wrong
            room.capacity = cap
            room.save()
        rooms.append(room)
    
    print(f"Ensured {len(rooms)} rooms exist.")

    # 3. Create Bookings (Last 90 days)
    print("Generating bookings for the last 90 days...")
    Booking.objects.all().delete() # Clear existing bookings to avoid conflicts during seed
    
    now = timezone.now()
    start_date = now - timedelta(days=90)
    
    bookings_created = 0
    # Generate ~5-15 bookings per day
    for day_offset in range(91):
        current_date = start_date + timedelta(days=day_offset)
        
        # Skip some weekends
        if current_date.weekday() >= 5 and random.random() < 0.7:
            continue
            
        num_bookings_today = random.randint(5, 15)
        
        # Track booked slots for this day to avoid conflicts
        # Format: (room_id, start_hour)
        booked_slots = set()
        
        for _ in range(num_bookings_today):
            room = random.choice(rooms)
            user = random.choice(all_users)
            
            # Random start hour between 8 AM and 5 PM
            start_hour = random.randint(8, 17)
            duration_hours = random.choice([1, 1, 1, 2, 2, 3]) # Bias towards 1-2 hours
            
            # Check conflict
            conflict = False
            for h in range(start_hour, start_hour + duration_hours):
                if (room.id, h) in booked_slots:
                    conflict = True
                    break
                    
            if not conflict:
                # Add to booked slots
                for h in range(start_hour, start_hour + duration_hours):
                    booked_slots.add((room.id, h))
                    
                b_start = current_date.replace(hour=start_hour, minute=0, second=0, microsecond=0)
                b_end = b_start + timedelta(hours=duration_hours)
                
                # Some might be cancelled
                status = 'CONFIRMED' if random.random() < 0.9 else 'CANCELLED'
                
                Booking.objects.create(
                    room=room,
                    user=user,
                    title=f"{random.choice(WORDS)} Meeting",
                    description=random.choice(SENTS),
                    start_time=b_start,
                    end_time=b_end,
                    status=status
                )
                bookings_created += 1

    print(f"Successfully generated {bookings_created} bookings over the last 90 days!")

if __name__ == '__main__':
    seed_database()
