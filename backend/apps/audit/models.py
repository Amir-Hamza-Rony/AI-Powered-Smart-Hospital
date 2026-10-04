"""Immutable audit log. Records are append-only by design."""

import uuid

from django.conf import settings
from django.db import models


class AuditAction(models.TextChoices):
    LOGIN = "LOGIN", "Login"
    LOGOUT = "LOGOUT", "Logout"
    USER_CREATED = "USER_CREATED", "User created"
    USER_UPDATED = "USER_UPDATED", "User updated"
    USER_DELETED = "USER_DELETED", "User deleted"
    # Reserved for later phases (hospital modules instrument gradually)
    PATIENT_CREATED = "PATIENT_CREATED", "Patient created"
    PATIENT_UPDATED = "PATIENT_UPDATED", "Patient updated"
    PATIENT_DELETED = "PATIENT_DELETED", "Patient deleted"
    DOCTOR_CREATED = "DOCTOR_CREATED", "Doctor created"
    DOCTOR_UPDATED = "DOCTOR_UPDATED", "Doctor updated"
    DOCTOR_DELETED = "DOCTOR_DELETED", "Doctor deleted"
    PRESCRIPTION_CREATED = "PRESCRIPTION_CREATED", "Prescription created"
    APPOINTMENT_CREATED = "APPOINTMENT_CREATED", "Appointment created"
    APPOINTMENT_UPDATED = "APPOINTMENT_UPDATED", "Appointment updated"
    INVOICE_CREATED = "INVOICE_CREATED", "Invoice created"


class AuditLog(models.Model):
    """Append-only record. No update/delete API is exposed."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=30, choices=AuditAction.choices)
    module = models.CharField(max_length=50)
    object_type = models.CharField(max_length=50, blank=True, default="")
    object_id = models.CharField(max_length=100, blank=True, default="")
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.action} · {self.module} · {self.created_at:%Y-%m-%d %H:%M}"
