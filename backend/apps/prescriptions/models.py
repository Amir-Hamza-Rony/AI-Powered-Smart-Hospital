"""Prescription models (Phase 9).

A prescription links patient + doctor (+ optional appointment) with one or
more items. Item medicine data is denormalized (name/strength/…) so the
clinical record survives catalog changes; ``medicine`` optionally references
the reusable pharmacy catalog (``pharmacy.Medicine``).
"""

import uuid

from django.db import models


class PrescriptionStatus(models.TextChoices):
    ACTIVE = "Active", "Active"
    COMPLETED = "Completed", "Completed"
    CANCELLED = "Cancelled", "Cancelled"


# Allowed next states per current status. Terminal states map to {}.
VALID_TRANSITIONS = {
    PrescriptionStatus.ACTIVE: {PrescriptionStatus.COMPLETED, PrescriptionStatus.CANCELLED},
    PrescriptionStatus.COMPLETED: set(),
    PrescriptionStatus.CANCELLED: set(),
}


class Prescription(models.Model):
    """Clinical prescription header."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.PROTECT, related_name="prescriptions")
    doctor = models.ForeignKey(
        "doctors.Doctor", on_delete=models.PROTECT, related_name="prescriptions")
    appointment = models.ForeignKey(
        "appointments.Appointment", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="prescriptions")
    date = models.DateField(db_index=True)
    chief_complaint = models.TextField(blank=True, default="")
    diagnosis = models.TextField()
    symptoms = models.TextField(blank=True, default="")
    clinical_notes = models.TextField(blank=True, default="")
    follow_up_required = models.BooleanField(default=False)
    follow_up_date = models.DateField(null=True, blank=True)
    follow_up_instructions = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=10, choices=PrescriptionStatus.choices, default=PrescriptionStatus.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["patient", "date"]),
            models.Index(fields=["doctor", "date"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"Rx {self.date} · {self.patient.name} by {self.doctor.name}"

    @classmethod
    def can_transition(cls, current: str, new: str) -> bool:
        return new in VALID_TRANSITIONS.get(current, set())


class PrescriptionItem(models.Model):
    """One medicine line on a prescription."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription = models.ForeignKey(
        Prescription, on_delete=models.CASCADE, related_name="items")
    medicine = models.ForeignKey(
        "pharmacy.Medicine", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="prescription_items",
        help_text="Reusable catalog reference; clinical fields below are the record.")
    medicine_name = models.CharField(max_length=255)
    strength = models.CharField(max_length=100, blank=True, default="")
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    route = models.CharField(max_length=100, blank=True, default="")
    quantity = models.PositiveIntegerField(default=1)
    instructions = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["prescription", "medicine_name"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.medicine_name} ({self.dosage})"
