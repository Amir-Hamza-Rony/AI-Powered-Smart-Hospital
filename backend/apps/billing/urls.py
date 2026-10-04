"""Billing URL namespace: /api/billing/."""

from rest_framework.routers import SimpleRouter

from apps.billing.views import InvoiceViewSet, LedgerViewSet, PaymentViewSet

router = SimpleRouter()
router.register("invoices", InvoiceViewSet, basename="invoices")
router.register("payments", PaymentViewSet, basename="payments")
router.register("ledger", LedgerViewSet, basename="ledger")

urlpatterns = [*router.urls]
