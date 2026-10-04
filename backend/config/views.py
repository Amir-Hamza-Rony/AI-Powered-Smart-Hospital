"""Project-level API views (no business logic)."""

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from config.drf import success_response


@extend_schema(exclude=True)
class ApiRootView(APIView):
    """Public API index at GET /api/."""

    permission_classes = [AllowAny]

    def get(self, request):
        data = {
            "name": "Smart Hospital API",
            "version": "0.7.0",
            "links": {
                "auth": "/api/auth/",
                "users": "/api/users/",
                "audit": "/api/audit/",
                "patients": "/api/patients/",
                "doctors": "/api/doctors/",
                "appointments": "/api/appointments/",
                "prescriptions": "/api/prescriptions/",
                "laboratory": "/api/laboratory/",
                "pharmacy": "/api/pharmacy/",
                "billing": "/api/billing/",
                "automation": "/api/automation/",
                "schema": "/api/schema/",
                "docs": "/api/docs/",
                "redoc": "/api/redoc/",
            },
        }
        return success_response(data, message="Smart Hospital API")
