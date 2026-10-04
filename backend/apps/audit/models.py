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
    PRESCRIPTION_UPDATED = "PRESCRIPTION_UPDATED", "Prescription updated"
    PRESCRIPTION_DELETED = "PRESCRIPTION_DELETED", "Prescription deleted"
    LAB_TEST_CREATED = "LAB_TEST_CREATED", "Lab test created"
    LAB_TEST_UPDATED = "LAB_TEST_UPDATED", "Lab test updated"
    LAB_ORDER_CREATED = "LAB_ORDER_CREATED", "Lab order created"
    LAB_ORDER_UPDATED = "LAB_ORDER_UPDATED", "Lab order updated"
    LAB_RESULT_UPDATED = "LAB_RESULT_UPDATED", "Lab result updated"
    MEDICINE_CREATED = "MEDICINE_CREATED", "Medicine created"
    MEDICINE_UPDATED = "MEDICINE_UPDATED", "Medicine updated"
    BATCH_CREATED = "BATCH_CREATED", "Inventory batch created"
    BATCH_UPDATED = "BATCH_UPDATED", "Inventory batch updated"
    DISPENSING_CREATED = "DISPENSING_CREATED", "Dispensing created"
    DISPENSING_UPDATED = "DISPENSING_UPDATED", "Dispensing updated"
    APPOINTMENT_CREATED = "APPOINTMENT_CREATED", "Appointment created"
    APPOINTMENT_UPDATED = "APPOINTMENT_UPDATED", "Appointment updated"
    INVOICE_CREATED = "INVOICE_CREATED", "Invoice created"
    INVOICE_UPDATED = "INVOICE_UPDATED", "Invoice updated"
    INVOICE_ISSUED = "INVOICE_ISSUED", "Invoice issued"
    INVOICE_CANCELLED = "INVOICE_CANCELLED", "Invoice cancelled"
    PAYMENT_CREATED = "PAYMENT_CREATED", "Payment recorded"
    PAYMENT_REVERSED = "PAYMENT_REVERSED", "Payment reversed"
    AI_ANALYSIS_CREATED = "AI_ANALYSIS_CREATED", "AI analysis generated"
    AI_INSIGHT_REVIEWED = "AI_INSIGHT_REVIEWED", "AI insight reviewed"


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
