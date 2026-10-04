"""Patient models (Phase 8).

Field set mirrors the frontend domain (``src/data/types.ts`` + ``PatientForm``):
identity, contact, NID, clinical lists. Visit/prescription/lab history lives
in later phases — only a free-text ``medical_history`` summary here.
"""

import uuid

from django.core.validators import RegexValidator
from django.db import models

from apps.accounts.models import phone_validator

nid_validator = RegexValidator(
    regex=r"^[0-9]{6,20}$",
    message="Enter a valid NID (6-20 digits).",
)


class Gender(models.TextChoices):
    MALE = "Male", "Male"
    FEMALE = "Female", "Female"
    OTHER = "Other", "Other"


class BloodGroup(models.TextChoices):
    A_POS = "A+", "A+"
    A_NEG = "A-", "A-"
    B_POS = "B+", "B+"
    B_NEG = "B-", "B-"
    AB_POS = "AB+", "AB+"
    AB_NEG = "AB-", "AB-"
    O_POS = "O+", "O+"
    O_NEG = "O-", "O-"


class PatientStatus(models.TextChoices):
    ACTIVE = "Active", "Active"
    INACTIVE = "Inactive", "Inactive"
    CRITICAL = "Critical", "Critical"
    RECOVERED = "Recovered", "Recovered"


class Patient(models.Model):
    """Registered patient profile (not a login account — see ``accounts.User``)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=Gender.choices)
    blood_group = models.CharField(max_length=3, choices=BloodGroup.choices, blank=True, default="")
    phone = models.CharField(max_length=20, unique=True, validators=[phone_validator])
    email = models.EmailField(blank=True, default="", db_index=True)
    nid = models.CharField(
        max_length=20, unique=True, null=True, blank=True, validators=[nid_validator],
        help_text="National ID — unique when provided; used for deduplication with phone.",
    )
    address = models.TextField(blank=True, default="")
    emergency_contact = models.CharField(max_length=150)
    emergency_phone = models.CharField(max_length=20, validators=[phone_validator])
    allergies = models.JSONField(default=list, blank=True)
    chronic_conditions = models.JSONField(default=list, blank=True)
    medical_history = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")
    status = models.CharField(max_length=10, choices=PatientStatus.choices, default=PatientStatus.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["gender"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} ({self.phone})"

    @property
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
