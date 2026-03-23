# Reservation System Architecture

## Stack
- Frontend: React + TypeScript (Vite)
- Backend: Node.js HTTP server
- Database: MySQL (via `mysql2/promise`)

## Main Files
- Frontend app shell: `React/src/App.tsx`
- Backend API: `API/server.js`
- DB config: `back-end/db-config.js`
- Optional DB helper layer (not active runtime path): `back-end/db.js`
- SQL reference schema: `back-end/database/database.sql`

## Runtime Ports
- Frontend dev server: `5173` (Vite)
- Backend API: `4000`
- MySQL: `3306`

## Frontend Module Map
- `src/App.tsx`
  - Auth/session state
  - Role-based navigation (admin vs user)
  - Tab routing to feature components
- `src/AdminHome.tsx`
  - Pending booking approvals
  - Approval/rejection actions
  - Approval history + filters
- `src/ReservationForm.tsx`
  - Admin creates date/vehicle entry (`admin-created`)
- `src/Booking.tsx`
  - User booking form (company, vehicle, date, time, note)
- `src/TimeTable.tsx`
  - Schedule display from bookings/reservations
- `src/UserApprovals.tsx`
  - User-only booking status
  - ATT print for approved records
- `src/AdminPanel.tsx`
  - Company/user management UI

## Backend Route Map (`API/server.js`)

### Auth
- `POST /api/login.
  - Validates username/password against DB users + fallback hardcoded users
  - Returns `{ token, user }`

### Companies
- `GET /api/companies`
- `POST /api/companies`
- `PUT /api/companies/:id`
- `DELETE /api/companies/:id`

### Users
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

### Vehicles
- `GET /api/vehicles`
- `POST /api/vehicles`
- `GET /api/vehicles/:id`
- `PUT /api/vehicles/:id`
- `DELETE /api/vehicles/:id`

### Vehicle Availability
- `GET /api/vehicles/:id/availability?date=YYYY-MM-DD`
- `POST /api/vehicles/:id/availability`

### Reservations (Admin Entry Schedule)
- `GET /api/reservations`
- `POST /api/reservations`
- `DELETE /api/reservations/:id`

### Bookings
- `GET /api/bookings`
  - Supports query filters:
    - `created_by_user_id`
    - `created_by_user_email`
- `POST /api/bookings`
  - Validates:
    - required fields
    - valid time range
    - existing admin entry (`reservations.status = 'admin-created'`) for selected vehicle/date
    - no overlapping booking
- `POST /api/bookings/:id/approve`
  - Rejects overlap with already approved/booked slot (`DOUBLE_RESERVATION`)
- `POST /api/bookings/:id/reject`
- `DELETE /api/bookings/:id`

## Database Table Map (Active)

### `companies`
- Stores organization records used in booking forms and admin management

### `users`
- Stores login users (name/email/password/role/company_id)

### `vehicles`
- Stores vehicle list (`vehicle_type`, `quantity`, `car_model`)

### `vehicle_availability`
- Stores per-vehicle/day slot state (`slot`, `state`)

### `reservations`
- Used as admin-created date/vehicle entry gate
- Booking allowed only when matching entry exists with `status = 'admin-created'`

### `bookings`
- Stores user booking requests
- Includes:
  - requester identity (`created_by_user_id`, `created_by_user_email`)
  - status (`pending`, `approved`, `rejected`, `booked`)
  - decision timestamp (`decision_at`)

## Core Business Flow
1. Admin adds vehicle/date entry in Add Entry
2. User submits booking for that date/vehicle/time
3. Backend checks:
   - admin-created entry exists
   - no double booking overlap
4. Booking created as `pending`
5. Admin approves/rejects
6. User sees own status in My ATT tab
7. If approved, user can print ATT

## Data Isolation Rules
- User ATT/bookings view filtered by both:
  - `created_by_user_id`
  - `created_by_user_email`
- Prevents cross-account visibility/printing

## Notes
- `server.js` currently contains direct SQL route handlers and table bootstrap logic.
- `db.js` is present but not the active code path for API operations.
- If DB credentials are wrong, API startup will fail at DB initialization.
