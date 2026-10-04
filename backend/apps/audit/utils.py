"""Reusable audit-logging helper for all future modules."""

from apps.audit.models import AuditLog


def get_client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_audit(user, action: str, module: str, description: str, *, object_type: str = "",
              object_id: str = "", request=None, ip_address: str | None = None) -> AuditLog:
    """Append one immutable audit record. Safe to call from any app."""
    actor = user if user is not None and getattr(user, "is_authenticated", False) else None
    ip = ip_address or get_client_ip(request)
    return AuditLog.objects.create(
        user=actor,
        action=action,
        module=module,
        object_type=object_type,
        object_id=object_id,
        description=description,
        ip_address=ip,
    )
