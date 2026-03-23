# Reservation Project Structure

This repository is organized by responsibility:

- `React/`: React + Vite UI (`src`, `public`, Vite/TS/ESLint config)
- `API/`: HTTP API server (`server.js`)
- `front-end/`: frontend output/static artifacts (`dist`)
- `API/database/`: SQL/schema/setup artifacts (`database.sql`, `database.json`, `MYSQL_SETUP.md`)
- `mysql/` and `mysql_data/`: local MySQL-related files/data used by your current setup

## Run

- API server (single instance):
  ```bash
  cd API
  npm run dev
  ```
  If you see “EADDRINUSE” the port is already in use; stop other Node processes first.

- Frontend dev server:
  ```bash
  cd React
  npm run dev
  ```

- Build frontend: `npm run build`
- Preview build: `npm run preview`

## Deploy

This app is a full-stack project:

- `React/` builds the frontend
- `API/` runs the Node.js server
- MySQL is required for persistent data

Because of that, GitHub can store the code, but GitHub Pages cannot run the backend or database. A GitHub-connected host such as Railway can run the app online from this repository.

### Recommended deploy flow

1. Push this folder to a GitHub repository.
2. Create a Railway project from that GitHub repo.
3. Add a MySQL database service in Railway.
4. Deploy the repo using the included `Dockerfile`.
5. Set these environment variables in Railway:
   - `JWT_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `LOCAL_NETWORK_ONLY=false`
6. Either set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, or let the app read Railway-style MySQL variables (`MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`).

The app already listens on `PORT`, and the backend serves the built frontend from `front-end/dist` in production.

## Environment

Copy `.env.example` to `.env` and set:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` (required; generate a strong random value)
- `PASSWORD_SALT_ROUNDS` (optional; default 10)
- `PORT` (optional; current local setup uses 4001)

For public cloud deployment, set `LOCAL_NETWORK_ONLY=false` so the hosted app can accept internet traffic.

## Data cleanup (bookings)

Before enforcing the unique booking index, run `API/database/check_overlapping_bookings.sql` against your MySQL DB. If it returns rows, resolve those duplicates so the unique constraint can be applied without errors.
