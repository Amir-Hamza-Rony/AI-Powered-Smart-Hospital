# Deployment Guide — AI-Powered Smart Hospital
# =============================================
# This project is a full-stack app: React frontend (Vercel) + Django backend (Render/Railway) + PostgreSQL.
# Vercel hosts the frontend; the backend must be deployed separately.

## 1. Frontend — Deploy to Vercel

### Option A: Vercel CLI (after logging in)
cd "D:\AI-Powered Smart Hospital"
vercel login                      # complete device-code auth at https://vercel.com/oauth/device
vercel deploy                     # production deployment

### Option B: Vercel Dashboard (recommended, avoids Windows symlink issues)
1. Push code to GitHub
2. Go to https://vercel.com → "Add New Project" → Import your GitHub repo
3. Framework preset: Vite
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add Environment Variable:
   - `VITE_API_BASE_URL` = https://your-backend.onrender.com/api   (after backend is deployed)
7. Click Deploy

### Environment Variables for Vercel (Frontend)
| Variable | Value | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com/api` | Set after backend deployment |

The frontend has a **demo mode fallback** — if the backend is unreachable, the app still runs with mock data. For a live demo with real data, the backend must be deployed.

---

## 2. Backend — Deploy to Render (recommended)

### Option A: render.yaml (one-click)
1. Go to https://render.com → "Blueprint" → connect your GitHub repo
2. Render will auto-detect `render.yaml` and create:
   - Web Service: `smart-hospital-backend`
   - PostgreSQL Database: `smart-hospital-db`
3. Update `CORS_ALLOWED_ORIGINS` to your Vercel frontend URL

### Option B: Manual Render setup
1. Create a **Web Service** + **PostgreSQL Database** on Render
2. Connect your GitHub repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
5. Environment variables (see below)

### Environment Variables for Render (Backend)
| Variable | Value | Notes |
|---|---|---|
| `SECRET_KEY` | `generate a strong random string` | Render auto-generates if using blueprint |
| `DEBUG` | `False` | Production mode |
| `ALLOWED_HOSTS` | `smart-hospital-backend.onrender.com,localhost,127.0.0.1` | Add your Render hostname |
| `CORS_ALLOWED_ORIGINS` | `https://your-frontend.vercel.app` | Your Vercel frontend URL |
| `CSRF_TRUSTED_ORIGINS` | `https://your-frontend.vercel.app` | Same as CORS |
| `DATABASE_URL` | `auto-provided by Render PostgreSQL` | From the linked database |
| `AI_PROVIDER` | `local` | Rule-based AI engine (default) |

---

## 3. Connect Frontend to Backend

After the backend is deployed:
1. Get your Render backend URL: `https://smart-hospital-backend.onrender.com`
2. In Vercel dashboard → Project → Settings → Environment Variables
3. Set `VITE_API_BASE_URL` = `https://smart-hospital-backend.onrender.com/api`
4. Redeploy the frontend

---

## 4. Default Demo Credentials

The backend supports seed/demo accounts. Use `python manage.py seed_demo_data` on the backend to create test accounts, or register new accounts via `/api/auth/register/`.

---

## 5. What's Already Built (ready to demo)

| Module | Status |
|---|---|
| Authentication (JWT login/register/refresh) | ✅ Complete |
| Patients, Doctors, Appointments | ✅ Complete (backend + frontend) |
| Prescriptions | ✅ Complete |
| Laboratory (tests, orders, results) | ✅ Complete |
| Pharmacy (medicines, inventory, dispensing) | ✅ Complete |
| Billing (invoices, payments, ledger, claims) | ✅ Complete |
| AI (triage, clinical assistant, advisory, no-show, analytics) | ✅ Complete (rule-based) |
| Automation (reminders, lab alerts, stock alerts, queue, notifications) | ✅ Complete |
| Audit logging | ✅ Complete |
| OpenAPI docs (`/api/schema`, `/api/docs`, `/api/redoc`) | ✅ Complete |
| RBAC (7 roles, permission-gated) | ✅ Complete |

---

## 6. What's Remaining (optional for demo)

| Item | Status |
|---|---|
| Hosted LLM provider (OpenAI/Anthropic) | ⏳ Optional — needs product approval |
| Frontend test suite | ⏳ Optional — no test runner configured |
| README rewrite | ⏳ Currently Vite template |

---

## 7. Files Created/Modified for Deployment

- `backend/requirements.txt` — production Python dependencies (+ gunicorn, whitenoise)
- `backend/runtime.txt` — Python version pin
- `backend/Procfile` — process file for deployment platforms
- `render.yaml` — Render.com blueprint for one-click backend + DB deployment
- `backend/config/settings/base.py` — added Whitenoise middleware + static file config
- `vercel.json` — already configured for Vite SPA deployment (no changes needed)
