"""Pharmacy URL namespace: /api/pharmacy/."""

from rest_framework.routers import SimpleRouter

from apps.pharmacy.views import (
    DispensingRecordViewSet,
    MedicineBatchViewSet,
    MedicineViewSet,
)

router = SimpleRouter()
router.register("medicines", MedicineViewSet, basename="medicines")
router.register("batches", MedicineBatchViewSet, basename="batches")
router.register("dispensing", DispensingRecordViewSet, basename="dispensing")

urlpatterns = [*router.urls]
