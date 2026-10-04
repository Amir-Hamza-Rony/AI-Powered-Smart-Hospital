"""Prescriptions URL namespace: /api/prescriptions/."""

from rest_framework.routers import SimpleRouter

from apps.prescriptions.views import PrescriptionViewSet

# SimpleRouter (no API-root view) so GET /api/prescriptions/ stays the list.
router = SimpleRouter()
router.register("", PrescriptionViewSet, basename="prescriptions")

urlpatterns = [*router.urls]
