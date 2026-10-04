"""Doctor models (Phase 8).

Roster profile linked optionally to a login account (``accounts.User``).
Weekly duty schedule is a minimal relational structure (one row per weekday)
matching the frontend ``DaySchedule {day, available, slots}`` shape.
"""

import uuid

from django.conf import settings
from django.db import models

from apps.accounts.models import phone_validator


class DoctorAvailability(models.TextChoices):
    AVAILABLE = "Available", "Available"
    ON_LEAVE = "On Leave", "On Leave"
    OFF_DUTY = "Off Duty", "Off Duty"


class DoctorStatus(models.TextChoices):
    ACTIVE = "Active", "Active"
    INACTIVE = "Inactive", "Inactive"


class Weekday(models.IntegerChoices):
    MONDAY = 0, "Monday"
    TUESDAY = 1, "Tuesday"
    WEDNESDAY = 2, "Wednesday"
    THURSDAY = 3, "Thursday"
    FRIDAY = 4, "Friday"
    SATURDAY = 5, "Saturday"
    SUNDAY = 6, "Sunday"


class Doctor(models.Model):
    """Doctor roster profile with specialization, fees and availability."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="doctor_profile",
        help_text="Linked login account (role DOCTOR) when one exists.",
    )
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    specialization = models.CharField(max_length=100, db_index=True)
    qualification = models.CharField(max_length=255, blank=True, default="")
    experience_years = models.PositiveIntegerField(default=0)
    registration_no = models.CharField(max_length=50, unique=True)
    phone = models.CharField(max_length=20, validators=[phone_validator])
    email = models.EmailField(blank=True, default="")
    department = models.CharField(max_length=100, blank=True, default="", db_index=True)
    room = models.CharField(max_length=50, blank=True, default="")
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    availability = models.CharField(
        max_length=10, choices=DoctorAvailability.choices, default=DoctorAvailability.AVAILABLE)
    status = models.CharField(max_length=10, choices=DoctorStatus.choices, default=DoctorStatus.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["first_name", "last_name"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["availability"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"Dr. {self.name} ({self.specialization})"

    @property
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class DoctorSchedule(models.Model):
    """One weekday row of a doctor's duty schedule."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="schedules")
    day = models.IntegerField(choices=Weekday.choices)
    is_available = models.BooleanField(default=True)
    slots = models.JSONField(default=list, blank=True, help_text="Time-slot labels, e.g. ['09:00 AM'].")

    class Meta:
        ordering = ["doctor", "day"]
        constraints = [
            models.UniqueConstraint(fields=["doctor", "day"], name="unique_doctor_day"),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.doctor.name} · {self.get_day_display()}"
