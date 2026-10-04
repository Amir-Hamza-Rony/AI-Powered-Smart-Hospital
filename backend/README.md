# Smart Hospital — Backend (Phase 7: Foundation + Auth + RBAC)

Django 4.2+ / DRF backend foundation for the AI-Powered Smart Hospital / Clinic System.
PostgreSQL + JWT authentication + role-based access control + immutable audit log.

> Frontend (Phases 1–6) is untouched and keeps working on mock data while
> backend modules are integrated phase-by-phase.

## Requirements

- Python 3.11+
- PostgreSQL 14+
- Node.js 18+ (frontend)

## Backend setup

```bash
cd backend

# 1. Create and activate a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# 2. Install dependencies
pip install -r requirements/development.txt

# 3. Configure environment
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
# then edit DATABASE_URL, SECRET_KEY, ...

# 4. Create the PostgreSQL database
createdb smart_hospital
# (or: CREATE DATABASE smart_hospital; via psql/pgAdmin)

# 5. Run migrations
python manage.py migrate

# 6. Seed development demo accounts (dev only)
python manage.py seed_demo_data

# 7. Start the server
python manage.py runserver
```

Backend API: `http://localhost:8000/api/` · Docs: `http://localhost:8000/api/docs/`

## Development demo accounts (dev only — never production)

All seeded with password `Demo1234!`:

| Role | Email |
|---|---|
| Super Admin | admin@smarthospital.local |
| Doctor | doctor@smarthospital.local |
| Nurse | nurse@smarthospital.local |
| Receptionist | receptionist@smarthospital.local |
| Pharmacist | pharmacist@smarthospital.local |
| Pathologist | pathologist@smarthospital.local |
| Patient | patient@smarthospital.local |

## Frontend

```bash
# project root
npm install
npm run dev
```

Frontend dev server: `http://localhost:5173` · API base: `VITE_API_BASE_URL` (see root `.env.example`, defaults to `http://localhost:8000/api`).

The login page (`/login`) talks to the backend when reachable; otherwise
**Continue with demo access** keeps the existing mock-data experience.

## Key endpoints (Phase 7)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register/ | Public | Patient self-registration |
| POST | /api/auth/login/ | Public | Returns access + refresh + user |
| POST | /api/auth/refresh/ | Public | Rotate access token |
| POST | /api/auth/logout/ | JWT | Blacklists refresh token |
| GET/PATCH | /api/auth/me/ | JWT | Current user / update profile |
| GET/PATCH | /api/users/me/ | JWT | Same as above (alias) |
| GET/POST | /api/users/ | Super Admin | List (role/active/search filters) + create |
| GET/PATCH/DELETE | /api/users/:id/ | Super Admin | Retrieve / update / delete |
| GET | /api/audit/ | Super Admin | Audit trail (action/module filters), read-only |
| GET | /api/docs/ | Public | Swagger UI |
| GET | /api/redoc/ | Public | ReDoc |

Remaining namespaces (`patients`, `doctors`, `appointments`, `prescriptions`,
`laboratory`, `pharmacy`, `billing`, `automation`) are reserved for later phases.

## Verification

```bash
python manage.py check
python manage.py migrate
python manage.py test apps.accounts apps.audit
```

## Project layout

```
backend/
├── manage.py
├── config/            # settings (base/production), urls, drf helpers, wsgi/asgi
├── apps/
│   ├── accounts/      # custom User, JWT auth, RBAC permissions, user APIs
│   ├── audit/         # immutable AuditLog + logging utility
│   ├── patients/ doctors/ appointments/ prescriptions/
│   ├── laboratory/ pharmacy/ billing/ automation/   # namespaces for later phases
├── requirements/      # base.txt / development.txt
├── .env.example
└── README.md
```
