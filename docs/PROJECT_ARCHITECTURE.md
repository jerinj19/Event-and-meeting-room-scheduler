# Event and Meeting Room Scheduler - Project Architecture

## Overview
The Event and Meeting Room Scheduler is a full-stack web application designed for enterprise teams to browse meeting rooms, book time slots securely without double-bookings, and manage reservation lifecycles. The application implements robust conflict prevention using database-level PostgreSQL ExclusionConstraints to mathematically guarantee zero double-bookings, even under extreme concurrency.

## System Architecture

### Technology Stack
- **Frontend:** React with Vite, React Router DOM
- **Backend:** Django 6.1.1 with Django REST Framework (DRF)
- **Database:** PostgreSQL with `btree_gist` extension for exclusion constraints
- **Authentication:** JWT (SimpleJWT) with refresh token rotation and blacklisting
- **API Communication:** RESTful JSON API
- **Development Tools:** Git, Postman for API testing

### Component Architecture

#### Backend (Django)
The backend follows a microservice-inspired modular architecture with three core Django apps:

1. **users App**
   - Custom User model (email-based authentication)
   - User registration, authentication, profile management
   - JWT token handling (obtain, refresh, logout)
   - Role-based access control (staff/admin vs regular users)

2. **rooms App**
   - Room management (CRUD operations)
   - Room attributes: name, capacity, location, amenities (JSON), active status
   - Admin-only creation/modification/deletion
   - Public browsing with filtering capabilities
   - Soft deletion pattern (is_active flag)

3. **bookings App**
   - Core booking/reservation system
   - Conflict detection and prevention
   - Booking lifecycle management (confirmed/cancelled)
   - Availability checking
   - User booking history and statistics
   - Back-to-back booking support

#### Database Schema
```sql
-- users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_staff BOOLEAN DEFAULT FALSE,
    date_joined TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    location VARCHAR(150),
    amenities JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    attendees_count INTEGER NOT NULL CHECK (attendees_count > 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT booking_end_time_gt_start_time CHECK (end_time > start_time),
    CONSTRAINT booking_attendees_gt_0 CHECK (attendees_count > 0)
);

-- Exclusion constraint for conflict prevention
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings ADD CONSTRAINT booking_prevent_overlapping
EXCLUDE USING gist (room WITH =, tstzrange(start_time, end_time) WITH &&)
WHERE (status = 'CONFIRMED');
```

### Key Architectural Decisions

#### 1. Conflict Prevention Strategy
- **Database-Level Exclusion Constraints:** Using PostgreSQL's `btree_gist` extension with `EXCLUDE` constraints to prevent overlapping bookings at the database level
- **Application-Level Validation:** Additional validation in Django serializers for immediate feedback
- **Race Condition Handling:** Database constraints guarantee atomicity even under concurrent requests

#### 2. Performance Optimizations
- **N+1 Query Prevention:** Extensive use of `select_related()` and `prefetch_related()` in views
- **Database Indexing:** Strategic indexes on frequently queried fields
- **Pagination:** Implemented for room and booking listings (planned enhancement)
- **Caching:** Ready for Redis integration (configuration in place)

#### 3. Security Implementation
- **JWT Authentication:** Stateless authentication with access/refresh tokens
- **Token Blacklisting:** Refresh token blacklisting on logout
- **Role-Based Access Control:** Custom permission classes for fine-grained access
- **Input Validation:** Comprehensive validation at serializer and model levels
- **CORS Configuration:** Environment-based CORS origins
- **Password Security:** Django's built-in password validation

#### 4. API Design Principles
- **RESTful Endpoints:** Consistent resource-oriented URLs
- **Standard HTTP Status Codes:** Proper use of 2xx, 4xx, 5xx responses
- **Consistent Error Format:** Unified error envelope: `{ "error": { "code": "...", "message": "...", "details": {} } }`
- **Idempotency:** Safe methods (GET, HEAD, OPTIONS) are idempotent
- **Resource Relationships:** Proper use of related resources and nested serialization

#### 5. Scalability Considerations
- **Horizontal Scaling:** Stateless backend services
- **Database Connection Pooling:** Configurable via DATABASE settings
- **Asynchronous Processing:** Ready for Celery integration (email notifications, etc.)
- **Microservice Boundaries:** Clear app separation enables future service extraction

### Data Flow

#### User Registration & Authentication
1. Client sends POST to `/api/auth/register/` with user data
2. Backend validates, creates user, hashes password
3. Client automatically logs in via `/api/auth/token/` to get JWT pair
4. Tokens stored in localStorage (secure: HTTP-only cookies recommended for production)
5. Subsequent requests include `Authorization: Bearer <access_token>` header

#### Booking Creation Flow
1. User selects room and time via frontend
2. Frontend validates basic constraints (time ordering)
3. POST to `/api/bookings/` with booking data + JWT
4. Backend validates:
   - Authentication & permissions
   - Room exists and is active
   - Time constraints (future booking, end > start)
   - Attendees <= room capacity
   - **Conflict detection** via serializer validation
5. If valid, booking created; if conflict, HTTP 409 with details
6. Frontend handles success/error states

#### Conflict Detection Mechanism
The exclusion constraint works as follows:
```sql
-- When inserting a new booking:
INSERT INTO bookings (...) VALUES (...)
-- PostgreSQL checks:
EXCLUDE USING gist (room WITH =, tstzrange(start_time, end_time) WITH &&)
WHERE (status = 'CONFIRMED')
```
This prevents any new CONFIRMED booking where the time range overlaps with an existing CONFIRMED booking for the same room.

### Deployment Architecture

#### Development
- Local PostgreSQL instance
- Django development server (`runserver`)
- Vite dev server with HMR
- SQLite fallback possible (though PostgreSQL recommended for constraint testing)

#### Production (Recommended)
- **Backend:** Gunicorn + Nginx (or Docker/Kubernetes)
- **Database:** Managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
- **Frontend:** Static file serving via Nginx/CDN
- **Cache:** Redis for session storage and query caching
- **Monitoring:** Logging, metrics, health checks
- **CI/CD:** GitHub Actions pipeline (already configured)

### API Contract Summary

The backend exposes 21 endpoints across 3 modules:

#### Authentication (5 endpoints)
- POST `/api/auth/register/` - User registration
- POST `/api/auth/token/` - Email/password login (JWT pair)
- POST `/api/auth/token/refresh/` - Refresh access token
- GET `/api/auth/me/` - Get current user profile
- POST `/api/auth/logout/` - Blacklist refresh token

#### Rooms (6 endpoints)
- GET `/api/rooms/` - List rooms (with filtering)
- POST `/api/rooms/` - Create room (Admin only)
- GET `/api/rooms/{id}/` - Retrieve room details
- PUT `/api/rooms/{id}/` - Update room (Admin only)
- PATCH `/api/rooms/{id}/` - Partial update room (Admin only)
- DELETE `/api/rooms/{id}/` - Delete room (Admin only)

#### Bookings (10 endpoints)
- GET `/api/bookings/` - List bookings (with filtering/search)
- POST `/api/bookings/` - Create booking
- GET `/api/bookings/{id}/` - Retrieve booking details
- PUT `/api/bookings/{id}/` - Update booking
- PATCH `/api/bookings/{id}/` - Partial update booking
- DELETE `/api/bookings/{id}/` - Delete booking
- POST `/api/bookings/{id}/cancel/` - Cancel booking
- GET `/api/bookings/check-availability/` - Check room availability
- GET `/api/bookings/my-bookings/` - Get user's bookings
- GET `/api/bookings/stats/` - Get booking statistics

### Quality Assurance

#### Testing Strategy
- **Unit Tests:** Model and serializer validation tests
- **Integration Tests:** API endpoint tests with full database interaction
- **Conflict Scenarios:** Comprehensive overlap testing (exact, partial, enclosing)
- **Edge Cases:** Past bookings, capacity limits, inactive rooms
- **Authentication:** Role-based access control verification
- **Postman Collection:** 21 API tests covering all endpoints and scenarios

#### Code Quality
- **Type Safety:** Django models provide compile-time safety
- **Linting:** Configured for Python and JavaScript/JSX
- **Formatting:** Consistent code style
- **Documentation:** Docstrings and inline comments
- **Error Handling:** Centralized exception handling with consistent format

### Future Enhancements

#### Short Term
1. Implement pagination for large datasets
2. Add email notifications for booking confirmations/cancellations
3. Implement recurring bookings
4. Add room search by amenities
5. Enhance frontend with loading states and error boundaries
6. Add filtering by date range in bookings list

#### Medium Term
1. Mobile-responsive frontend improvements
2. Admin dashboard with analytics
3. Integration with calendar systems (Google Calendar, Outlook)
4. Room equipment/resources tracking
5. Multi-tenant support for organizations

#### Long Term
1. Microservices architecture extraction
2. Real-time collaboration features
3. AI-powered room recommendations
4. Advanced reporting and forecasting
5. Mobile native applications

## Conclusion
This architecture provides a solid foundation for a scalable, secure, and high-performance meeting room scheduling system. The use of database-level constraints ensures data integrity under concurrent access, while the modular Django architecture enables maintainability and future growth. The comprehensive test suite and documented APIs ensure reliability and ease of integration for frontend developers.