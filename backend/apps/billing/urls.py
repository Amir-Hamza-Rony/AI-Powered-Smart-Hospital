"""Billing URL namespace: /api/billing/."""

from rest_framework.routers import SimpleRouter

from apps.billing.views import (
    ClaimViewSet, InvoiceViewSet, LedgerViewSet, PaymentViewSet)

router = SimpleRouter()
router.register("invoices", InvoiceViewSet, basename="invoices")
router.register("payments", PaymentViewSet, basename="payments")
router.register("ledger", LedgerViewSet, basename="ledger")
router.register("claims", ClaimViewSet, basename="claims")

urlpatterns = [*router.urls]
