"""Laboratory URL namespace: /api/laboratory/."""

from rest_framework.routers import SimpleRouter

from apps.laboratory.views import LabOrderViewSet, LabTestViewSet

router = SimpleRouter()
router.register("tests", LabTestViewSet, basename="lab-tests")
router.register("orders", LabOrderViewSet, basename="lab-orders")

urlpatterns = [*router.urls]
