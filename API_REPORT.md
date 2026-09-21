# API Specification & Completion Report

**Base URL:** `http://localhost:8000/api/`  
**Authentication Standard:** HTTP Bearer Token (`Authorization: Bearer <access_token>`)  
**Error Envelope Format:** Unified project envelope `{ "error": { "code": "...", "message": "...", "details": { ... } } }`

---

## 1. Master API Overview Table

| HTTP Method | Full HTTP Endpoint URL | Module | Authorization Level | Request Payload / Query Params | Expected Status Codes | Summary / Description |
|---|---|---|---|---|---|---|
| `POST` | `http://localhost:8000/api/auth/register/` | Users | **Public** (`AllowAny`) | JSON Body (`email`, `password`, `first_name`, `last_name`, `department`) | `201 Created`<br>`400 Bad Request` | Register a new user account |
| `POST` | `http://localhost:8000/api/auth/token/` | Users | **Public** (`AllowAny`) | JSON Body (`email`, `password`) | `200 OK`<br>`401 Unauthorized`<br>`400 Bad Request` | Authenticate credentials; issue JWT access & refresh tokens |
| `POST` | `http://localhost:8000/api/auth/token/refresh/` | Users | **Public** (`AllowAny`) | JSON Body (`refresh`) | `200 OK`<br>`401 Unauthorized`<br>`400 Bad Request` | Refresh an expired access token |
| `GET` | `http://localhost:8000/api/auth/me/` | Users | **Bearer Token** (`IsAuthenticated`) | None (Header only) | `200 OK`<br>`401 Unauthorized` | Retrieve authenticated user profile |
| `GET` | `http://localhost:8000/api/rooms/` | Rooms | **Bearer Token** (`IsAuthenticated`) | Query filters: `search`, `min_capacity`, `max_capacity`, `location`, `amenity`, `is_active` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized` | List rooms with search and query filters |
| `POST` | `http://localhost:8000/api/rooms/` | Rooms | **Staff / Admin Only** | JSON Body (`name`, `capacity`, `location`, `amenities`, `is_active`) | `201 Created`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` | Create a new room in the catalog |
| `GET` | `http://localhost:8000/api/rooms/{id}/` | Rooms | **Bearer Token** (`IsAuthenticated`) | Path parameter: `{id}` (UUID) | `200 OK`<br>`401 Unauthorized`<br>`404 Not Found` | Retrieve room details by ID |
| `PUT` | `http://localhost:8000/api/rooms/{id}/` | Rooms | **Staff / Admin Only** | Path parameter: `{id}` (UUID)<br>JSON Body: full room attributes | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Full update / replacement of room |
| `PATCH` | `http://localhost:8000/api/rooms/{id}/` | Rooms | **Staff / Admin Only** | Path parameter: `{id}` (UUID)<br>JSON Body: partial room attributes | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Partial update of room fields |
| `DELETE` | `http://localhost:8000/api/rooms/{id}/` | Rooms | **Staff / Admin Only** | Path parameter: `{id}` (UUID) | `204 No Content`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Delete room from catalog |
| `GET` | `http://localhost:8000/api/bookings/check-availability/` | Bookings | **Bearer Token** (`IsAuthenticated`) | Query params: `?room_name=` or `?room_id=`, `?start_time=`, `?end_time=` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized` | Check slot availability; returns `is_available: true/false` and conflicting booking details |
| `POST` | `http://localhost:8000/api/bookings/` | Bookings | **Bearer Token** (`IsAuthenticated`) | JSON Body (`room_name` / `room_id`, `title`, `start_time`, `end_time`, `description`, `attendees_count`) | `201 Created`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`409 Conflict` | Reserves a room. Executes overlap check: `NOT (end_time <= new_start OR start_time >= new_end)`. Returns HTTP 409 Conflict (`BOOKING_CONFLICT`) if slot busy |
| `GET` | `http://localhost:8000/api/bookings/` | Bookings | **Bearer Token** (`IsAuthenticated`) | Query filters: `?room=`, `?room_id=`, `?status=`, `?date=`, `?start_date=`, `?end_date=`, `?search=` | `200 OK`<br>`401 Unauthorized` | Lists all bookings across rooms |
| `GET` | `http://localhost:8000/api/bookings/{id}/` | Bookings | **Bearer Token** (`IsAuthenticated`) | Path parameter: `{id}` (UUID) | `200 OK`<br>`401 Unauthorized`<br>`404 Not Found` | Retrieves details of a specific reservation |
| `PUT` / `PATCH` | `http://localhost:8000/api/bookings/{id}/` | Bookings | **Owner / Admin** | Path parameter: `{id}` (UUID)<br>JSON Body: updated booking fields | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found`<br>`409 Conflict` | Updates reservation details; re-runs overlap validation if time changed. Only creator or admin can modify |
| `DELETE` | `http://localhost:8000/api/bookings/{id}/` | Bookings | **Owner / Admin** | Path parameter: `{id}` (UUID) | `204 No Content`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Permanently deletes a reservation (owner or admin only) |
| `GET` | `http://localhost:8000/api/my-bookings/` | Bookings | **Bearer Token** (`IsAuthenticated`) | Query filters: `?upcoming=true`, `?status=` | `200 OK`<br>`401 Unauthorized` | Returns all bookings belonging to currently authenticated user |
| `PATCH` / `POST` | `http://localhost:8000/api/bookings/{id}/cancel/` | Bookings | **Owner / Admin** | Path parameter: `{id}` (UUID) | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Transitions status to `CANCELLED` and immediately frees slot. Guards against double cancellation (400) |
| `GET` | `http://localhost:8000/api/bookings/stats/` | Bookings | **Bearer Token** (`IsAuthenticated`) | None (Header only) | `200 OK`<br>`401 Unauthorized` | Aggregates system metrics (`total_bookings`, `confirmed_bookings`, `cancelled_bookings`, `today_bookings`, `upcoming_bookings`) |

---

## 2. Detailed Users & Authentication Endpoints

### 2.1 Register User
* **Method & URL:** `POST http://localhost:8000/api/auth/register/`
* **Access Control:** Public (`AllowAny`)
* **Headers:** `Content-Type: application/json`

#### Request Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `email` | String | **Yes** | Valid email address, unique, automatically lowercased and stripped |
| `password` | String | **Yes** | Validated against password strength validators (min 8 chars) |
| `first_name` | String | **Yes** | Max length 100 characters |
| `last_name` | String | **Yes** | Max length 100 characters |
| `department` | String | No | Optional, max length 100 characters |

```json
// Example Request
POST http://localhost:8000/api/auth/register/
Content-Type: application/json

{
  "email": "alex.morgan@innovyx.com",
  "password": "StrongPassword123!",
  "first_name": "Alex",
  "last_name": "Morgan",
  "department": "Engineering"
}
```

#### Response Payloads
* **`201 Created`**
```json
{
  "id": "e3b0c442-98fc-1c14-9afb-4c7fa43f7215",
  "email": "alex.morgan@innovyx.com",
  "first_name": "Alex",
  "last_name": "Morgan",
  "department": "Engineering"
}
```
* **`400 Bad Request`** (`VALIDATION_ERROR`)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": {
      "email": ["A user with this email already exists."]
    }
  }
}
```

---

### 2.2 Login & Token Issue
* **Method & URL:** `POST http://localhost:8000/api/auth/token/`
* **Access Control:** Public (`AllowAny`)
* **Headers:** `Content-Type: application/json`

#### Request Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `email` | String | **Yes** | Registered user email |
| `password` | String | **Yes** | Account password |

```json
// Example Request
POST http://localhost:8000/api/auth/token/
Content-Type: application/json

{
  "email": "alex.morgan@innovyx.com",
  "password": "StrongPassword123!"
}
```

#### Response Payloads
* **`200 OK`**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e3b0c442-98fc-1c14-9afb-4c7fa43f7215",
    "email": "alex.morgan@innovyx.com",
    "first_name": "Alex",
    "last_name": "Morgan",
    "department": "Engineering"
  }
}
```
* **`401 Unauthorized`** (`UNAUTHORIZED`)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No active account found with the given credentials",
    "details": {}
  }
}
```

---

### 2.3 Refresh JWT Access Token
* **Method & URL:** `POST http://localhost:8000/api/auth/token/refresh/`
* **Access Control:** Public (`AllowAny`)
* **Headers:** `Content-Type: application/json`

#### Request Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `refresh` | String | **Yes** | Valid refresh token |

```json
// Example Request
POST http://localhost:8000/api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response Payloads
* **`200 OK`**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
* **`401 Unauthorized`** (`UNAUTHORIZED`)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token is invalid or expired",
    "details": {
      "code": "token_not_valid"
    }
  }
}
```

---

### 2.4 Authenticated User Profile (`Me`)
* **Method & URL:** `GET http://localhost:8000/api/auth/me/`
* **Access Control:** Authenticated (`IsAuthenticated`)
* **Headers:** `Authorization: Bearer <access_token>`

#### Response Payloads
* **`200 OK`**
```json
{
  "id": "e3b0c442-98fc-1c14-9afb-4c7fa43f7215",
  "email": "alex.morgan@innovyx.com",
  "first_name": "Alex",
  "last_name": "Morgan",
  "department": "Engineering"
}
```
* **`401 Unauthorized`** (`UNAUTHORIZED`)

---

## 3. Detailed Rooms & Asset Management Endpoints

### 3.1 List Rooms (with Filters & Search)
* **Method & URL:** `GET http://localhost:8000/api/rooms/`
* **Access Control:** Authenticated (`IsAuthenticated`)
* **Headers:** `Authorization: Bearer <access_token>`

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `search` | String | No | Search keyword matched in `name` or `location` | `?search=Apollo` |
| `min_capacity` | Integer | No | Filters rooms with capacity >= value | `?min_capacity=10` |
| `max_capacity` | Integer | No | Filters rooms with capacity <= value | `?max_capacity=30` |
| `location` | String | No | Case-insensitive substring match on `location` | `?location=Floor%202` |
| `amenity` | String | No | Substring search within JSON amenities array | `?amenity=Projector` |
| `is_active` | Boolean | No | `true`/`false`. Non-staff users automatically default to `true`. | `?is_active=true` |

#### Response Payloads
* **`200 OK`**
```json
[
  {
    "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "name": "Apollo Conference Hall",
    "capacity": 16,
    "location": "Innovation Hub, 2nd Floor, Wing B",
    "amenities": ["4K Projector", "Video Conferencing", "Whiteboard"],
    "is_active": true,
    "created_by": "e3b0c442-98fc-1c14-9afb-4c7fa43f7215",
    "created_by_email": "admin@innovyx.com",
    "created_at": "2026-09-18T09:30:00Z",
    "updated_at": "2026-09-19T08:15:00Z"
  }
]
```

---

### 3.2 Create Room
* **Method & URL:** `POST http://localhost:8000/api/rooms/`
* **Access Control:** **Staff / Admin Only** (`is_staff = true` or `is_superuser = true`)
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`

#### Request Schema
| Field | Type | Required | Constraints / Description |
|---|---|---|---|
| `name` | String | **Yes** | Unique room name/number (cannot be blank) |
| `capacity` | Integer | **Yes** | Occupancy count (must be > 0) |
| `location` | String | **Yes** | Location description (max 150 chars) |
| `amenities` | Array of Strings | No | Asset list (e.g. `["Projector"]`, default `[]`) |
| `is_active` | Boolean | No | Availability flag (default `true`) |

```json
// Example Request
POST http://localhost:8000/api/rooms/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Zeus Executive Boardroom",
  "capacity": 20,
  "location": "Building A, 5th Floor, Suite 501",
  "amenities": ["Dual 4K TV", "Conference Mic", "Whiteboard"],
  "is_active": true
}
```

#### Response Payloads
* **`201 Created`**
```json
{
  "id": "7f8e9d0a-1b2c-3d4e-5f6a-7b8c9d0e1f2a",
  "name": "Zeus Executive Boardroom",
  "capacity": 20,
  "location": "Building A, 5th Floor, Suite 501",
  "amenities": ["Dual 4K TV", "Conference Mic", "Whiteboard"],
  "is_active": true,
  "created_by": "e3b0c442-98fc-1c14-9afb-4c7fa43f7215",
  "created_by_email": "admin@innovyx.com",
  "created_at": "2026-09-19T12:00:00Z",
  "updated_at": "2026-09-19T12:00:00Z"
}
```
* **`403 Forbidden`** (if non-admin) / **`400 Bad Request`** (validation failure)

---

### 3.3 Get Single Room
* **Method & URL:** `GET http://localhost:8000/api/rooms/{id}/`
* **Access Control:** Authenticated (`IsAuthenticated`)
* **Headers:** `Authorization: Bearer <access_token>`
* **Path Parameter:** `{id}` (UUID)

#### Response Payloads
* **`200 OK`** (Returns single room object)
* **`404 Not Found`**

---

### 3.4 Full Update of Room (`PUT`)
* **Method & URL:** `PUT http://localhost:8000/api/rooms/{id}/`
* **Access Control:** **Staff / Admin Only**
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`

---

### 3.5 Partial Update of Room (`PATCH`)
* **Method & URL:** `PATCH http://localhost:8000/api/rooms/{id}/`
* **Access Control:** **Staff / Admin Only**
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`

---

### 3.6 Delete Room
* **Method & URL:** `DELETE http://localhost:8000/api/rooms/{id}/`
* **Access Control:** **Staff / Admin Only**
* **Headers:** `Authorization: Bearer <access_token>`
* **Response:** **`204 No Content`**

---

## 4. Detailed Booking Engine & Availability Endpoints

### 4.1 Check Slot Availability
* **Method & URL:** `GET http://localhost:8000/api/bookings/check-availability/`
* **Access Control:** Authenticated (`IsAuthenticated`)
* **Headers:** `Authorization: Bearer <access_token>`
* **Description:** Checks slot availability for a given room and time range. Returns `is_available: true/false` and conflicting booking details if busy.

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `room_name` / `room_id` | String / UUID | **Yes** | Name or UUID of the meeting room | `?room_name=Apollo%20Conference%20Hall` |
| `start_time` | ISO Datetime | **Yes** | Requested slot start time | `?start_time=2026-09-20T10:00:00Z` |
| `end_time` | ISO Datetime | **Yes** | Requested slot end time (must be after start_time) | `?end_time=2026-09-20T11:30:00Z` |

#### Response Payloads
* **`200 OK` (Slot Free)**
```json
{
  "room_name": "Apollo Conference Hall",
  "start_time": "2026-09-20T10:00:00Z",
  "end_time": "2026-09-20T11:30:00Z",
  "is_available": true,
  "conflicts": []
}
```
* **`200 OK` (Slot Occupied / Conflict)**
```json
{
  "room_name": "Apollo Conference Hall",
  "start_time": "2026-09-20T10:00:00Z",
  "end_time": "2026-09-20T11:30:00Z",
  "is_available": false,
  "conflicts": [
    {
      "id": "8d3e2a1b-4f3c-4d5e-a6b7-c8d9e0f1a2b3",
      "title": "Quarterly Sprint Review",
      "start_time": "2026-09-20T09:30:00Z",
      "end_time": "2026-09-20T11:00:00Z",
      "status": "CONFIRMED"
    }
  ]
}
```
* **`400 Bad Request`** (Missing params or `end_time <= start_time`)

---

### 4.2 Create Booking (With Overlap Protection)
* **Method & URL:** `POST http://localhost:8000/api/bookings/`
* **Access Control:** Authenticated (`IsAuthenticated`)
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
* **Description:** Reserves a room for the authenticated user. Executes database overlap logic:
  $$\text{NOT } (\text{end\_time} \le \text{new\_start} \lor \text{start\_time} \ge \text{new\_end})$$
  If a conflict is detected, returns `HTTP 409 Conflict` (`BOOKING_CONFLICT`).

#### Request Schema
| Field | Type | Required | Constraints / Description |
|---|---|---|---|
| `room_name` | String | **Yes** | Identifier/name of the room being reserved |
| `title` | String | **Yes** | Purpose / meeting title (max 200 chars) |
| `start_time` | ISO Datetime | **Yes** | Reservation start time |
| `end_time` | ISO Datetime | **Yes** | Reservation end time (must be > `start_time`) |
| `attendees_count` | Integer | No | Expected number of attendees (default: 1) |
| `description` | String | No | Additional meeting agenda or notes |

```json
// Example Request
POST http://localhost:8000/api/bookings/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Product Roadmap Discussion",
  "description": "Quarterly milestone alignment and feature prioritisation.",
  "room_name": "Apollo Conference Hall",
  "start_time": "2026-09-20T14:00:00Z",
  "end_time": "2026-09-20T15:30:00Z",
  "attendees_count": 8
}
```

#### Response Payloads
* **`201 Created`**
```json
{
  "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "title": "Product Roadmap Discussion",
  "description": "Quarterly milestone alignment and feature prioritisation.",
  "room_name": "Apollo Conference Hall",
  "user": "e3b0c442-98fc-1c14-9afb-4c7fa43f7215",
  "start_time": "2026-09-20T14:00:00Z",
  "end_time": "2026-09-20T15:30:00Z",
  "attendees_count": 8,
  "status": "CONFIRMED",
  "created_at": "2026-09-19T13:00:00Z",
  "updated_at": "2026-09-19T13:00:00Z"
}
```
* **`409 Conflict` (`BOOKING_CONFLICT`)**
```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Room 'Apollo Conference Hall' is already booked from 14:00 to 15:00 for 'Design Sprint Sync'.",
    "details": {
      "conflict": "Room 'Apollo Conference Hall' is already booked from 14:00 to 15:00 for 'Design Sprint Sync'."
    }
  }
}
```

---

### 4.3 List Bookings
* **Method & URL:** `GET http://localhost:8000/api/bookings/`
* **Access Control:** Authenticated (`IsAuthenticated`)
* **Headers:** `Authorization: Bearer <access_token>`
* **Description:** Lists all bookings across rooms. Supports query filtering.

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `room` / `room_name` | String | No | Filter bookings by room name | `?room_name=Apollo` |
| `room_id` | UUID | No | Filter bookings by room UUID | `?room_id=1a2b3c4d...` |
| `status` | String | No | Filter by status (`CONFIRMED`, `CANCELLED`, `COMPLETED`) | `?status=CONFIRMED` |
| `date` | Date (`YYYY-MM-DD`) | No | Filter bookings occurring on exact date | `?date=2026-09-20` |
| `start_date` | Date (`YYYY-MM-DD`) | No | Bookings occurring on or after date | `?start_date=2026-09-01` |
| `end_date` | Date (`YYYY-MM-DD`) | No | Bookings occurring on or before date | `?end_date=2026-09-30` |
| `search` | String | No | Search across title, description, room, or user name | `?search=Roadmap` |

#### Response Payloads
* **`200 OK`**
```json
[
  {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "title": "Product Roadmap Discussion",
    "description": "Quarterly milestone alignment.",
    "room_name": "Apollo Conference Hall",
    "user": "e3b0c442-98fc-1c14-9afb-4c7fa43f7215",
    "start_time": "2026-09-20T14:00:00Z",
    "end_time": "2026-09-20T15:30:00Z",
    "attendees_count": 8,
    "status": "CONFIRMED",
    "created_at": "2026-09-19T13:00:00Z",
    "updated_at": "2026-09-19T13:00:00Z"
  }
]
```

---

### 4.4 Get Single Booking Details
* **Method & URL:** `GET http://localhost:8000/api/bookings/{id}/`
* **Access Control:** Authenticated (`IsAuthenticated`)
* **Headers:** `Authorization: Bearer <access_token>`
* **Path Parameter:** `{id}` — UUID of the reservation

#### Response Payloads
* **`200 OK`** (Returns single booking object matching schema above)
* **`404 Not Found`**

---

### 4.5 Update Booking (`PUT` / `PATCH`)
* **Method & URL:** `PUT` / `PATCH http://localhost:8000/api/bookings/{id}/`
* **Access Control:** **Owner / Admin** (`IsAuthenticated`, booking owner or staff)
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
* **Description:** Updates reservation details (e.g. title, time slot). Re-runs overlap validation if time is changed. Only the creator or admin can modify.

```json
// Example PATCH Request
PATCH http://localhost:8000/api/bookings/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Product Roadmap Discussion (Extended)",
  "end_time": "2026-09-20T16:00:00Z",
  "attendees_count": 12
}
```

#### Response Payloads
* **`200 OK`** (Returns full updated booking object)
* **`409 Conflict`** (If new time slot clashes with another confirmed reservation)
* **`403 Forbidden`** (If user is not the booking creator or admin)
* **`404 Not Found`**

---

### 4.6 Delete Booking
* **Method & URL:** `DELETE http://localhost:8000/api/bookings/{id}/`
* **Access Control:** **Owner / Admin** (`IsAuthenticated`, booking owner or staff)
* **Headers:** `Authorization: Bearer <access_token>`
* **Description:** Permanently deletes a reservation (owner or admin only).

#### Response Payloads
* **`204 No Content`** (Empty response body)
* **`403 Forbidden`** / **`404 Not Found`**

---

### 4.7 Retrieve Authenticated User's Bookings (`My Bookings`)
* **Method & URL:** `GET http://localhost:8000/api/my-bookings/`
* **Access Control:** Authenticated (`IsAuthenticated`, self-only)
* **Headers:** `Authorization: Bearer <access_token>`
* **Description:** Returns all bookings belonging to the currently authenticated user, ordered newest first (`-start_time`).

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `upcoming` | Boolean | No | Filter for bookings starting from current time forward | `?upcoming=true` |
| `status` | String | No | Filter by reservation status | `?status=CONFIRMED` |

#### Response Payloads
* **`200 OK`**
```json
[
  {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "title": "Product Roadmap Discussion",
    "room_name": "Apollo Conference Hall",
    "start_time": "2026-09-20T14:00:00Z",
    "end_time": "2026-09-20T15:30:00Z",
    "attendees_count": 8,
    "status": "CONFIRMED",
    "created_at": "2026-09-19T13:00:00Z",
    "updated_at": "2026-09-19T13:00:00Z"
  }
]
```

---

### 4.8 Cancel Booking (Status Transition)
* **Method & URL:** `PATCH http://localhost:8000/api/bookings/{id}/cancel/` *(Also supports `POST`)*
* **Access Control:** **Owner / Admin** (`IsAuthenticated`, booking owner or staff)
* **Headers:** `Authorization: Bearer <access_token>`
* **Description:** Transitions booking status to `'CANCELLED'` and immediately frees the slot for other users. Guards against double cancellation (`400 Bad Request`).

#### Response Payloads
* **`200 OK`**
```json
{
  "message": "Booking 'Product Roadmap Discussion' has been cancelled.",
  "booking": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "title": "Product Roadmap Discussion",
    "room_name": "Apollo Conference Hall",
    "status": "CANCELLED",
    "start_time": "2026-09-20T14:00:00Z",
    "end_time": "2026-09-20T15:30:00Z",
    "updated_at": "2026-09-19T14:10:00Z"
  }
}
```
* **`400 Bad Request`** (Double cancellation guard)
```json
{
  "error": "Booking is already cancelled."
}
```
* **`404 Not Found` / `403 Forbidden`**
```json
{
  "error": "Booking not found or you do not have permission to cancel it."
}
```

---

### 4.9 Booking Metrics & Dashboard Statistics
* **Method & URL:** `GET http://localhost:8000/api/bookings/stats/`
* **Access Control:** Authenticated (`IsAuthenticated`)
* **Headers:** `Authorization: Bearer <access_token>`
* **Description:** Aggregates system metrics (`total_bookings`, `confirmed_bookings`, `cancelled_bookings`, `today_bookings`, `upcoming_bookings`).

#### Response Payloads
* **`200 OK`**
```json
{
  "total_bookings": 42,
  "confirmed_bookings": 35,
  "cancelled_bookings": 7,
  "today_bookings": 6,
  "upcoming_bookings": 18
}
```

---

## 5. Unified Project Error Format

All failure responses are standardized using the project exception envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Detailed summary of the failure.",
    "details": {
      "field_name": ["Specific validation error explanation."]
    }
  }
}
```
