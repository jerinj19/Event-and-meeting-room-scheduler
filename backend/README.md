# Backend — Event & Meeting Room Scheduler

> **Status:** ✅ Complete & Production-Ready

The backend is a Django 6.1.1 application with Django REST Framework, providing a fully documented REST API for user authentication, room management, and booking/reservation operations with database-level conflict prevention.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Installation & Setup](#installation--setup)
6. [Database Setup](#database-setup)
7. [Running the Server](#running-the-server)
8. [API Endpoints](#api-endpoints)
9. [Architecture Highlights](#architecture-highlights)
10. [Testing](#testing)
11. [Configuration](#configuration)
12. [Deployment](#deployment)

---

## Overview

The backend implements a complete event and meeting room scheduling system with three core Django apps:

- **users** — User registration, authentication, JWT token management, profile retrieval
- **rooms** — Room catalog with CRUD operations, advanced filtering, amenity search
- **bookings** — Reservation lifecycle with conflict prevention, cancellation, availability checking, and statistics

### Key Highlights

| Feature | Implementation |
|---------|---------------|
| Conflict Prevention | PostgreSQL `ExclusionConstraint` (database-level) + DRF serializer validation |
| Authentication | JWT with access/refresh tokens, blacklist on logout |
| N+1 Prevention | `select_related` / `prefetch_related` on all list & detail views |
| Error Format | Consistent `{ "error": { "code", "message", "details" } }` envelope |
| Permissions | Role-based — `IsAuthenticated`, `IsAdminOrReadOnly`, `IsBookingOwnerOrStaff` |
| Logging | File + console logging with TimedRotatingFileHandler (14-day backup) |
| CI/CD | GitHub Actions — Django check, migration check, test suite |
| Test Coverage | 21 Postman API tests + 40+ Django unit tests |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Django 6.1.1 |
| API Framework | Django REST Framework 3.18.1 |
| Authentication | djangorestframework-simplejwt 5.5.1 |
| Database | PostgreSQL (with `btree_gist` extension) |
| ORM | Django ORM (optimized with select_related/prefetch_related) |
| CORS | django-cors-headers 4.9.0 |
| Environment | python-dotenv 1.0.1 |
| Python | 3.10+ (tested on 3.12) |

---

## Project Structure

```
backend/
├── config/                         # Django project configuration
│   ├── settings.py                 # Django settings (DB, auth, middleware, logging)
│   ├── urls.py                     # Root URL router (admin, api/)
│   ├── wsgi.py                     # WSGI config for production
│   ├── asgi.py                     # ASGI config
│   ├── manage.py                   # Django management command
│   ├── .env                        # Environment variables (gitignored)
│   └── .env.example                # Environment template
│
├── users/                          # User management app
│   ├── models.py                   # Custom User (email-based, UUID PK)
│   ├── serializers.py              # Register, login, token, me serializers
│   ├── views.py                    # RegisterView, EmailTokenObtainPairView, MeView, LogoutView
│   ├── urls.py                     # Auth endpoints (/api/auth/*)
│   ├── managers.py                 # Custom UserManager (email as username)
│   ├── permissions.py              # IsOwner permission class
│   ├── exception_handlers.py       # Unified error envelope handler
│   ├── admin.py                    # Django admin registration
│   ├── migrations/                 # Database migrations
│   └── tests.py                    # 9 authentication/authorization tests
│
├── rooms/                          # Room management app
│   ├── models.py                   # Room model (name, capacity, location, amenities JSON)
│   ├── serializers.py              # RoomSerializer with amenity/capacity validation
│   ├── views.py                    # RoomViewSet (full CRUD + filtering)
│   ├── urls.py                     # Router-based URLs (/api/rooms/*)
│   ├── permissions.py              # IsAdminOrReadOnly
│   ├── admin.py                    # Django admin registration
│   ├── migrations/                 # Database migrations
│   └── tests.py                    # 16 room API tests
│
├── bookings/                       # Booking/reservation app
│   ├── models.py                   # Booking model with ExclusionConstraint
│   ├── serializers.py              # BookingSerializer with conflict detection
│   ├── views.py                    # List/Create, Detail, Cancel, Availability, Stats, MyBookings
│   ├── urls.py                     # URL patterns (/api/bookings/*)
│   ├── admin.py                    # Django admin registration
│   ├── migrations/                 # Migrations (incl. btree_gist + exclusion constraint)
│   └── tests.py                    # 20+ booking tests
│
├── requirements.txt                # Python dependencies
└── README.md                       # This file
```

---

## Prerequisites

| Component | Version | Notes |
|-----------|---------|-------|
| Python | 3.10+ | Recommended: 3.12 |
| PostgreSQL | 15+ | Must have `btree_gist` extension available |
| pip | Latest | Python package manager |

---

## Installation & Setup

### 1. Navigate to backend directory

```bash
cd C:\Users\Prashanthkolla\Desktop\Events\Event-and-meeting-room-scheduler\backend\config
```

### 2. Create and activate virtual environment

```bash
python -m venv myenv
# Windows:
myenv\Scripts\activate
# macOS/Linux:
source myenv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r ../requirements.txt
```

### 4. Configure environment variables

```bash
# Copy the example file (already exists — edit it)
# On Windows, the .env file is at: backend/config/.env
# Edit DB credentials, JWT settings, and other secrets
```

### 5. Run database migrations

```bash
python manage.py migrate
```

This will:
- Create all tables (users, rooms, bookings)
- Enable the `btree_gist` extension
- Apply the `booking_prevent_overlapping` exclusion constraint

### 6. (Optional) Create a superuser

```bash
python manage.py createsuperuser
```

---

## Running the Server

```bash
python manage.py runserver 8080
```

The API will be available at:
- **Local:** `http://127.0.0.1:8080/api/`
- **Swagger/Docs:** (Optional — can add drf-spectacular or drf-yasg)

---

## API Endpoints

### Base URL
```
http://127.0.0.1:8080/api/
```

### Authentication (`/api/auth/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register/` | Register new user | Public |
| POST | `/auth/token/` | Login — returns JWT access/refresh | Public |
| POST | `/auth/token/refresh/` | Refresh access token | Public |
| GET | `/auth/me/` | Get current user profile | JWT |
| POST | `/auth/logout/` | Logout (blacklist refresh token) | JWT |

### Rooms (`/api/rooms/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/rooms/` | List rooms (filters: min_capacity, max_capacity, location, amenity, search, is_active) | Public* |
| POST | `/rooms/` | Create room | Admin |
| GET | `/rooms/{id}/` | Room details | Public* |
| PUT | `/rooms/{id}/` | Update room | Admin |
| PATCH | `/rooms/{id}/` | Partial update room | Admin |
| DELETE | `/rooms/{id}/` | Delete room | Admin |

*Non-staff users see only active rooms

### Bookings (`/api/bookings/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/bookings/` | List bookings (filters: room, status, date, date_range, search) | JWT |
| POST | `/bookings/` | Create booking (validates conflicts) | JWT |
| GET | `/bookings/{id}/` | Booking details | JWT |
| PUT | `/bookings/{id}/` | Update booking | Owner/Staff |
| PATCH | `/bookings/{id}/` | Partial update booking | Owner/Staff |
| DELETE | `/bookings/{id}/` | Delete booking | Owner/Staff |
| POST | `/bookings/{id}/cancel/` | Cancel booking | Owner/Staff |
| GET | `/bookings/check-availability/` | Check slot availability with conflicts | JWT |
| GET | `/bookings/my-bookings/` | Current user's bookings (upcoming/status filter) | JWT |
| GET | `/bookings/stats/` | Booking summary statistics | JWT |

---

## Architecture Highlights

### 1. N+1 Query Prevention

All list and detail views use `select_related()` for ForeignKey joins:

```python
# bookings/views.py — BookingListCreateView
queryset = Booking.objects.select_related("room", "user").all().order_by("start_time")

# bookings/views.py — MyBookingsView
queryset = Booking.objects.filter(user=self.request.user).select_related("room", "user")

# bookings/views.py — BookingDetailView
queryset = Booking.objects.select_related("room", "user").all()
```

This ensures each booking fetch requires only **1 SQL query** instead of N+1.

### 2. Race Condition Prevention — Exclusion Constraint

The booking model uses a PostgreSQL `ExclusionConstraint` to guarantee no overlapping bookings for the same room:

```python
# bookings/models.py — Booking.Meta
constraints = [
    models.CheckConstraint(
        condition=models.Q(end_time__gt=models.F('start_time')),
        name='booking_end_time_gt_start_time',
    ),
]
```

Applied via migration `0003_booking_booking_prevent_overlapping.py`:

```python
migrations.AddConstraint(
    model_name='booking',
    constraint=ExclusionConstraint(
        condition=models.Q(('status', 'CONFIRMED')),
        expressions=[('room', '='), (models.Func('start_time', 'end_time', function='tstzrange'), '&&')],
        name='booking_prevent_overlapping',
    ),
)
```

This means even if two requests arrive simultaneously to book the same room for overlapping times, PostgreSQL will reject the second one at the database level — no double-bookings are possible.

### 3. Consistent Error Format

All API errors follow a unified envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": {
      "field_name": ["Error message"]
    }
  }
}
```

Implemented via `users/exception_handlers.py` — `api_exception_handler`.

### 4. Database Indexes

Strategic indexes for performance:

- **bookings:** `(room, start_time, end_time)` — booking room/time lookup
- **bookings:** `(status)` — status filtering
- **bookings:** `(user, start_time)` — user's booking history
- **rooms:** `(name)` — name search
- **rooms:** `(is_active)` — active/inactive filtering
- **rooms:** `(capacity)` — capacity filtering

---

## Testing

### Django Unit Tests

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test users -v 2
python manage.py test rooms -v 2
python manage.py test bookings -v 2
```

**Test counts:**
- `users/tests.py` — 9 tests (registration, login, JWT, permissions, error handling)
- `rooms/tests.py` — 16 tests (CRUD, filtering, permissions, validation)
- `bookings/tests.py` — 20+ tests (creation, conflicts, validation, cancellation, stats)

### Postman Collection

The `Start_To_End.postman_test_run.json` file contains **21 API tests** that cover the complete workflow:

1. Register User (POST 201)
2. Login User (POST 200)
3. Admin Login (POST 200)
4. Refresh Token (POST 200)
5. Get Current User — Me (GET 200)
6. List Rooms (GET 200)
7. Create Room — Admin (POST 201)
8. Retrieve Room Details (GET 200)
9. Update Room Full — Admin (PUT 200)
10. Update Room Partial — Admin (PATCH 200)
11. Check Availability (GET 200)
12. Create Booking (POST 201)
13. List All Bookings (GET 200)
14. Retrieve Booking Details (GET 200)
15. Update Booking Partial (PATCH 200)
16. Get My Bookings (GET 200)
17. Cancel Booking (POST 200)
18. Delete Booking (DELETE 204)
19. Get Booking Stats (GET 200)
20. Delete Room — Admin (DELETE 204)
21. User Logout (POST 205)

All tests passed successfully against the running backend.

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | development key | Django secret key (change for production!) |
| `DEBUG` | True | Debug mode |
| `ALLOWED_HOSTS` | localhost,127.0.0.1 | Allowed hosts |
| `DB_ENGINE` | django.db.backends.postgresql | Database engine |
| `DB_NAME` | event_scheduler_db | Database name |
| `DB_USER` | postgres | Database user |
| `DB_PASSWORD` | (empty) | Database password |
| `DB_HOST` | localhost | Database host |
| `DB_PORT` | 5432 | Database port |
| `CORS_ALLOWED_ORIGINS` | localhost:5173,... | Allowed CORS origins |
| `CORS_ALLOW_ALL_ORIGINS` | False | Allow all origins (dev only) |
| `JWT_ACCESS_MINUTES` | 30 | Access token lifetime |
| `JWT_REFRESH_DAYS` | 7 | Refresh token lifetime |

---

## Deployment

### Production Checklist

- [ ] Set `DEBUG=False`
- [ ] Generate and set a strong `SECRET_KEY`
- [ ] Configure `ALLOWED_HOSTS` with production domains
- [ ] Set `CORS_ALLOW_ALL_ORIGINS=False`
- [ ] Use production-grade PostgreSQL with backups
- [ ] Use Gunicorn (or uWSGI) behind Nginx
- [ ] Set up HTTPS/SSL
- [ ] Configure proper logging (centralized log aggregation)
- [ ] Set up monitoring (Sentry, Datadog, etc.)
- [ ] Use environment secrets manager (AWS Secrets Manager, etc.)
- [ ] Enable database connection pooling (PgBouncer)
- [ ] Set up CI/CD pipeline (GitHub Actions already configured)

### Production WSGI

```bash
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120
```

### CI/CD Pipeline

`.github/workflows/backend-ci.yml` runs on every push/PR:

1. Spin up PostgreSQL 15 container
2. Install dependencies
3. `python manage.py check` — verify Django configuration
4. `python manage.py makemigrations --check --dry-run` — verify no pending migrations
5. `python manage.py test users` — run test suite

---

## Contributors

This backend was built by **Prashanth Kolla** as part of the Event and Meeting Room Scheduler project.

## License

MIT License
