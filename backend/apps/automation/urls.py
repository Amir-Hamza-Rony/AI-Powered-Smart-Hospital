"""Automation URL namespace: /api/automation/ (Phase 6)."""

from rest_framework.routers import SimpleRouter

from apps.automation.views import (
    EventViewSet,
    LabAlertViewSet,
    NotificationViewSet,
    PurchaseRequestViewSet,
    QueueViewSet,
    ReminderViewSet,
    StockAlertViewSet,
    WorkflowViewSet,
)

router = SimpleRouter()
router.register("workflows", WorkflowViewSet, basename="automation-workflows")
router.register("reminders", ReminderViewSet, basename="automation-reminders")
router.register("lab-alerts", LabAlertViewSet, basename="automation-lab-alerts")
router.register("stock-alerts", StockAlertViewSet, basename="automation-stock-alerts")
router.register("purchase-requests", PurchaseRequestViewSet, basename="automation-purchase-requests")
router.register("queue", QueueViewSet, basename="automation-queue")
router.register("events", EventViewSet, basename="automation-events")
router.register("notifications", NotificationViewSet, basename="automation-notifications")

urlpatterns = [
    *router.urls,
]
