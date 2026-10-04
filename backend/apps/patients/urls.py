"""Patient URL namespace: /api/patients/."""

from rest_framework.routers import SimpleRouter

from apps.patients.views import PatientViewSet

# SimpleRouter (no API-root view) so GET /api/patients/ stays the patient list.
router = SimpleRouter()
router.register("", PatientViewSet, basename="patients")

urlpatterns = [*router.urls]
