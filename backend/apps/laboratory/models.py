"""Laboratory models (Phase 9).

Reusable ``LabTest`` catalog + ``LabOrder`` with items. Per-item results
live on ``LabOrderItem``; ``report_reference`` stores an external report
reference without introducing file-storage infrastructure.
"""

import uuid

from django.core.validators import MinValueValidator
from django.db import models


class LabTestStatus(models.TextChoices):
    ACTIVE = "Active", "Active"
    INACTIVE = "Inactive", "Inactive"


class LabOrderStatus(models.TextChoices):
    PENDING = "Pending", "Pending"
    PROCESSING = "Processing", "Processing"
    READY = "Ready", "Ready"
    COMPLETED = "Completed", "Completed"
    CANCELLED = "Cancelled", "Cancelled"


class LabPriority(models.TextChoices):
    NORMAL = "Normal", "Normal"
    URGENT = "Urgent", "Urgent"
    EMERGENCY = "Emergency", "Emergency"


class LabResultStatus(models.TextChoices):
    NORMAL = "Normal", "Normal"
    ABNORMAL = "Abnormal", "Abnormal"
    PENDING = "Pending", "Pending"


# Allowed next states per current status. Terminal states map to {}.
VALID_TRANSITIONS = {
    LabOrderStatus.PENDING: {LabOrderStatus.PROCESSING, LabOrderStatus.CANCELLED},
    LabOrderStatus.PROCESSING: {LabOrderStatus.READY, LabOrderStatus.CANCELLED},
    LabOrderStatus.READY: {LabOrderStatus.COMPLETED},
    LabOrderStatus.COMPLETED: set(),
    LabOrderStatus.CANCELLED: set(),
}


class LabTest(models.Model):
    """Reusable diagnostic test catalog entry."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    code = models.CharField(max_length=50, unique=True)
    category = models.CharField(max_length=100, blank=True, default="", db_index=True)
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    sample_type = models.CharField(max_length=100, blank=True, default="")
    turnaround_time = models.CharField(max_length=100, blank=True, default="")
    preparation = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=10, choices=LabTestStatus.choices, default=LabTestStatus.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["status"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.code} · {self.name}"


class LabOrder(models.Model):
    """A diagnostic order for a patient."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.PROTECT, related_name="lab_orders")
    doctor = models.ForeignKey(
        "doctors.Doctor", on_delete=models.PROTECT, related_name="lab_orders")
    appointment = models.ForeignKey(
        "appointments.Appointment", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="lab_orders")
    order_date = models.DateField(db_index=True)
    priority = models.CharField(
        max_length=10, choices=LabPriority.choices, default=LabPriority.NORMAL)
    status = models.CharField(
        max_length=10, choices=LabOrderStatus.choices, default=LabOrderStatus.PENDING)
    instructions = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")
    report_reference = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-order_date", "-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["patient", "order_date"]),
            models.Index(fields=["doctor", "order_date"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"Lab order {self.order_date} · {self.patient.name}"

    @classmethod
    def can_transition(cls, current: str, new: str) -> bool:
        return new in VALID_TRANSITIONS.get(current, set())


class LabOrderItem(models.Model):
    """One test within an order, with its result."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lab_order = models.ForeignKey(
        LabOrder, on_delete=models.CASCADE, related_name="items")
    test = models.ForeignKey(
        LabTest, on_delete=models.PROTECT, related_name="order_items")
    result = models.TextField(blank=True, default="")
    unit = models.CharField(max_length=50, blank=True, default="")
    reference_range = models.CharField(max_length=255, blank=True, default="")
    result_notes = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=10, choices=LabResultStatus.choices, default=LabResultStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["lab_order", "test__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["lab_order", "test"], name="unique_order_test"),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.test.name} ({self.status})"
