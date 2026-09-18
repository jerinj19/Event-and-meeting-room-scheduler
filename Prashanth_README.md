# Prashanth — User Dashboard, Auth & Reservation Lifecycle Module

Part of the **[Event & Meeting Room Scheduler](./README.md)** project (React + Django REST Framework + PostgreSQL).

Owns: user authentication, JWT session handling, the "My Bookings" dashboard, and the cancellation workflow.

---

## Table of Contents

- [Scope](#scope)
- [Architecture Alignment](#architecture-alignment)
- [Data Model](#data-model)
- [Authentication Flow](#authentication-flow)
- [API Reference](#api-reference)
- [UI/UX Design Scope](#uiux-design-scope)
- [Backend Build Plan](#backend-build-plan)
- [Frontend Build Plan](#frontend-build-plan)
- [Git & Review Responsibilities](#git--review-responsibilities)
- [Final Validation & Presentation](#final-validation--presentation)

---

## Scope

This module covers **User Authentication, Personal Dashboards, and Booking Lifecycle Management**: secure login/signup, JWT session handling, the "My Bookings" dashboard, and the cancellation workflow. It's aligned with Jerin's (Room & Asset Management) and Srilaxmi's (Booking Engine & Conflict Validation) modules during shared architecture syncs.

---

## Architecture Alignment

- Attend the 2-hour cross-team architecture sync with Jerin and Srilaxmi to finalize **project-wide API contracts**.
- Own creation of the shared documentation templates: `README.md` and `api_contract.md`.
- Confirm with Srilaxmi how JWT Bearer tokens attach to booking-related requests.
- Confirm with Jerin/Srilaxmi the shared component styling rules from Google Stitch design tokens.

---

## Data Model

### Custom User Table (PostgreSQL)

| Column | Data Type | Constraints |
|---|---|---|
| id | UUID / Auto-increment ID | PRIMARY KEY |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| department | VARCHAR(100) | NULLABLE |

Extends Django's base user model with a `department` field and enforces unique, email-based identity — the identity anchor that `bookings.user_id` (Srilaxmi's table) references via foreign key.

### Booking Status State Transitions

Bookings created by Srilaxmi's engine default to `CONFIRMED`. This module owns the **user-facing transition** of a booking from `CONFIRMED → CANCELLED`, restricted to the booking's owning user.

---

## Authentication Flow

### Registration & Login

1. **Register:** `POST /api/auth/register/` — creates a new Custom User record (email, first/last name, optional department, password).
2. **Login / Token issue:** `POST /api/auth/token/` — authenticates credentials and returns a JWT **access token** and **refresh token**.
3. **Session persistence:** React stores the JWT pair in persistent Auth state (Auth Context), rehydrated on app load.
4. **Protected routing:** unauthenticated users are redirected away from dashboard/booking routes via a protected-route wrapper.
5. **Logout:** clears stored tokens and resets Auth Context.

### JWT Specification

| Aspect | Detail |
|---|---|
| Mechanism | SimpleJWT / Token-based authentication (DRF) |
| Token types | Access token (short-lived, sent as `Authorization: Bearer <token>`) + Refresh token |
| Consumers | Srilaxmi's booking endpoints require a valid Bearer token; Jerin's room write endpoints require Admin permission |
| Ownership enforcement | Custom DRF permission classes ensure a user can only view/edit/cancel **their own** bookings |

### Cross-Module Auth Dependency

Srilaxmi's `POST /api/bookings/` and `check-availability/` endpoints depend on this module's JWT layer for request authentication — verify together during the Full-Stack Integration phase sync.

---

## API Reference

| Method | Endpoint | Description | Access Control |
|---|---|---|---|
| POST | `/api/auth/token/` | Authenticate credentials, return JWT access/refresh tokens | Public |
| POST | `/api/auth/register/` | Register a new user | Public |
| GET | `/api/my-bookings/` | Retrieve bookings belonging to the authenticated user | Authenticated (self-only) |
| PATCH | `/api/bookings/{id}/cancel/` | Update booking status to `CANCELLED` | Authenticated, owner-only |

---

## UI/UX Design Scope

Designed in Google Stitch, exported to React:

- **Login / Register screens**
- **"My Bookings" Dashboard** — reservation history, upcoming vs. past
- **Cancellation Drawer** — confirm-and-cancel interaction

**Components:** `<BookingHistoryTable/>`, `<StatusBadge/>`, `<CancelModal/>`
**Shared utility:** global **Toast/Notification Context** for app-wide success/error feedback (usable by other modules)

---

## Backend Build Plan

1. Configure DRF authentication (JWT/Token) endpoints.
2. Implement `GET /api/my-bookings/` and `PATCH /api/bookings/{id}/cancel/`.
3. Write custom DRF permission classes restricting edit/cancel actions to the booking's own user.
4. Unit-test auth flows and ownership permission edge cases.

---

## Frontend Build Plan

1. Build persistent Auth state (JWT storage, login, logout, protected route wrapper).
2. Connect "My Bookings" dashboard to `GET /api/my-bookings/`.
3. Wire the Cancellation Drawer to `PATCH /api/bookings/{id}/cancel/` with **optimistic UI updates**.
4. Integrate global Toast/Notification context across success/error states.

---

## Git & Review Responsibilities

- **Git role:** Lead PR template setup, review standards, and AI-assisted code quality audits.
- Open PR: `feature/user-dashboard` → `develop`.
- Peer-review Jerin's Room Management & PostgreSQL Schema code.
- Run AI-assisted audits (Copilot/Cursor/Claude) on React component re-rendering efficiency and memory leaks.
- Lead team Git conflict resolution during the `develop` branch merge.

---

## Final Validation & Presentation

- **E2E test path (full lifecycle):** Register → View Rooms → Book Slot → View Dashboard → Cancel Booking.
- Finalize team retrospective documentation and AI-tool efficacy notes.
- Present the User Auth, Dashboard, and Lifecycle module (with live demo) at the final manager evaluation session.
