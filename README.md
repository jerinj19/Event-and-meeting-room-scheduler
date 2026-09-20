# Event & Meeting Room Scheduler

[![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=green)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance, full-stack application designed for enterprise teams to browse meeting rooms, book time slots securely without double-bookings, and manage reservation lifecycles.

---

## 🌟 Key Features

### Backend-Capable Features (Currently Implemented)

- **Database-Guaranteed Conflict Prevention:** PostgreSQL `ExclusionConstraint` with `btree_gist` ensures zero double-bookings even under concurrent access
- **Optimized Performance:** Fully optimized Django ORM using `select_related` and `prefetch_related` to eliminate N+1 queries
- **Comprehensive API Suite:** 21 tested and documented REST endpoints across authentication, room management, and booking operations
- **JWT-Based Authentication:** Secure token-based auth with access/refresh tokens and automatic blacklisting on logout
- **Role-Based Access Control:** Fine-grained permissions — regular users can book/view their own bookings; admins manage rooms
- **Complete Booking Lifecycle:** Create, view, modify, cancel bookings with proper permission checks
- **Availability Checking:** Real-time slot availability verification with conflict details
- **Input Validation:** Comprehensive server-side validation including room capacity, time ordering, past-booking rejection

### Roadmap Features (Frontend In Progress)

- **Robust Conflict Prevention:** Utilizes database-level PostgreSQL `ExclusionConstraints` to mathematically guarantee zero double-bookings, even under extreme concurrency
- **Optimized Performance:** Fully optimized Django ORM using `select_related` and `prefetch_related` to eliminate N+1 queries
- **Scalable Architecture:** Global pagination and JWT-based authentication
- **Comprehensive Dashboards:** Users can view room catalogs, make bookings, and manage their personal reservations

---

## 🛠 Tech Stack

### Backend

| Layer | Technology | Version/Purpose |
|-------|------------|-----------------|
| Framework | Django | 6.1.1 — full-featured Python web framework |
| API | Django REST Framework (DRF) | 3.18.1 — powerful and flexible API toolkit |
| Auth | SimpleJWT | 5.5.1 — JWT access/refresh token handling |
| Serialization | DRF Serializers | Custom validation and serialization |
| Database | PostgreSQL | With `btree_gist` extension — exclusion constraints |
| HTTP | Django built-in server / Gunicorn | Development and production |
| Env Config | python-dotenv | 1.0.1 — environment variable loading |
| Logging | Python logging | With file rotation (14-day backup) |

### Frontend

| Layer | Technology | Version/Purpose |
|-------|------------|-----------------|
| UI Library | React | 19.2.8 — declarative UI |
| Build Tool | Vite | 8.3.0 — fast dev server and build |
| Routing | react-router-dom | 7.18.4 — client-side routing |
| Styling | CSS Modules / inline CSS | Tailwind-like utility classes |
| Linting | Oxlint | 1.81.0 — fast JavaScript/JSX linting |

### Infrastructure

| Layer | Technology |
|-------|------------|
| Database | PostgreSQL 15+ (with `btree_gist` extension) |
| Containerization | Docker (services defined in `.github/workflows`) |
| CI/CD | GitHub Actions — backend checks pipeline |
| Version Control | Git with feature branch workflow |

---

## 🚀 Getting Started

### Prerequisites

| Component | Requirements |
|-----------|--------------|
| **Python** | 3.10+ (tested with 3.12) |
| **Node.js** | 18+ (for frontend) |
| **PostgreSQL** | 15+ with `btree_gist` extension enabled |
| **Git** | For version control |

### Local Setup (Backend)

1. **Navigate to backend directory:**

   ```bash
   cd C:\Users\Prashanthkolla\Desktop\Events\Event-and-meeting-room-scheduler\backend\config
   ```

2. **Create and activate a virtual environment:**

   ```bash
   python -m venv myenv
   # Windows:
   myenv\Scripts\activate
   # macOS/Linux:
   source myenv/bin/activate
   ```

3. **Install dependencies:**

   ```bash
   pip install -r ../requirements.txt
   ```

4. **Set up environment configuration:**

   ```bash
   cp .env.example .env
   # Edit .env with your settings (database credentials, JWT secrets, etc.)
   ```

5. **Run database migrations:**

   ```bash
   python manage.py migrate
   ```

6. **(Optional) Create superuser:**

   ```bash
   python manage.py createsuperuser
   ```

7. **Start the development server:**

   ```bash
   python manage.py runserver 8080
   ```

   API will be available at `http://127.0.0.1:8080/api/`

### Local Setup (Frontend)

1. **Navigate to frontend directory:**

   ```bash
   cd C:\Users\Prashanthkolla\Desktop\Events\Event-and-meeting-room-scheduler\frontend
   ```

2. **Install Node.js dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   ```

   Frontend will be available at `http://localhost:5173`

### Docker (Alternative)

The project includes GitHub Actions CI with PostgreSQL service. For Docker-based local development:

```bash
# Build and start all services
docker-compose up -d  # (if docker-compose.yml exists)

# Or manually:
docker run -d --name pg-scheduler \
  -e POSTGRES_DB=event_scheduler_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15

# Then follow the backend setup steps above
```

### Postman API Testing

A complete Postman test collection is included with 21 test cases covering all API endpoints:

- **File location:** `Start_To_End.postman_test_run.json`
- **Total tests:** 21 — covering authentication, room management, and booking operations
- **Status:** All tests pass (verified against running backend)
- **Run instructions:** Import the JSON into Postman and run the collection with the appropriate environment (default: `http://127.0.0.1:8080`)

---

## 📡 API Documentation

### Authentication Endpoints (5)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register/` | Register new user | Public |
| POST | `/api/auth/token/` | Login with email/password — returns JWT pair | Public |
| POST | `/api/auth/token/refresh/` | Refresh expired access token | Public |
| GET | `/api/auth/me/` | Get current authenticated user profile | JWT |
| POST | `/api/auth/logout/` | Blacklist refresh token and logout | JWT |

### Room Endpoints (6)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/rooms/` | List rooms with filtering (min_capacity, max_capacity, location, amenity, search) | Public (active only) |
| POST | `/api/rooms/` | Create new room (Admin/Staff only) | JWT |
| GET | `/api/rooms/{id}/` | Retrieve room details | Public |
| PUT | `/api/rooms/{id}/` | Full update room (Admin/Staff only) | JWT |
| PATCH | `/api/rooms/{id}/` | Partial update room (Admin/Staff only) | JWT |
| DELETE | `/api/rooms/{id}/` | Delete room (Admin/Staff only) | JWT |

### Booking Endpoints (10)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/bookings/` | List bookings with filtering (room, status, date range, search) | JWT |
| POST | `/api/bookings/` | Create new reservation | JWT |
| GET | `/api/bookings/{id}/` | Retrieve single booking details | JWT |
| PUT | `/api/bookings/{id}/` | Full update booking (owner or staff) | JWT |
| PATCH | `/api/bookings/{id}/` | Partial update booking (owner or staff) | JWT |
| DELETE | `/api/bookings/{id}/` | Delete booking (owner or staff) | JWT |
| POST | `/api/bookings/{id}/cancel/` | Cancel booking (owner or staff) | JWT |
| GET | `/api/bookings/check-availability/` | Check room availability with conflict details | JWT |
| GET | `/api/bookings/my-bookings/` | Get current user's bookings | JWT |
| GET | `/api/bookings/stats/` | Get booking summary statistics | JWT |

---

## 📊 Project Statistics

| Metric | Value |
|--------|-------|
| **Total API Endpoints** | 21 |
| **Backend Apps** | 3 (users, rooms, bookings) |
| **Database Models** | 2 (User, Room, Booking) |
| **Test Coverage** | 21 Postman tests + Django unit tests |
| **Git Branches** | feature/user-dashboard, feature/bookings, feature/rooms, main |
| **Primary Branch** | `feature/user-dashboard` (currently checked out) |
| **License** | MIT |
| **CI Pipeline** | GitHub Actions (backend checks on push/PR) |

---

## 🔐 Environment Configuration

### `.env.example` (Reference)

```
# Django
SECRET_KEY=your-django-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# PostgreSQL Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=event_scheduler_db
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_HOST=localhost
DB_PORT=5432

# CORS
CORS_ALLOW_ALL_ORIGINS=True  # Set to False in production and configure CORS_ALLOWED_ORIGINS

# JWT Authentication
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=7
```

### Production `.env` Checklist

- [ ] Change `SECRET_KEY` to a strong, randomly generated value
- [ ] Set `DEBUG=False`
- [ ] Configure `ALLOWED_HOSTS` with your domain(s)
- [ ] Set `CORS_ALLOW_ALL_ORIGINS=False` and specify `CORS_ALLOWED_ORIGINS`
- [ ] Use a strong `DB_PASSWORD`
- [ ] Set secure JWT token lifetimes (`JWT_ACCESS_MINUTES`, `JWT_REFRESH_DAYS`)
- [ ] Enable `POSTGRES_EXTENSIONS` to include `btree_gist`
- [ ] Configure trusted proxy if behind Load Balancer/NGINX
- [ ] Set up HTTPS/SSL termination

---

## 📦 Git & Deployment

### Current Branch State

```
$ git branch
* feature/user-dashboard
  main
```

### Recommended Workflow

1. **Continue frontend development** on the `feature/user-dashboard` branch
2. **When ready to integrate**, merge feature branches into `main`:
   ```bash
   git checkout main
   git merge feature/user-dashboard
   # Resolve any conflicts
   git push origin main
   ```

3. **GitHub Actions CI** will automatically run checks on push to `main`:
   - Django configuration check
   - Migration state validation
   - Test execution (users app tests)

### CI Pipeline (`.github/workflows/backend-ci.yml`)

The CI pipeline runs on every push/PR to `develop`, `main`, and feature branches:

1. Spin up PostgreSQL 15 service
2. Install Python dependencies
3. Verify Django configuration
4. Check migration state (no pending makemigrations)
5. Run users app tests (fast feedback loop)

### Docker Deployment

The project is designed for Docker deployment with PostgreSQL as a service. The GitHub Actions workflow already includes a PostgreSQL 15 service definition for cloud CI integration.

---

## 🧪 Testing

### Backend Tests

Located in `backend/config/`:
- `users/tests.py` — Authentication, registration, login, JWT token handling
- `rooms/tests.py` — Room CRUD, filtering, permissions
- `bookings/tests.py` — 36+ test cases covering booking flow, conflicts, validation, cancellation, stats

Run all tests:

```bash
cd backend/config
python manage.py test  # Runs all test modules
# Or run individually:
python manage.py test users
python manage.py test rooms
python manage.py test bookings
```

### Postman Collection

- **File:** `Start_To_End.postman_test_run.json`
- **21 tests** covering complete API workflow
- **All endpoints** tested: registration, login, room CRUD, booking creation/conflicts/cancellation, availability, stats
- **Expected result:** All 21 tests pass when backend is running on port 8080

---

## 👥 Project Structure

```
Event-and-meeting-room-scheduler/
├── .git/                    # Git repository
├── .github/                 # CI/CD workflows
├── .gitignore              # gitignore rules
├── .vscode/                # IDE settings
├── README.md               # ← This file (project overview)
├── README (1).md           # Alternative README format
├── backend/                # ← Backend Django project
│   ├── config/             # Django project configuration
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   ├── .env           # Environment variables (gitignored)
│   │   └── .env.example   # Environment template
│   ├── users/              # User management app
│   │   ├── models.py       # Custom User model (email-based)
│   │   ├── serializers.py  # Registration/login serializers
│   │   ├── views.py        # Auth views (register, token, me, logout)
│   │   ├── urls.py         # Auth URL patterns
│   │   ├── permissions.py  # Custom permission classes
│   │   ├── managers.py     # Custom UserManager
│   │   ├── exception_handlers.py  # Unified error formatting
│   │   ├── admin.py        # Django admin config
│   │   ├── migrations/     # Database migrations
│   │   └── tests.py        # Authentication tests
│   ├── rooms/              # Room management app
│   │   ├── models.py       # Room model (capacity, location, amenities)
│   │   ├── serializers.py  # Room serializer with amenities validation
│   │   ├── views.py        # RoomViewSet with filtering
│   │   ├── urls.py         # Room router URLs
│   │   ├── permissions.py  # IsAdminOrReadOnly permission
│   │   ├── admin.py        # Django admin config
│   │   ├── migrations/     # Database migrations
│   │   └── tests.py        # Room API tests
│   └── bookings/           # Booking/reservation app
│       ├── models.py       # Booking model with ExclusionConstraint
│       ├── serializers.py  # BookingSerializer with conflict detection
│       ├── views.py        # Booking views (CRUD, cancel, availability, stats)
│       ├── urls.py         # Booking URL patterns
│       ├── admin.py        # Django admin config
│       ├── migrations/     # Database migrations (incl. btree_gist)
│       └── tests.py        # 36+ booking API tests
├── frontend/               # ← Frontend React + Vite project
│   ├── src/                # React source files
│   │   ├── App.jsx         # App with ProtectedRoute
│   │   ├── index.html      # HTML template
│   │   ├── main.jsx        # Entry point
│   │   ├── App.css         # Global styles
│   │   ├── pages/          # Page components
│   │   │   ├── Dashboard.jsx   # User's bookings dashboard
│   │   │   ├── BookRoom.jsx    # Room booking form
│   │   │   ├── Login.jsx       # Authentication page
│   │   │   └── (more pages to be added)
│   │   └── assets/         # Images and icons
│   ├── package.json          # Dependencies (React 19, Vite, Oxlint)
│   ├── vite.config.js        # Vite configuration
│   ├── .gitignore            # Frontend gitignore
│   ├── README.md             # Frontend README template
│   ├── index.html
│   ├── package-lock.json
│   └── public/               # Static assets
```

---

## 📄 License

This project is licensed under the **MIT License**.

See the [LICENSE](LICENSE) file for full details (or add one if not present).

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/<feature-name>`
3. Commit your changes: `git commit -m "Your descriptive commit message"`
4. Push to the branch: `git push origin feature/<feature-name>`
5. Open a Pull Request against the `main` branch

**Current focus:** Frontend development on `feature/user-dashboard` branch. Backend is complete and ready for frontend integration.

---

## 📞 Contact & Support

- **Repository:** https://github.com/jerinj19/Event-and-meeting-room-scheduler
- **Issues:** Use GitHub Issues for bug reports and feature requests
- **Questions:** Contact the project maintainers via GitHub Discussions

---

*Generated for production readiness — September 2026*