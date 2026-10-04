"""Audit URL namespace: /api/audit/ (admin read-only)."""

from rest_framework.routers import SimpleRouter

from apps.audit.views import AuditLogViewSet

router = SimpleRouter()
router.register("", AuditLogViewSet, basename="audit")

urlpatterns = [*router.urls]
