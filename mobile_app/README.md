# Event & Meeting Room Scheduler - Flutter Mobile Application

A cross-platform Flutter application for the **Event & Meeting Room Scheduler** enterprise system. Connects directly to the existing Django REST Framework backend with PostgreSQL.

---

## 📱 Features

- **Authentication & User Management**:
  - Secure JWT authentication (`/api/auth/token/`) with transparent token refresh (`/api/auth/token/refresh/`).
  - Account registration with email domain validation (`@innovyx.com`, `@gmail.com`, `@innovyxtechlabs.com`).
  - Session caching via `shared_preferences` and secure logout (`/api/auth/logout/`).
- **User Dashboard**:
  - Live statistics display (confirmed bookings, active rooms, room utilization, and efficiency metrics).
  - Quick action shortcuts for quick booking and catalog browsing.
  - Upcoming meeting schedule card.
- **Meeting Room Catalog & Discovery**:
  - Search rooms by name or location in real-time.
  - Filter by minimum capacity, amenities, or floor.
  - Detailed room specifications: AV equipment, acoustics, connectivity, hourly rates, and high-resolution photo galleries.
- **Intelligent Booking Engine**:
  - Real-time pre-flight slot checking (`/api/bookings/check-availability/`).
  - Enterprise conflict prevention and HTTP 409 handling (`BOOKING_CONFLICT`), highlighting conflicting meeting details and organizer names.
  - Past-date/past-time booking validation and input guards.
- **My Bookings Management**:
  - Filter between Active/Upcoming and Cancelled bookings.
  - In-app booking cancellation with confirmation modal (`PATCH /api/bookings/{id}/cancel/`).
  - Duration, session, and status badge indicators.
- **Admin Management Console** *(Accessible by staff/admin roles)*:
  - Enterprise metrics and utilization overview.
  - Meeting room CRUD: create new rooms, edit existing room metadata, toggle active/maintenance status.
  - System-wide booking schedule review and administrative cancellation.
- **Dynamic Server URL Switcher**:
  - Integrated server settings modal allowing seamless switching between Android emulator (`http://10.0.2.2:8000/api`), Localhost (`http://localhost:8000/api`), or LAN/Cloud IP addresses without recompiling.

---

## 🏗️ Architecture & Project Structure

The project follows a clean **MVVM (Model-View-ViewModel)** architectural pattern with the **Provider** state management library.

```
mobile_app/lib/
├── core/
│   ├── config/
│   │   └── api_config.dart            # Base URL resolution & dynamic runtime switcher
│   ├── network/
│   │   ├── api_client.dart            # JWT-intercepted HTTP client with automatic refresh
│   │   └── api_exceptions.dart        # Unified backend error envelope & 409 conflict extractor
│   ├── theme/
│   │   └── app_theme.dart             # Modern material design theme tokens
│   └── utils/
│       ├── date_formatter.dart        # ISO 8601 formatting, duration & interval helpers
│       └── validators.dart            # Form input validation rules
├── data/
│   ├── models/
│   │   ├── user_model.dart            # Django User serializer mapping
│   │   ├── room_model.dart            # Room & amenities serializer mapping
│   │   ├── booking_model.dart         # Booking & session serializer mapping
│   │   ├── conflict_model.dart        # 409 Conflict payload extractor
│   │   └── stats_model.dart           # Dashboard statistics serializer mapping
│   └── repositories/
│       ├── auth_repository.dart       # Login, register, profile, and token management
│       ├── room_repository.dart       # Room catalog queries and Admin CRUD
│       └── booking_repository.dart    # Availability check, reservation, cancellation, stats
├── providers/
│   ├── auth_provider.dart             # Authentication state, user profile, role guard
│   ├── room_provider.dart             # Catalog search, filter state, room mutations
│   └── booking_provider.dart          # Booking creation, conflict state, cancellations
├── screens/
│   ├── splash/
│   │   └── splash_screen.dart         # Session restoration & auto-routing
│   ├── auth/
│   │   ├── login_screen.dart          # Sign in screen with server settings shortcut
│   │   └── register_screen.dart       # Account registration screen
│   ├── dashboard/
│   │   ├── user_dashboard_screen.dart # Home dashboard with stats and upcoming schedule
│   │   └── widgets/                   # Stat cards, quick action tiles
│   ├── rooms/
│   │   ├── room_catalog_screen.dart   # Interactive catalog with search & filter sheet
│   │   ├── room_detail_screen.dart    # Comprehensive room specifications & booking trigger
│   │   └── widgets/                   # Room cards, filter bottom sheet
│   ├── booking/
│   │   ├── book_room_screen.dart      # Slot selection, form validation & availability check
│   │   ├── booking_success_screen.dart# Confirmation receipt screen
│   │   └── widgets/                   # 409 Conflict alert dialog
│   ├── my_bookings/
│   │   ├── my_bookings_screen.dart    # Personal booking timeline & status tabs
│   │   └── widgets/                   # Booking cards, cancellation modal
│   ├── admin/
│   │   ├── admin_dashboard_screen.dart# Admin control center
│   │   ├── admin_room_list_screen.dart# Admin room catalog with edit/delete actions
│   │   ├── admin_room_form_screen.dart# Room creation & editing form
│   │   └── admin_bookings_screen.dart # All-enterprise bookings viewer
│   ├── settings/
│   │   └── server_settings_dialog.dart# Runtime API base URL editor with ping test
│   └── main_navigation_screen.dart    # Bottom navigation shell with dynamic admin tab
└── main.dart                          # Application entry point & Provider hierarchy
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Flutter SDK](https://flutter.dev) (v3.29.0 or higher)
- Existing Django REST backend running on `http://localhost:8000`

### 2. Install Dependencies
```bash
cd mobile_app
flutter pub get
```

### 3. Run Static Analysis & Tests
```bash
flutter analyze
flutter test
```

### 4. Launch Application

- **Android Emulator**:
  ```bash
  flutter run
  ```
  *(Default base URL automatically configures to `http://10.0.2.2:8000/api` on Android)*

- **Windows Desktop**:
  ```bash
  flutter run -d windows
  ```
  *(Connects to `http://localhost:8000/api`)*

- **Web Browser (Chrome)**:
  ```bash
  flutter run -d chrome
  ```
  *(Connects to `http://localhost:8000/api`)*

---

## 🔑 Test Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `prashanthkolla123@gmail.com` | `Kolla@2000` |
| **Member** | `flutter_demo@innovyx.com` | `FlutterDemo123!` |
| **Member (Seeded)** | `zzz@gmail.com` | `Kolla@2000` |
