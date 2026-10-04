"""Doctor URL namespace: /api/doctors/."""

from rest_framework.routers import SimpleRouter

from apps.doctors.views import DoctorViewSet

# SimpleRouter (no API-root view) so GET /api/doctors/ stays the doctor list.
router = SimpleRouter()
router.register("", DoctorViewSet, basename="doctors")

urlpatterns = [*router.urls]
