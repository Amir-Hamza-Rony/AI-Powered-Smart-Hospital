"""Read-only admin for the immutable audit log."""

from django.contrib import admin

from apps.audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "module", "user", "object_type", "object_id")
    list_filter = ("action", "module")
    search_fields = ("description", "object_id", "user__email")
    readonly_fields = ("id", "user", "action", "module", "object_type", "object_id",
                        "description", "ip_address", "created_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
