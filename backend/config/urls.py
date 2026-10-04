"""Root URL configuration — versioned API under /api/ (Phase 7)."""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from config.views import ApiRootView

urlpatterns = [
    path("admin/", admin.site.urls),
    # Public API index
    path("api/", ApiRootView.as_view(), name="api-root"),
    # Phase 7 — fully implemented
    path("api/auth/", include("apps.accounts.urls_auth")),
    path("api/users/", include("apps.accounts.urls_users")),
    path("api/audit/", include("apps.audit.urls")),
    # Module namespaces reserved for later phases
    path("api/patients/", include("apps.patients.urls")),
    path("api/doctors/", include("apps.doctors.urls")),
    path("api/appointments/", include("apps.appointments.urls")),
    path("api/prescriptions/", include("apps.prescriptions.urls")),
    path("api/laboratory/", include("apps.laboratory.urls")),
    path("api/pharmacy/", include("apps.pharmacy.urls")),
    path("api/billing/", include("apps.billing.urls")),
    path("api/ai/", include("apps.ai.urls")),
    path("api/automation/", include("apps.automation.urls")),
    # OpenAPI documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="api-schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="api-schema"), name="api-docs"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="api-schema"), name="api-redoc"),
]
