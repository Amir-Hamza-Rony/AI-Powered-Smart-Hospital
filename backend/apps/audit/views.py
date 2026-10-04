"""Admin read-only audit endpoints. No create/update/delete API."""

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets

from apps.accounts.permissions import IsSuperAdmin
from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer
from config.drf import success_response


@extend_schema(tags=["audit"], summary="List audit log entries (admin)")
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSuperAdmin]
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        qs = AuditLog.objects.select_related("user").all()
        action = self.request.query_params.get("action")
        if action:
            qs = qs.filter(action=action)
        module = self.request.query_params.get("module")
        if module:
            qs = qs.filter(module__iexact=module)
        return qs

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data, message="Audit entry retrieved.")
