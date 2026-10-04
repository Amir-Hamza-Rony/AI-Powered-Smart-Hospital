"""Pharmacy models (Phase 9).

Reusable ``Medicine`` catalog + ``MedicineBatch`` inventory + prescription
linked ``DispensingRecord`` with items. Stock levels are derived from
batches (never stored separately); ``reorder_level`` on the medicine drives
low-stock detection.
"""

import uuid
from datetime import timedelta

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

# A batch counts as near-expiry when it expires within this window.
NEAR_EXPIRY_DAYS = 90


class DispensingStatus(models.TextChoices):
    PENDING = "Pending", "Pending"
    PARTIALLY_DISPENSED = "Partially Dispensed", "Partially Dispensed"
    DISPENSED = "Dispensed", "Dispensed"
    CANCELLED = "Cancelled", "Cancelled"


# Allowed next states per current status. Terminal states map to {}.
DISPENSING_TRANSITIONS = {
    DispensingStatus.PENDING: {
        DispensingStatus.PARTIALLY_DISPENSED, DispensingStatus.DISPENSED,
        DispensingStatus.CANCELLED},
    DispensingStatus.PARTIALLY_DISPENSED: {
        DispensingStatus.DISPENSED, DispensingStatus.CANCELLED},
    DispensingStatus.DISPENSED: set(),
    DispensingStatus.CANCELLED: set(),
}


class Medicine(models.Model):
    """Reusable medicine catalog entry."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    generic_name = models.CharField(max_length=255, blank=True, default="")
    brand_name = models.CharField(max_length=255, blank=True, default="")
    category = models.CharField(max_length=100, blank=True, default="", db_index=True)
    strength = models.CharField(max_length=100, blank=True, default="")
    dosage_form = models.CharField(max_length=100, blank=True, default="")
    manufacturer = models.CharField(max_length=255, blank=True, default="")
    prescription_required = models.BooleanField(default=True)
    unit_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    reorder_level = models.PositiveIntegerField(default=10)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["is_active"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} ({self.strength})".strip()

    def _batches(self):
        return list(self.batches.all())

    @property
    def current_stock(self) -> int:
        return sum(batch.quantity for batch in self._batches())

    @property
    def expired_stock(self) -> int:
        today = timezone.localdate()
        return sum(batch.quantity for batch in self._batches() if batch.expiry_date < today)

    @property
    def available_stock(self) -> int:
        today = timezone.localdate()
        return sum(
            batch.quantity for batch in self._batches() if batch.expiry_date >= today)

    @property
    def is_low_stock(self) -> bool:
        return self.available_stock <= self.reorder_level

    @property
    def has_near_expiry(self) -> bool:
        today = timezone.localdate()
        horizon = today + timedelta(days=NEAR_EXPIRY_DAYS)
        return any(
            batch.quantity > 0 and today <= batch.expiry_date <= horizon
            for batch in self._batches())

    @property
    def stock_status(self) -> str:
        """Frontend-compatible status: In Stock / Low Stock / Near Expiry / Out of Stock."""
        if self.available_stock <= 0:
            return "Out of Stock"
        if self.available_stock <= self.reorder_level:
            return "Low Stock"
        if self.has_near_expiry:
            return "Near Expiry"
        return "In Stock"


class MedicineBatch(models.Model):
    """One inventory batch of a medicine."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medicine = models.ForeignKey(
        Medicine, on_delete=models.CASCADE, related_name="batches")
    batch_number = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(default=0)
    purchase_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    selling_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    manufacture_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["expiry_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["medicine", "batch_number"], name="unique_medicine_batch"),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.medicine.name} · {self.batch_number}"

    @property
    def is_expired(self) -> bool:
        return self.expiry_date < timezone.localdate()

    @property
    def is_near_expiry(self) -> bool:
        today = timezone.localdate()
        return today <= self.expiry_date <= today + timedelta(days=NEAR_EXPIRY_DAYS)


class DispensingRecord(models.Model):
    """Prescription fulfillment header."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription = models.ForeignKey(
        "prescriptions.Prescription", on_delete=models.PROTECT,
        related_name="dispensing_records")
    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.PROTECT, related_name="dispensing_records")
    dispensed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="dispensing_records")
    date = models.DateField(db_index=True)
    status = models.CharField(
        max_length=20, choices=DispensingStatus.choices, default=DispensingStatus.PENDING)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [models.Index(fields=["status"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"Dispense {self.date} · {self.patient.name} ({self.status})"

    @classmethod
    def can_transition(cls, current: str, new: str) -> bool:
        return new in DISPENSING_TRANSITIONS.get(current, set())


class DispensingItem(models.Model):
    """One medicine line of a dispensing record."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dispensing = models.ForeignKey(
        DispensingRecord, on_delete=models.CASCADE, related_name="items")
    medicine = models.ForeignKey(
        Medicine, on_delete=models.PROTECT, related_name="dispensing_items")
    batch = models.ForeignKey(
        MedicineBatch, null=True, blank=True, on_delete=models.PROTECT,
        related_name="dispensing_items",
        help_text="Source batch; auto-assigned (earliest expiry) when omitted.")
    quantity = models.PositiveIntegerField(
        help_text="Prescribed quantity to dispense from the batch.")
    dispensed_quantity = models.PositiveIntegerField(default=0)
    unit_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])

    class Meta:
        ordering = ["dispensing", "medicine__name"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.medicine.name} × {self.quantity}"

    @property
    def remaining(self) -> int:
        return max(self.quantity - self.dispensed_quantity, 0)
