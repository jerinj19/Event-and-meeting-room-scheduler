# Event & Meeting Room Scheduler — API Test Execution & Contract Documentation

This document provides the complete end-to-end test execution log for all backend APIs across **Authentication & Users**, **Room Management**, and **Booking Engine & Conflict Validation**.

## Postman Collection Details

| Property | Value |
|---|---|
| **Collection Name** | `Event & Meeting Room Scheduler - Complete E2E Suite` |
| **Collection ID** | `055dd68a-d54a-4819-9ebe-a60448c81778` |
| **Collection UID** | `42369593-055dd68a-d54a-4819-9ebe-a60448c81778` |
| **Postman Workspace** | `srilaxmilinga's Team's Workspace` |
| **Workspace ID** | `bb9a64d7-41ba-4cd4-818a-f72bd124e055` |
| **Environment Name** | `Local Dev Environment` |
| **Environment ID** | `142150fa-dc14-4465-a6ea-34c5c2b9d750` |
| **Base URL** | `http://127.0.0.1:8000` |

## Test Execution Summary

| # | Scenario / Endpoint Name | Method | URL / Path | Status Code | Result |
|---|---|---|---|---|---|
| 1 | 1. Register User 1 (Alice) | `POST` | `/api/auth/register/` | `201` | PASS |
| 2 | 2. Register User 2 (Bob) | `POST` | `/api/auth/register/` | `201` | PASS |
| 3 | 3. Duplicate User Registration Rejection | `POST` | `/api/auth/register/` | `400` | PASS |
| 4 | 4. Login Admin User | `POST` | `/api/auth/token/` | `200` | PASS |
| 5 | 5. Login User 1 (Alice) | `POST` | `/api/auth/token/` | `200` | PASS |
| 6 | 6. Refresh JWT Token | `POST` | `/api/auth/token/refresh/` | `200` | PASS |
| 7 | 7. Get Current User Profile | `GET` | `/api/auth/me/` | `200` | PASS |
| 8 | 8. Create Room 1 (Boardroom Alpha) | `POST` | `/api/rooms/` | `201` | PASS |
| 9 | 9. Create Room 2 (Conference Room Beta) | `POST` | `/api/rooms/` | `201` | PASS |
| 10 | 10. List All Rooms | `GET` | `/api/rooms/` | `200` | PASS |
| 11 | 11. Filter Rooms by Min Capacity (15) | `GET` | `/api/rooms/?min_capacity=15` | `200` | PASS |
| 12 | 12. Filter Rooms by Amenity (Projector) | `GET` | `/api/rooms/?amenity=Projector` | `200` | PASS |
| 13 | 13. Retrieve Room Detail | `GET` | `/api/rooms/16a78509-9865-4073-864f-efc627b262e7/` | `200` | PASS |
| 14 | 14. Update Room Detail | `PATCH` | `/api/rooms/16a78509-9865-4073-864f-efc627b262e7/` | `200` | PASS |
| 15 | 15. Check Availability (Slot Available) | `GET` | `/api/bookings/check-availability/?room_id=16a78509-9865-4073-864f-efc627b262e7&start_time=2026-09-20T10%3A00%3A00%2B00%3A00&end_time=2026-09-20T11%3A30%3A00%2B00%3A00` | `200` | PASS |
| 16 | 16. Create Booking 1 (Strategy Sync) | `POST` | `/api/bookings/` | `201` | PASS |
| 17 | 17. Conflict Attempt (Overlapping Booking) | `POST` | `/api/bookings/` | `409` | PASS |
| 18 | 18. Check Availability (Slot Busy) | `GET` | `/api/bookings/check-availability/?room_id=16a78509-9865-4073-864f-efc627b262e7&start_time=2026-09-20T10%3A00%3A00%2B00%3A00&end_time=2026-09-20T11%3A30%3A00%2B00%3A00` | `200` | PASS |
| 19 | 19. Create Booking 2 in Room 2 | `POST` | `/api/bookings/` | `201` | PASS |
| 20 | 20. List All Bookings | `GET` | `/api/bookings/` | `200` | PASS |
| 21 | 21. Filter Bookings by Room | `GET` | `/api/bookings/?room_id=16a78509-9865-4073-864f-efc627b262e7` | `200` | PASS |
| 22 | 22. Filter Bookings by Status (CONFIRMED) | `GET` | `/api/bookings/?status=CONFIRMED` | `200` | PASS |
| 23 | 23. User Personal Bookings (/api/my-bookings/) | `GET` | `/api/my-bookings/` | `200` | PASS |
| 24 | 24. Retrieve Booking Detail | `GET` | `/api/bookings/5d805ab0-d43a-49f6-bfe3-40456d97f9c7/` | `200` | PASS |
| 25 | 25. Update Booking Title | `PATCH` | `/api/bookings/5d805ab0-d43a-49f6-bfe3-40456d97f9c7/` | `200` | PASS |
| 26 | 26. Booking Statistics | `GET` | `/api/bookings/stats/` | `200` | PASS |
| 27 | 27. Cancel Booking | `PATCH` | `/api/bookings/5d805ab0-d43a-49f6-bfe3-40456d97f9c7/cancel/` | `200` | PASS |
| 28 | 28. Double Cancellation Rejection | `PATCH` | `/api/bookings/5d805ab0-d43a-49f6-bfe3-40456d97f9c7/cancel/` | `400` | PASS |
| 29 | 29. Verify Slot Freed After Cancellation | `GET` | `/api/bookings/check-availability/?room_id=16a78509-9865-4073-864f-efc627b262e7&start_time=2026-09-20T10%3A00%3A00%2B00%3A00&end_time=2026-09-20T11%3A30%3A00%2B00%3A00` | `200` | PASS |
| 30 | 30. Delete Booking 2 | `DELETE` | `/api/bookings/3345fcf6-0d43-46a1-ba11-513a2514257c/` | `204` | PASS |

---

## Detailed Request and Response Log

### 1. 1. Register User 1 (Alice)

- **Method:** `POST`
- **Endpoint:** `http://127.0.0.1:8000/api/auth/register/`
- **Status Code:** `201`

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "alice_1789810121@innovyx.com",
  "first_name": "Alice",
  "last_name": "Engineer",
  "department": "Engineering",
  "password": "Password123!"
}
```

#### Response (`HTTP 201`)
```json
{
  "id": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
  "email": "alice_1789810121@innovyx.com",
  "first_name": "Alice",
  "last_name": "Engineer",
  "department": "Engineering"
}
```

---

### 2. 2. Register User 2 (Bob)

- **Method:** `POST`
- **Endpoint:** `http://127.0.0.1:8000/api/auth/register/`
- **Status Code:** `201`

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "bob_1789810121@innovyx.com",
  "first_name": "Bob",
  "last_name": "Product",
  "department": "Product",
  "password": "Password123!"
}
```

#### Response (`HTTP 201`)
```json
{
  "id": "6e77b8ad-9e8e-4e32-8595-2c1d45bf240f",
  "email": "bob_1789810121@innovyx.com",
  "first_name": "Bob",
  "last_name": "Product",
  "department": "Product"
}
```

---

### 3. 3. Duplicate User Registration Rejection

- **Method:** `POST`
- **Endpoint:** `http://127.0.0.1:8000/api/auth/register/`
- **Status Code:** `400`

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "alice_1789810121@innovyx.com",
  "first_name": "Alice Duplicate",
  "last_name": "Engineer",
  "password": "Password123!"
}
```

#### Response (`HTTP 400`)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": {
      "email": [
        "user with this email already exists."
      ]
    }
  }
}
```

---

### 4. 4. Login Admin User

- **Method:** `POST`
- **Endpoint:** `http://127.0.0.1:8000/api/auth/token/`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "admin123@gmail.com",
  "password": "AdminPassword123!"
}
```

#### Response (`HTTP 200`)
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MDQxNDkyNSwiaWF0IjoxNzg5ODEwMTI1LCJqdGkiOiI5MmUyY2RkMThlMTI0ZmRlOTBlZTI0Zjk5ODJkM2I5MSIsInVzZXJfaWQiOiI0MWM4MWE3YS0wYjU2LTRhMjEtYThjOC0zM2E4ODRiZTc1OGYiLCJlbWFpbCI6ImFkbWluMTIzQGdtYWlsLmNvbSIsImZ1bGxfbmFtZSI6ImFkbWluIGFkbWluIn0.S42BeoNgAdYxJd4rkk3fUYVvmcszfOYi9t76U1jxJ1A",
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzg5ODExOTI1LCJpYXQiOjE3ODk4MTAxMjUsImp0aSI6IjM0M2UyYTMxYTg0MDRjMDU4YWQ5YjNlMTUzZDEzNDg5IiwidXNlcl9pZCI6IjQxYzgxYTdhLTBiNTYtNGEyMS1hOGM4LTMzYTg4NGJlNzU4ZiIsImVtYWlsIjoiYWRtaW4xMjNAZ21haWwuY29tIiwiZnVsbF9uYW1lIjoiYWRtaW4gYWRtaW4ifQ.NmJ7MJXwDpxQ5RIL-tie5C7JAdGn_qYIdFsJLLO3WyA",
  "user": {
    "id": "41c81a7a-0b56-4a21-a8c8-33a884be758f",
    "email": "admin123@gmail.com",
    "first_name": "admin",
    "last_name": "admin",
    "department": null
  }
}
```

---

### 5. 5. Login User 1 (Alice)

- **Method:** `POST`
- **Endpoint:** `http://127.0.0.1:8000/api/auth/token/`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "alice_1789810121@innovyx.com",
  "password": "Password123!"
}
```

#### Response (`HTTP 200`)
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MDQxNDkyNiwiaWF0IjoxNzg5ODEwMTI2LCJqdGkiOiJiOTdjNzYwNzE0M2Q0MzMyOWYyNzc3ODRhNjIyODViMiIsInVzZXJfaWQiOiI4ZTZlNjEwNy0yODAwLTRhYWYtYThiMS0wMzU1Yzc5ZTIzNTMiLCJlbWFpbCI6ImFsaWNlXzE3ODk4MTAxMjFAaW5ub3Z5eC5jb20iLCJmdWxsX25hbWUiOiJBbGljZSBFbmdpbmVlciJ9.z24gZY0HVCIHGJRZ9e4mbM-FsLiobzF_gFXtmBC02RE",
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzg5ODExOTI2LCJpYXQiOjE3ODk4MTAxMjYsImp0aSI6IjgzYTAxNDQzYTgzZDRjMDE4ZTNiNzFkMzEzMmMyMmRkIiwidXNlcl9pZCI6IjhlNmU2MTA3LTI4MDAtNGFhZi1hOGIxLTAzNTVjNzllMjM1MyIsImVtYWlsIjoiYWxpY2VfMTc4OTgxMDEyMUBpbm5vdnl4LmNvbSIsImZ1bGxfbmFtZSI6IkFsaWNlIEVuZ2luZWVyIn0.gFrNsnA3ytFXs0VhX0Y1TcW4gDMsIGDBmTi827o_bBo",
  "user": {
    "id": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
    "email": "alice_1789810121@innovyx.com",
    "first_name": "Alice",
    "last_name": "Engineer",
    "department": "Engineering"
  }
}
```

---

### 6. 6. Refresh JWT Token

- **Method:** `POST`
- **Endpoint:** `http://127.0.0.1:8000/api/auth/token/refresh/`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MDQxNDkyNiwiaWF0IjoxNzg5ODEwMTI2LCJqdGkiOiJiOTdjNzYwNzE0M2Q0MzMyOWYyNzc3ODRhNjIyODViMiIsInVzZXJfaWQiOiI4ZTZlNjEwNy0yODAwLTRhYWYtYThiMS0wMzU1Yzc5ZTIzNTMiLCJlbWFpbCI6ImFsaWNlXzE3ODk4MTAxMjFAaW5ub3Z5eC5jb20iLCJmdWxsX25hbWUiOiJBbGljZSBFbmdpbmVlciJ9.z24gZY0HVCIHGJRZ9e4mbM-FsLiobzF_gFXtmBC02RE"
}
```

#### Response (`HTTP 200`)
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzg5ODExOTI2LCJpYXQiOjE3ODk4MTAxMjYsImp0aSI6Ijk5MDQ0YjhmMzM3YjRkNmVhMTIwOTA4ZTJmY2U3NDQzIiwidXNlcl9pZCI6IjhlNmU2MTA3LTI4MDAtNGFhZi1hOGIxLTAzNTVjNzllMjM1MyIsImVtYWlsIjoiYWxpY2VfMTc4OTgxMDEyMUBpbm5vdnl4LmNvbSIsImZ1bGxfbmFtZSI6IkFsaWNlIEVuZ2luZWVyIn0.xM-S7ORaCc1IDW0PbYfUhq1asHpFSpF63oFoRqm59LY",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MDQxNDkyNiwiaWF0IjoxNzg5ODEwMTI2LCJqdGkiOiIyMDM4ZTZhZGJjYTc0MjUxOWYwYzM2NzI4ZDQ3Zjg1ZCIsInVzZXJfaWQiOiI4ZTZlNjEwNy0yODAwLTRhYWYtYThiMS0wMzU1Yzc5ZTIzNTMiLCJlbWFpbCI6ImFsaWNlXzE3ODk4MTAxMjFAaW5ub3Z5eC5jb20iLCJmdWxsX25hbWUiOiJBbGljZSBFbmdpbmVlciJ9.3E3HPqfE_xUiOjfk5TAnRBFG8Kqi1ARRbVaR_vedm_M"
}
```

---

### 7. 7. Get Current User Profile

- **Method:** `GET`
- **Endpoint:** `http://127.0.0.1:8000/api/auth/me/`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
{
  "id": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
  "email": "alice_1789810121@innovyx.com",
  "first_name": "Alice",
  "last_name": "Engineer",
  "department": "Engineering"
}
```

---

### 8. 8. Create Room 1 (Boardroom Alpha)

- **Method:** `POST`
- **Endpoint:** `http://127.0.0.1:8000/api/rooms/`
- **Status Code:** `201`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...FsJLLO3WyA
```

#### Request Body
```json
{
  "name": "Boardroom Alpha 1789810121",
  "capacity": 20,
  "location": "Building A, Floor 3",
  "amenities": [
    "Video Conference",
    "Projector",
    "Whiteboard"
  ],
  "is_active": true
}
```

#### Response (`HTTP 201`)
```json
{
  "id": "16a78509-9865-4073-864f-efc627b262e7",
  "name": "Boardroom Alpha 1789810121",
  "capacity": 20,
  "location": "Building A, Floor 3",
  "amenities": [
    "Video Conference",
    "Projector",
    "Whiteboard"
  ],
  "is_active": true,
  "created_by": "41c81a7a-0b56-4a21-a8c8-33a884be758f",
  "created_by_email": "admin123@gmail.com",
  "created_at": "2026-09-19T09:28:46.990895Z",
  "updated_at": "2026-09-19T09:28:46.990911Z"
}
```

---

### 9. 9. Create Room 2 (Conference Room Beta)

- **Method:** `POST`
- **Endpoint:** `http://127.0.0.1:8000/api/rooms/`
- **Status Code:** `201`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...FsJLLO3WyA
```

#### Request Body
```json
{
  "name": "Conference Room Beta 1789810121",
  "capacity": 8,
  "location": "Building B, Floor 1",
  "amenities": [
    "TV Screen",
    "Whiteboard"
  ],
  "is_active": true
}
```

#### Response (`HTTP 201`)
```json
{
  "id": "f81129bf-6500-435a-95b1-2ecb3887c6fe",
  "name": "Conference Room Beta 1789810121",
  "capacity": 8,
  "location": "Building B, Floor 1",
  "amenities": [
    "TV Screen",
    "Whiteboard"
  ],
  "is_active": true,
  "created_by": "41c81a7a-0b56-4a21-a8c8-33a884be758f",
  "created_by_email": "admin123@gmail.com",
  "created_at": "2026-09-19T09:28:47.003187Z",
  "updated_at": "2026-09-19T09:28:47.003206Z"
}
```

---

### 10. 10. List All Rooms

- **Method:** `GET`
- **Endpoint:** `http://127.0.0.1:8000/api/rooms/`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
[
  {
    "id": "b583a084-c7d5-45bf-b1ba-5e6013983963",
    "name": "101",
    "capacity": 18,
    "location": "bhive",
    "amenities": [
      "cofee",
      "milk"
    ],
    "is_active": true,
    "created_by": "41c81a7a-0b56-4a21-a8c8-33a884be758f",
    "created_by_email": "admin123@gmail.com",
    "created_at": "2026-09-19T07:50:07.604135Z",
    "updated_at": "2026-09-19T07:50:07.604176Z"
  },
  {
    "id": "16a78509-9865-4073-864f-efc627b262e7",
    "name": "Boardroom Alpha 1789810121",
    "capacity": 20,
    "location": "Building A, Floor 3",
    "amenities": [
      "Video Conference",
      "Projector",
      "Whiteboard"
    ],
    "is_active": true,
    "created_by": "41c81a7a-0b56-4a21-a8c8-33a884be758f",
    "created_by_email": "admin123@gmail.com",
    "created_at": "2026-09-19T09:28:46.990895Z",
    "updated_at": "2026-09-19T09:28:46.990911Z"
  },
  {
    "id": "f81129bf-6500-435a-95b1-2ecb3887c6fe",
    "name": "Conference Room Beta 1789810121",
    "capacity": 8,
    "location": "Building B, Floor 1",
    "amenities": [
      "TV Screen",
      "Whiteboard"
    ],
    "is_active": true,
    "created_by": "41c81a7a-0b56-4a21-a8c8-33a884be758f",
    "created_by_email": "admin123@gmail.com",
    "created_at": "2026-09-19T09:28:47.003187Z",
    "updated_at": "2026-09-19T09:28:47.003206Z"
  },
  {
    "id": "dbe2729b-7968-4def-afba-4ac7e06531e5",
    "name": "thub zone 2",
    "capacity": 38,
    "location": "hyderabad",
    "amenities": [
      "cofee,tea,milk,water"
    ],
    "is_active": true,
    "created_by": "41c81a7a-0b56-4a21-a8c8-33a884be758f",
    "created_by_email": "admin123@gmail.com",
    "created_at": "2026-09-19T08:26:18.599276Z",
    "updated_at": "2026-09-19T08:26:18.599307Z"
  }
]
```

---

### 11. 11. Filter Rooms by Min Capacity (15)

- **Method:** `GET`
- **Endpoint:** `http://127.0.0.1:8000/api/rooms/?min_capacity=15`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
[
  {
    "id": "b583a084-c7d5-45bf-b1ba-5e6013983963",
    "name": "101",
    "capacity": 18,
    "location": "bhive",
    "amenities": [
      "cofee",
      "milk"
    ],
    "is_active": true,
    "created_by": "41c81a7a-0b56-4a21-a8c8-33a884be758f",
    "created_by_email": "admin123@gmail.com",
    "created_at": "2026-09-19T07:50:07.604135Z",
    "updated_at": "2026-09-19T07:50:07.604176Z"
  },
  {
    "id": "16a78509-9865-4073-864f-efc627b262e7",
    "name": "Boardroom Alpha 1789810121",
    "capacity": 20,
    "location": "Building A, Floor 3",
    "amenities": [
      "Video Conference",
      "Projector",
      "Whiteboard"
    ],
    "is_active": true,
    "created_by": "41c81a7a-0b56-4a21-a8c8-33a884be758f",
    "created_by_email": "admin123@gmail.com",
    "created_at": "2026-09-19T09:28:46.990895Z",
    "updated_at": "2026-09-19T09:28:46.990911Z"
  },
  {
    "id": "dbe2729b-7968-4def-afba-4ac7e06531e5",
    "name": "thub zone 2",
    "capacity": 38,
    "location": "hyderabad",
    "amenities": [
      "cofee,tea,milk,water"
    ],
    "is_active": true,
    "created_by": "41c81a7a-0b56-4a21-a8c8-33a884be758f",
    "created_by_email": "admin123@gmail.com",
    "created_at": "2026-09-19T08:26:18.599276Z",
    "updated_at": "2026-09-19T08:26:18.599307Z"
  }
]
```

---

### 12. 12. Filter Rooms by Amenity (Projector)

- **Method:** `GET`
- **Endpoint:** `http://127.0.0.1:8000/api/rooms/?amenity=Projector`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
[
  {
    "id": "16a78509-9865-4073-864f-efc627b262e7",
    "name": "Boardroom Alpha 1789810121",
    "capacity": 20,
    "location": "Building A, Floor 3",
    "amenities": [
      "Video Conference",
      "Projector",
      "Whiteboard"
    ],
    "is_active": true,
    "created_by": "41c81a7a-0b56-4a21-a8c8-33a884be758f",
    "created_by_email": "admin123@gmail.com",
    "created_at": "2026-09-19T09:28:46.990895Z",
    "updated_at": "2026-09-19T09:28:46.990911Z"
  }
]
```

---

### 13. 13. Retrieve Room Detail

- **Method:** `GET`
- **Endpoint:** `http://127.0.0.1:8000/api/rooms/16a78509-9865-4073-864f-efc627b262e7/`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
{
  "id": "16a78509-9865-4073-864f-efc627b262e7",
  "name": "Boardroom Alpha 1789810121",
  "capacity": 20,
  "location": "Building A, Floor 3",
  "amenities": [
    "Video Conference",
    "Projector",
    "Whiteboard"
  ],
  "is_active": true,
  "created_by": "41c81a7a-0b56-4a21-a8c8-33a884be758f",
  "created_by_email": "admin123@gmail.com",
  "created_at": "2026-09-19T09:28:46.990895Z",
  "updated_at": "2026-09-19T09:28:46.990911Z"
}
```

---

### 14. 14. Update Room Detail

- **Method:** `PATCH`
- **Endpoint:** `http://127.0.0.1:8000/api/rooms/16a78509-9865-4073-864f-efc627b262e7/`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...FsJLLO3WyA
```

#### Request Body
```json
{
  "location": "Building A, Floor 3 (Executive Wing)"
}
```

#### Response (`HTTP 200`)
```json
{
  "id": "16a78509-9865-4073-864f-efc627b262e7",
  "name": "Boardroom Alpha 1789810121",
  "capacity": 20,
  "location": "Building A, Floor 3 (Executive Wing)",
  "amenities": [
    "Video Conference",
    "Projector",
    "Whiteboard"
  ],
  "is_active": true,
  "created_by": "41c81a7a-0b56-4a21-a8c8-33a884be758f",
  "created_by_email": "admin123@gmail.com",
  "created_at": "2026-09-19T09:28:46.990895Z",
  "updated_at": "2026-09-19T09:28:47.047719Z"
}
```

---

### 15. 15. Check Availability (Slot Available)

- **Method:** `GET`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/check-availability/?room_id=16a78509-9865-4073-864f-efc627b262e7&start_time=2026-09-20T10%3A00%3A00%2B00%3A00&end_time=2026-09-20T11%3A30%3A00%2B00%3A00`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
{
  "room_id": "16a78509-9865-4073-864f-efc627b262e7",
  "room_name": "Boardroom Alpha 1789810121",
  "room_active": true,
  "start_time": "2026-09-20T10:00:00+00:00",
  "end_time": "2026-09-20T11:30:00+00:00",
  "is_available": true,
  "conflicts": []
}
```

---

### 16. 16. Create Booking 1 (Strategy Sync)

- **Method:** `POST`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/`
- **Status Code:** `201`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body
```json
{
  "room": "16a78509-9865-4073-864f-efc627b262e7",
  "title": "Quarterly Strategy Sync",
  "description": "Discussing product roadmap, OKRs, and team planning",
  "start_time": "2026-09-20T10:00:00+00:00",
  "end_time": "2026-09-20T11:30:00+00:00",
  "attendees_count": 12
}
```

#### Response (`HTTP 201`)
```json
{
  "id": "5d805ab0-d43a-49f6-bfe3-40456d97f9c7",
  "room": "16a78509-9865-4073-864f-efc627b262e7",
  "room_name": "Boardroom Alpha 1789810121",
  "room_location": "Building A, Floor 3 (Executive Wing)",
  "room_capacity": 20,
  "user": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
  "user_email": "alice_1789810121@innovyx.com",
  "user_name": "Alice Engineer",
  "title": "Quarterly Strategy Sync",
  "description": "Discussing product roadmap, OKRs, and team planning",
  "start_time": "2026-09-20T10:00:00Z",
  "end_time": "2026-09-20T11:30:00Z",
  "attendees_count": 12,
  "status": "CONFIRMED",
  "created_at": "2026-09-19T09:28:47.072358Z",
  "updated_at": "2026-09-19T09:28:47.072367Z"
}
```

---

### 17. 17. Conflict Attempt (Overlapping Booking)

- **Method:** `POST`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/`
- **Status Code:** `409`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body
```json
{
  "room": "16a78509-9865-4073-864f-efc627b262e7",
  "title": "Double Booking Conflict Attempt",
  "description": "This booking overlaps and should be blocked",
  "start_time": "2026-09-20T10:30:00+00:00",
  "end_time": "2026-09-20T12:00:00+00:00",
  "attendees_count": 5
}
```

#### Response (`HTTP 409`)
```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Conflict detected: Room 'Boardroom Alpha 1789810121' is already booked for the requested time slot.",
    "details": {
      "room_id": "16a78509-9865-4073-864f-efc627b262e7",
      "room_name": "Boardroom Alpha 1789810121",
      "conflicts": [
        {
          "id": "5d805ab0-d43a-49f6-bfe3-40456d97f9c7",
          "title": "Quarterly Strategy Sync",
          "start_time": "2026-09-20T10:00:00+00:00",
          "end_time": "2026-09-20T11:30:00+00:00",
          "booked_by": "alice_1789810121@innovyx.com"
        }
      ]
    }
  }
}
```

---

### 18. 18. Check Availability (Slot Busy)

- **Method:** `GET`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/check-availability/?room_id=16a78509-9865-4073-864f-efc627b262e7&start_time=2026-09-20T10%3A00%3A00%2B00%3A00&end_time=2026-09-20T11%3A30%3A00%2B00%3A00`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
{
  "room_id": "16a78509-9865-4073-864f-efc627b262e7",
  "room_name": "Boardroom Alpha 1789810121",
  "room_active": true,
  "start_time": "2026-09-20T10:00:00+00:00",
  "end_time": "2026-09-20T11:30:00+00:00",
  "is_available": false,
  "conflicts": [
    {
      "id": "5d805ab0-d43a-49f6-bfe3-40456d97f9c7",
      "title": "Quarterly Strategy Sync",
      "start_time": "2026-09-20T10:00:00+00:00",
      "end_time": "2026-09-20T11:30:00+00:00",
      "booked_by": "alice_1789810121@innovyx.com"
    }
  ]
}
```

---

### 19. 19. Create Booking 2 in Room 2

- **Method:** `POST`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/`
- **Status Code:** `201`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body
```json
{
  "room": "f81129bf-6500-435a-95b1-2ecb3887c6fe",
  "title": "Frontend Architecture Review",
  "description": "Code review and component library design",
  "start_time": "2026-09-20T10:00:00+00:00",
  "end_time": "2026-09-20T11:30:00+00:00",
  "attendees_count": 4
}
```

#### Response (`HTTP 201`)
```json
{
  "id": "3345fcf6-0d43-46a1-ba11-513a2514257c",
  "room": "f81129bf-6500-435a-95b1-2ecb3887c6fe",
  "room_name": "Conference Room Beta 1789810121",
  "room_location": "Building B, Floor 1",
  "room_capacity": 8,
  "user": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
  "user_email": "alice_1789810121@innovyx.com",
  "user_name": "Alice Engineer",
  "title": "Frontend Architecture Review",
  "description": "Code review and component library design",
  "start_time": "2026-09-20T10:00:00Z",
  "end_time": "2026-09-20T11:30:00Z",
  "attendees_count": 4,
  "status": "CONFIRMED",
  "created_at": "2026-09-19T09:28:47.103882Z",
  "updated_at": "2026-09-19T09:28:47.103891Z"
}
```

---

### 20. 20. List All Bookings

- **Method:** `GET`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
[
  {
    "id": "5d805ab0-d43a-49f6-bfe3-40456d97f9c7",
    "room": "16a78509-9865-4073-864f-efc627b262e7",
    "room_name": "Boardroom Alpha 1789810121",
    "room_location": "Building A, Floor 3 (Executive Wing)",
    "room_capacity": 20,
    "user": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
    "user_email": "alice_1789810121@innovyx.com",
    "user_name": "Alice Engineer",
    "title": "Quarterly Strategy Sync",
    "description": "Discussing product roadmap, OKRs, and team planning",
    "start_time": "2026-09-20T10:00:00Z",
    "end_time": "2026-09-20T11:30:00Z",
    "attendees_count": 12,
    "status": "CONFIRMED",
    "created_at": "2026-09-19T09:28:47.072358Z",
    "updated_at": "2026-09-19T09:28:47.072367Z"
  },
  {
    "id": "3345fcf6-0d43-46a1-ba11-513a2514257c",
    "room": "f81129bf-6500-435a-95b1-2ecb3887c6fe",
    "room_name": "Conference Room Beta 1789810121",
    "room_location": "Building B, Floor 1",
    "room_capacity": 8,
    "user": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
    "user_email": "alice_1789810121@innovyx.com",
    "user_name": "Alice Engineer",
    "title": "Frontend Architecture Review",
    "description": "Code review and component library design",
    "start_time": "2026-09-20T10:00:00Z",
    "end_time": "2026-09-20T11:30:00Z",
    "attendees_count": 4,
    "status": "CONFIRMED",
    "created_at": "2026-09-19T09:28:47.103882Z",
    "updated_at": "2026-09-19T09:28:47.103891Z"
  },
  {
    "id": "67a5fb3f-8e10-4117-bba6-b7e65df8b4b7",
    "room": "b583a084-c7d5-45bf-b1ba-5e6013983963",
    "room_name": "101",
    "room_location": "bhive",
    "room_capacity": 18,
    "user": "39076b89-ba7f-4e14-9f32-c8a1fcc40da9",
    "user_email": "sarah.connor@example.com",
    "user_name": "Sarah Connor",
    "title": "Quarterly Sprint Planning",
    "description": "Cross-team sprint review and allocation",
    "start_time": "2026-09-25T14:00:00Z",
    "end_time": "2026-09-25T15:30:00Z",
    "attendees_count": 12,
    "status": "CANCELLED",
    "created_at": "2026-09-19T07:53:07.681997Z",
    "updated_at": "2026-09-19T08:46:10.115387Z"
  }
]
```

---

### 21. 21. Filter Bookings by Room

- **Method:** `GET`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/?room_id=16a78509-9865-4073-864f-efc627b262e7`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
[
  {
    "id": "5d805ab0-d43a-49f6-bfe3-40456d97f9c7",
    "room": "16a78509-9865-4073-864f-efc627b262e7",
    "room_name": "Boardroom Alpha 1789810121",
    "room_location": "Building A, Floor 3 (Executive Wing)",
    "room_capacity": 20,
    "user": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
    "user_email": "alice_1789810121@innovyx.com",
    "user_name": "Alice Engineer",
    "title": "Quarterly Strategy Sync",
    "description": "Discussing product roadmap, OKRs, and team planning",
    "start_time": "2026-09-20T10:00:00Z",
    "end_time": "2026-09-20T11:30:00Z",
    "attendees_count": 12,
    "status": "CONFIRMED",
    "created_at": "2026-09-19T09:28:47.072358Z",
    "updated_at": "2026-09-19T09:28:47.072367Z"
  }
]
```

---

### 22. 22. Filter Bookings by Status (CONFIRMED)

- **Method:** `GET`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/?status=CONFIRMED`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
[
  {
    "id": "5d805ab0-d43a-49f6-bfe3-40456d97f9c7",
    "room": "16a78509-9865-4073-864f-efc627b262e7",
    "room_name": "Boardroom Alpha 1789810121",
    "room_location": "Building A, Floor 3 (Executive Wing)",
    "room_capacity": 20,
    "user": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
    "user_email": "alice_1789810121@innovyx.com",
    "user_name": "Alice Engineer",
    "title": "Quarterly Strategy Sync",
    "description": "Discussing product roadmap, OKRs, and team planning",
    "start_time": "2026-09-20T10:00:00Z",
    "end_time": "2026-09-20T11:30:00Z",
    "attendees_count": 12,
    "status": "CONFIRMED",
    "created_at": "2026-09-19T09:28:47.072358Z",
    "updated_at": "2026-09-19T09:28:47.072367Z"
  },
  {
    "id": "3345fcf6-0d43-46a1-ba11-513a2514257c",
    "room": "f81129bf-6500-435a-95b1-2ecb3887c6fe",
    "room_name": "Conference Room Beta 1789810121",
    "room_location": "Building B, Floor 1",
    "room_capacity": 8,
    "user": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
    "user_email": "alice_1789810121@innovyx.com",
    "user_name": "Alice Engineer",
    "title": "Frontend Architecture Review",
    "description": "Code review and component library design",
    "start_time": "2026-09-20T10:00:00Z",
    "end_time": "2026-09-20T11:30:00Z",
    "attendees_count": 4,
    "status": "CONFIRMED",
    "created_at": "2026-09-19T09:28:47.103882Z",
    "updated_at": "2026-09-19T09:28:47.103891Z"
  }
]
```

---

### 23. 23. User Personal Bookings (/api/my-bookings/)

- **Method:** `GET`
- **Endpoint:** `http://127.0.0.1:8000/api/my-bookings/`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
[
  {
    "id": "5d805ab0-d43a-49f6-bfe3-40456d97f9c7",
    "room": "16a78509-9865-4073-864f-efc627b262e7",
    "room_name": "Boardroom Alpha 1789810121",
    "room_location": "Building A, Floor 3 (Executive Wing)",
    "room_capacity": 20,
    "user": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
    "user_email": "alice_1789810121@innovyx.com",
    "user_name": "Alice Engineer",
    "title": "Quarterly Strategy Sync",
    "description": "Discussing product roadmap, OKRs, and team planning",
    "start_time": "2026-09-20T10:00:00Z",
    "end_time": "2026-09-20T11:30:00Z",
    "attendees_count": 12,
    "status": "CONFIRMED",
    "created_at": "2026-09-19T09:28:47.072358Z",
    "updated_at": "2026-09-19T09:28:47.072367Z"
  },
  {
    "id": "3345fcf6-0d43-46a1-ba11-513a2514257c",
    "room": "f81129bf-6500-435a-95b1-2ecb3887c6fe",
    "room_name": "Conference Room Beta 1789810121",
    "room_location": "Building B, Floor 1",
    "room_capacity": 8,
    "user": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
    "user_email": "alice_1789810121@innovyx.com",
    "user_name": "Alice Engineer",
    "title": "Frontend Architecture Review",
    "description": "Code review and component library design",
    "start_time": "2026-09-20T10:00:00Z",
    "end_time": "2026-09-20T11:30:00Z",
    "attendees_count": 4,
    "status": "CONFIRMED",
    "created_at": "2026-09-19T09:28:47.103882Z",
    "updated_at": "2026-09-19T09:28:47.103891Z"
  }
]
```

---

### 24. 24. Retrieve Booking Detail

- **Method:** `GET`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/5d805ab0-d43a-49f6-bfe3-40456d97f9c7/`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
{
  "id": "5d805ab0-d43a-49f6-bfe3-40456d97f9c7",
  "room": "16a78509-9865-4073-864f-efc627b262e7",
  "room_name": "Boardroom Alpha 1789810121",
  "room_location": "Building A, Floor 3 (Executive Wing)",
  "room_capacity": 20,
  "user": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
  "user_email": "alice_1789810121@innovyx.com",
  "user_name": "Alice Engineer",
  "title": "Quarterly Strategy Sync",
  "description": "Discussing product roadmap, OKRs, and team planning",
  "start_time": "2026-09-20T10:00:00Z",
  "end_time": "2026-09-20T11:30:00Z",
  "attendees_count": 12,
  "status": "CONFIRMED",
  "created_at": "2026-09-19T09:28:47.072358Z",
  "updated_at": "2026-09-19T09:28:47.072367Z"
}
```

---

### 25. 25. Update Booking Title

- **Method:** `PATCH`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/5d805ab0-d43a-49f6-bfe3-40456d97f9c7/`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body
```json
{
  "title": "Updated Quarterly Strategy Sync (All Leads)"
}
```

#### Response (`HTTP 200`)
```json
{
  "id": "5d805ab0-d43a-49f6-bfe3-40456d97f9c7",
  "room": "16a78509-9865-4073-864f-efc627b262e7",
  "room_name": "Boardroom Alpha 1789810121",
  "room_location": "Building A, Floor 3 (Executive Wing)",
  "room_capacity": 20,
  "user": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
  "user_email": "alice_1789810121@innovyx.com",
  "user_name": "Alice Engineer",
  "title": "Updated Quarterly Strategy Sync (All Leads)",
  "description": "Discussing product roadmap, OKRs, and team planning",
  "start_time": "2026-09-20T10:00:00Z",
  "end_time": "2026-09-20T11:30:00Z",
  "attendees_count": 12,
  "status": "CONFIRMED",
  "created_at": "2026-09-19T09:28:47.072358Z",
  "updated_at": "2026-09-19T09:28:47.151770Z"
}
```

---

### 26. 26. Booking Statistics

- **Method:** `GET`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/stats/`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
{
  "total_bookings": 3,
  "confirmed_bookings": 2,
  "cancelled_bookings": 1,
  "today_bookings": 0,
  "upcoming_bookings": 2
}
```

---

### 27. 27. Cancel Booking

- **Method:** `PATCH`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/5d805ab0-d43a-49f6-bfe3-40456d97f9c7/cancel/`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
{
  "message": "Booking 'Updated Quarterly Strategy Sync (All Leads)' has been successfully cancelled.",
  "booking": {
    "id": "5d805ab0-d43a-49f6-bfe3-40456d97f9c7",
    "room": "16a78509-9865-4073-864f-efc627b262e7",
    "room_name": "Boardroom Alpha 1789810121",
    "room_location": "Building A, Floor 3 (Executive Wing)",
    "room_capacity": 20,
    "user": "8e6e6107-2800-4aaf-a8b1-0355c79e2353",
    "user_email": "alice_1789810121@innovyx.com",
    "user_name": "Alice Engineer",
    "title": "Updated Quarterly Strategy Sync (All Leads)",
    "description": "Discussing product roadmap, OKRs, and team planning",
    "start_time": "2026-09-20T10:00:00Z",
    "end_time": "2026-09-20T11:30:00Z",
    "attendees_count": 12,
    "status": "CANCELLED",
    "created_at": "2026-09-19T09:28:47.072358Z",
    "updated_at": "2026-09-19T09:28:47.173918Z"
  }
}
```

---

### 28. 28. Double Cancellation Rejection

- **Method:** `PATCH`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/5d805ab0-d43a-49f6-bfe3-40456d97f9c7/cancel/`
- **Status Code:** `400`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 400`)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "This booking is already cancelled.",
    "details": {}
  }
}
```

---

### 29. 29. Verify Slot Freed After Cancellation

- **Method:** `GET`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/check-availability/?room_id=16a78509-9865-4073-864f-efc627b262e7&start_time=2026-09-20T10%3A00%3A00%2B00%3A00&end_time=2026-09-20T11%3A30%3A00%2B00%3A00`
- **Status Code:** `200`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 200`)
```json
{
  "room_id": "16a78509-9865-4073-864f-efc627b262e7",
  "room_name": "Boardroom Alpha 1789810121",
  "room_active": true,
  "start_time": "2026-09-20T10:00:00+00:00",
  "end_time": "2026-09-20T11:30:00+00:00",
  "is_available": true,
  "conflicts": []
}
```

---

### 30. 30. Delete Booking 2

- **Method:** `DELETE`
- **Endpoint:** `http://127.0.0.1:8000/api/bookings/3345fcf6-0d43-46a1-ba11-513a2514257c/`
- **Status Code:** `204`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIU...[JWT_TRUNCATED]...oFoRqm59LY
```

#### Request Body: *(None)*

#### Response (`HTTP 204`)
*(Empty Body / 204 No Content)*

---
