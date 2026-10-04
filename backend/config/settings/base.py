"""Base Django settings for the Smart Hospital backend (Phase 7).

Everything secret or environment-specific is read from environment
variables — see ``backend/.env.example``. PostgreSQL is the database;
configure it with ``DATABASE_URL``.
"""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load backend/.env automatically (local dev). Existing process
# environment variables take precedence over .env values.
load_dotenv(BASE_DIR / ".env", override=False)


def env_bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# SECURITY -----------------------------------------------------------------
# Development-only fallback. Production settings refuse to boot with it.
SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-dev-only-change-me")
DEBUG = env_bool("DEBUG", True)
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "localhost,127.0.0.1")

# APPLICATIONS --------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    # Local — Phase 7 foundation
    "apps.accounts",
    "apps.audit",
    # Local — module namespaces for later phases (no models yet)
    "apps.patients",
    "apps.doctors",
    "apps.appointments",
    "apps.prescriptions",
    "apps.laboratory",
    "apps.pharmacy",
    "apps.billing",
    "apps.automation",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# DATABASE — PostgreSQL via DATABASE_URL ------------------------------------
DATABASES = {
    "default": dj_database_url.parse(
        os.environ.get(
            "DATABASE_URL",
            "postgres://postgres:postgres@localhost:5432/smart_hospital",
        ),
        conn_max_age=600,
    )
}
if DATABASES["default"].get("ENGINE") == "django.db.backends.postgresql":
    DATABASES["default"].setdefault("OPTIONS", {}).setdefault("connect_timeout", 5)

AUTH_USER_MODEL = "accounts.User"

# PASSWORDS -----------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# INTERNATIONALIZATION -------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS — explicit origins only, never allow-all ----------------------------
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", "http://localhost:5173")

# DJANGO REST FRAMEWORK ------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "config.drf.StandardPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "config.drf.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.environ.get("JWT_ACCESS_MINUTES", "60"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.environ.get("JWT_REFRESH_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# OPENAPI --------------------------------------------------------------------
SPECTACULAR_SETTINGS = {
    "TITLE": "Smart Hospital API",
    "DESCRIPTION": "AI-Powered Smart Hospital / Clinic System — backend foundation (Phase 7): authentication, users, RBAC, audit log.",
    "VERSION": "0.7.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "GenderEnum": "apps.patients.models.Gender",
        "BloodGroupEnum": "apps.patients.models.BloodGroup",
        "PatientStatusEnum": "apps.patients.models.PatientStatus",
        "DoctorAvailabilityEnum": "apps.doctors.models.DoctorAvailability",
        "DoctorStatusEnum": "apps.doctors.models.DoctorStatus",
        "WeekdayEnum": "apps.doctors.models.Weekday",
        "AppointmentTypeEnum": "apps.appointments.models.AppointmentType",
        "AppointmentStatusEnum": "apps.appointments.models.AppointmentStatus",
        "PrescriptionStatusEnum": "apps.prescriptions.models.PrescriptionStatus",
        "LabOrderStatusEnum": "apps.laboratory.models.LabOrderStatus",
        "LabPriorityEnum": "apps.laboratory.models.LabPriority",
        "LabResultStatusEnum": "apps.laboratory.models.LabResultStatus",
        "DispensingStatusEnum": "apps.pharmacy.models.DispensingStatus",
        "InvoiceStatusEnum": "apps.billing.models.InvoiceStatus",
        "ServiceTypeEnum": "apps.billing.models.ServiceType",
        "BillingCategoryEnum": "apps.billing.models.BillingCategory",
        "PaymentMethodEnum": "apps.billing.models.PaymentMethod",
        "PaymentStatusEnum": "apps.billing.models.PaymentStatus",
        "LedgerTypeEnum": "apps.billing.models.LedgerType",
    },
    "TAGS": [
        {"name": "auth", "description": "Registration, JWT login/refresh/logout, current user."},
        {"name": "users", "description": "Profile self-service and admin user management."},
        {"name": "audit", "description": "Immutable audit trail (admin read-only)."},
        {"name": "patients", "description": "Patient registry with NID/phone deduplication."},
        {"name": "doctors", "description": "Doctor roster, fees, availability and duty schedules."},
        {"name": "appointments", "description": "Patient–doctor bookings with status workflow."},
        {"name": "prescriptions", "description": "Clinical prescriptions with medicine items."},
        {"name": "laboratory", "description": "Lab test catalog, orders, results and reports."},
        {"name": "pharmacy", "description": "Medicine catalog, inventory batches and dispensing."},
        {"name": "invoices", "description": "Itemized invoices with server-derived totals."},
        {"name": "payments", "description": "Ledger-grade payment records."},
        {"name": "ledger", "description": "Immutable revenue ledger (read-only)."},
    ],
}
