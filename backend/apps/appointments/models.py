"""Appointment models (Phase 8).

State machine (per proposal): Pending → Confirmed → Completed, with
Cancellation from Pending/Confirmed. Completed/Cancelled are terminal.
"""

import uuid

from django.db import models
from django.db.models import Q


class AppointmentType(models.TextChoices):
    IN_PERSON = "In-person", "In-person"
    FOLLOW_UP = "Follow-up", "Follow-up"
    EMERGENCY = "Emergency", "Emergency"
    ONLINE = "Online", "Online"


class AppointmentStatus(models.TextChoices):
    PENDING = "Pending", "Pending"
    CONFIRMED = "Confirmed", "Confirmed"
    COMPLETED = "Completed", "Completed"
    CANCELLED = "Cancelled", "Cancelled"


# Allowed next states per current status. Terminal states map to {}.
VALID_TRANSITIONS = {
    AppointmentStatus.PENDING: {AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED},
    AppointmentStatus.CONFIRMED: {AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED},
    AppointmentStatus.COMPLETED: set(),
    AppointmentStatus.CANCELLED: set(),
}


class Appointment(models.Model):
    """A patient booking with a doctor at a date/time slot."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.PROTECT, related_name="appointments")
    doctor = models.ForeignKey(
        "doctors.Doctor", on_delete=models.PROTECT, related_name="appointments")
    date = models.DateField(db_index=True)
    time = models.TimeField()
    type = models.CharField(
        max_length=20, choices=AppointmentType.choices, default=AppointmentType.IN_PERSON)
    status = models.CharField(
        max_length=10, choices=AppointmentStatus.choices, default=AppointmentStatus.PENDING)
    reason = models.TextField()
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-time"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["patient", "date"]),
            models.Index(fields=["doctor", "date"]),
        ]
        constraints = [
            # One active booking per doctor slot; cancelled slots are reusable.
            models.UniqueConstraint(
                fields=["doctor", "date", "time"],
                condition=~Q(status=AppointmentStatus.CANCELLED),
                name="unique_active_doctor_slot",
            ),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.patient.name} with {self.doctor.name} on {self.date} {self.time}"

    @classmethod
    def can_transition(cls, current: str, new: str) -> bool:
        return new in VALID_TRANSITIONS.get(current, set())
