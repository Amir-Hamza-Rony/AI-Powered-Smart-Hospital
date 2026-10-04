"""Appointment URL namespace: /api/appointments/."""

from rest_framework.routers import SimpleRouter

from apps.appointments.views import AppointmentViewSet

# SimpleRouter (no API-root view) so GET /api/appointments/ stays the list.
router = SimpleRouter()
router.register("", AppointmentViewSet, basename="appointments")

urlpatterns = [*router.urls]
