# HR Manager & Salary Analytics System — IP Final 2026

Live, time-limited university exam (Internet Programming 2026), ends 12:00 Asia/Bangkok. AI allowed.
Grading = logic strictly matches spec, esp. **edge cases, error handling, input validation**.
Work style: fast & terse, write code directly, no long explanations, no unnecessary libs, don't re-read files just written.

## Stack
- `backend/`: Node + Express 4, CommonJS, plain JS, MySQL via `mysql2/promise`, `cors`, `dotenv`. Start: `npm start` (`node server.js`).
- `frontend/`: Expo React Native, JavaScript, blank template. No extra libs. Start: `npx expo start`.
- Frontend API base: `http://119.59.102.161:3059/api`

## Features
- **Phase 1**: Login `admin` / `password123` → returns token `"mock-jwt-token"`. Employee CRUD: list, add, toggle status `Active` ⇄ `On Leave`, delete (with confirm dialog in UI).
- **Phase 2**: `GET /api/employees/salary-clusters` — 1D K-Means (k=3) on salaries → Tier 1–3, each with centroid + count. Frontend: loading indicator + summary cards.

## Database (MySQL, shared w/ old project)
- DB `ip_std6730202645`, `DB_HOST=localhost` (same server), managed via phpMyAdmin. utf8mb4.
- Limited privileges: **no FOREIGN KEY, no TRUNCATE, no CREATE DATABASE, no DROP**.
- **Naming rule: table name AND every column must start with `Tharatap_`** (e.g. `Tharatap_employees`, `Tharatap_id`, `Tharatap_salary`).

## Deployment
- Server `119.59.102.161`, only port **3059** open (backend must listen on 3059).
- Upload via FileZilla SFTP port 2222; run via `ssh std6730202645@119.59.102.161 -p 2222`.
- Target folder `/app/hr-final`. An OLD project in `/app` currently uses port 3059 — don't touch it.
- Config via `backend/.env` (see `backend/.env.example`). **Never commit `.env` or real credentials — repo is public.**

## Submission
Public GitHub repo `Std6730202645IPFinal2026` with `backend/` and `frontend/`; examiner must be able to start both (node + Expo).
