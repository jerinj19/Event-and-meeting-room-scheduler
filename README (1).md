# Event & Meeting Room Scheduler

A full-stack application for browsing meeting rooms, booking time slots, preventing double-bookings, and managing reservation lifecycles.

**Stack:** React · Django REST Framework (DRF) · PostgreSQL · JWT Auth · Google Stitch (design)

---

## Table of Contents

- [Overview](#overview)
- [Team & Module Ownership](#team--module-ownership)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Git Workflow](#git-workflow)
- [Project Timeline](#project-timeline)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [User Journey](#user-journey)

---

## Overview

The Event & Meeting Room Scheduler lets team members:
- View available meeting rooms and their amenities
- Reserve a time slot on a room, with server-side conflict prevention
- View and manage their own reservation history
- Cancel their own bookings

---

## Team & Module Ownership

| Module | Owner | Scope |
|---|---|---|
| **Room & Asset Management** | Jerin | Room schema, catalog UI, navigation shell, Git repo leadership |
| **Booking Engine & Conflict Validation** | Srilaxmi | Booking schema, overlap detection, time-slot picker, CI/CD linting |
| **User Dashboard, Auth & Reservation Lifecycle** | Prashanth | Auth, JWT, My Bookings dashboard, cancellation flow, PR standards |

> See [`Prashanth_README.md`](./Prashanth_README.md) for the standalone Auth & Dashboard module documentation.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│  ┌───────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ Navigation     │  │ Room Catalog /    │  │ Auth / My     │ │
│  │ Shell (Jerin)  │  │ Booking Modal     │  │ Bookings      │ │
│  │                │  │ (Jerin/Srilaxmi)  │  │ (Prashanth)   │ │
│  └───────────────┘  └──────────────────┘  └───────────────┘ │
└───────────────────────────┬───────────────────────────────────┘
                             │ Fetch/Axios + JWT Bearer token
┌───────────────────────────▼───────────────────────────────────┐
│                     Django REST Framework                    │
│  ┌───────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ RoomViewSet    │  │ BookingViewSet    │  │ Auth Views /  │ │
│  │ (Jerin)        │  │ (Srilaxmi)        │  │ My-Bookings   │ │
│  │                │  │                   │  │ (Prashanth)   │ │
│  └───────────────┘  └──────────────────┘  └───────────────┘ │
└───────────────────────────┬───────────────────────────────────┘
                             │ ORM
┌───────────────────────────▼───────────────────────────────────┐
│                        PostgreSQL                             │
│   rooms  ⇄ (FK)  bookings  ⇄ (FK)  users                      │
└─────────────────────────────────────────────────────────────┘
```

**Cross-module dependencies**
- `bookings.room_id` → FK to `rooms.id` (Jerin ↔ Srilaxmi)
- `bookings.user_id` → FK to `users.id` (Srilaxmi ↔ Prashanth)
- Booking requests carry JWT Bearer tokens issued by Prashanth's auth endpoints
- Selected room state flows from `<RoomCard/>` (Jerin) into `<BookingModal/>` (Srilaxmi)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Django REST Framework |
| Database | PostgreSQL |
| Auth | JWT (SimpleJWT / Token-based) |
| Design | Google Stitch (shared design tokens → exported React components) |
| AI Tooling | Copilot / Cursor / Claude — used for code audits (N+1 queries, security, re-render/memory-leak checks) |

---

## Database Schema

### `rooms` (Owner: Jerin)

| Column | Type | Constraints |
|---|---|---|
| id | UUID / Auto-increment | PRIMARY KEY |
| name | VARCHAR(100) | NOT NULL, UNIQUE |
| capacity | INTEGER | NOT NULL, CHECK (capacity > 0) |
| location | VARCHAR(150) | NOT NULL |
| amenities | JSONB | DEFAULT '[]' |
| is_active | BOOLEAN | DEFAULT TRUE |

### `bookings` (Owner: Srilaxmi)

| Column | Type | Constraints |
|---|---|---|
| id | UUID / Auto-increment | PRIMARY KEY |
| room_id | FK | REFERENCES rooms(id) ON DELETE CASCADE |
| user_id | FK | REFERENCES users(id) ON DELETE CASCADE |
| start_time | TIMESTAMPTZ | NOT NULL |
| end_time | TIMESTAMPTZ | NOT NULL, CHECK (end_time > start_time) |
| status | VARCHAR(20) | DEFAULT 'CONFIRMED' (CONFIRMED / CANCELLED) |
| created_at | TIMESTAMPTZ | — |

**Overlap detection rule:**
```
NOT (end_time <= new_start OR start_time >= new_end)
```

### `users` (Owner: Prashanth)

| Column | Type | Constraints |
|---|---|---|
| id | UUID / Auto-increment | PRIMARY KEY |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| department | VARCHAR(100) | NULLABLE |

---

## API Reference

| Method | Endpoint | Owner | Description |
|---|---|---|---|
| GET | `/api/rooms/` | Jerin | List rooms, filterable (e.g. `?min_capacity=10`) |
| POST | `/api/rooms/` | Jerin | Create a room (Admin permission) |
| GET | `/api/rooms/{id}/` | Jerin | Retrieve a room's details |
| GET | `/api/bookings/check-availability/` | Srilaxmi | Check if a room is free for a time range |
| POST | `/api/bookings/` | Srilaxmi | Create a booking; runs overlap validation, returns HTTP 409 on conflict |
| POST | `/api/auth/token/` | Prashanth | Authenticate; returns JWT access/refresh tokens |
| POST | `/api/auth/register/` | Prashanth | Register a new user |
| GET | `/api/my-bookings/` | Prashanth | List the authenticated user's bookings |
| PATCH | `/api/bookings/{id}/cancel/` | Prashanth | Set booking status to CANCELLED (owner-only) |

**Conflict payload:** all booking write endpoints return a standard HTTP 409 error structure (defined by Srilaxmi) so the frontend can render a consistent "Slot already taken" message.

---

## Git Workflow

- **Branches:** `feature/rooms` (Jerin) · `feature/bookings` (Srilaxmi) · `feature/user-dashboard` (Prashanth) → merged into `develop`
- **Repo setup & formatting rules:** Jerin
- **CI/CD linting & formatting checks:** Srilaxmi
- **PR template, review standards, AI-assisted audits:** Prashanth

**Cross-review assignments**
- Jerin → reviews Srilaxmi's Booking Logic & Overlap Validation
- Srilaxmi → reviews Prashanth's User Authentication & Dashboard code
- Prashanth → reviews Jerin's Room Management & PostgreSQL Schema code

**AI-assisted audit focus**
- Jerin → DRF N+1 query optimization
- Srilaxmi → input validation / SQL injection security audit
- Prashanth → React re-render efficiency / memory leak audit

---

## Project Timeline

| Phase | Jerin | Srilaxmi | Prashanth |
|---|---|---|---|
| 1. Blueprint & Schema | Draft `rooms` schema, Room API docs, init repo | Draft `bookings` schema, overlap algorithm spec, 409 payload spec | Draft user/auth extensions, auth endpoint specs, README/api_contract.md |
| 2. UI Design (Stitch) & Layout | Room Catalog, Detail Modal, nav shell, `<RoomCard/>`, `<AmenityBadge/>`, `<RoomGrid/>` | Time-Slot Picker, Booking Modal, `<TimeSlotPicker/>`, `<BookingForm/>` | Login/Register, My Bookings, Cancellation Drawer, `<BookingHistoryTable/>`, `<StatusBadge/>`, `<CancelModal/>`, Toast context |
| 3. Backend Development | Room model, serializer, viewset, filtering, unit tests | Booking model + FKs, overlap validation serializer, viewset | JWT auth endpoints, `/api/my-bookings/`, cancel endpoint, ownership permissions |
| 4. Full-Stack Integration | Connect Room views to API, live status indicators | Connect Booking Modal, 409 handling, timezone formatting | Auth state/token storage, protected routes, dashboard + cancel wiring, optimistic UI |
| 5. PR Reviews & AI Audit | PR `feature/rooms` → `develop`, review Srilaxmi, N+1 audit | PR `feature/bookings` → `develop`, review Prashanth, security audit | PR `feature/user-dashboard` → `develop`, review Jerin, lead conflict resolution |
| 6. Final Integration & Presentation | E2E testing, ER diagrams, present Room module | E2E testing, OpenAPI/Swagger docs, present Booking Engine | E2E user-journey testing, retrospective + AI efficacy notes, present Auth/Dashboard module |

**Daily shared syncs (2 hrs, all three):** Git/API conventions → design tokens → FK alignment → cross-module state wiring → JWT integration → final E2E flow.

---

## Getting Started

```bash
# Backend
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm start
```

---

## Testing

- Django unit tests cover Room CRUD, Booking overlap validation, and Auth/permission edge cases.
- End-to-end tests run the full pipeline together as a team pass.

---

## User Journey

```
Register → Login → View Rooms → Select Room → Book Slot (conflict check) → View "My Bookings" → Cancel Booking
```
