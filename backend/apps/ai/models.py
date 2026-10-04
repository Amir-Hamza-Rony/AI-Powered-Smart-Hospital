"""AI session/insight models (Phase 12).

Every AI generation persists an ``AISession`` (the request) plus one or
more ``AIInsight`` rows (the advisory outputs). Insights start as
``Pending Review`` and move to ``Reviewed`` only through an explicit
physician sign-off — the review trail is the AI audit history.
"""

import uuid

from django.conf import settings
from django.db import models


class AIModule(models.TextChoices):
    SYMPTOM_CHECKER = "Symptom Checker", "Symptom Checker"
    CLINICAL_ASSISTANT = "Clinical Assistant", "Clinical Assistant"
    PRESCRIPTION_ADVISORY = "Prescription Advisory", "Prescription Advisory"
    NOSHOW_PREDICTION = "No-Show Prediction", "No-Show Prediction"
    HEALTH_ANALYTICS = "Health Analytics", "Health Analytics"


class AIInsightKind(models.TextChoices):
    TRIAGE_RESULT = "triage_result", "Triage result"
    CLINICAL_SUMMARY = "clinical_summary", "Clinical summary"
    CLINICAL_ANSWER = "clinical_answer", "Clinical answer"
    ADVISORY = "advisory", "Prescription advisory"
    PREDICTION = "prediction", "No-show prediction"
    ANALYTICS = "analytics", "Analytics snapshot"


class AIReviewStatus(models.TextChoices):
    PENDING_REVIEW = "Pending Review", "Pending Review"
    REVIEWED = "Reviewed", "Reviewed"
    COMPLETED = "Completed", "Completed"


class AISession(models.Model):
    """One AI request: who asked, about whom, with what input."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.CharField(max_length=30, choices=AIModule.choices, db_index=True)
    patient = models.ForeignKey(
        "patients.Patient", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="ai_sessions")
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="ai_sessions")
    input_data = models.JSONField(default=dict, blank=True)
    provider = models.CharField(max_length=50, default="local")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["module", "created_at"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.module} · {self.created_at:%Y-%m-%d %H:%M}"


class AIInsight(models.Model):
    """One advisory output. Immutable content; review is a separate act."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        AISession, on_delete=models.CASCADE, related_name="insights")
    kind = models.CharField(max_length=20, choices=AIInsightKind.choices)
    title = models.CharField(max_length=255)
    content = models.JSONField(default=dict)
    confidence = models.PositiveIntegerField(null=True, blank=True)
    requires_review = models.BooleanField(default=True)
    review_status = models.CharField(
        max_length=15, choices=AIReviewStatus.choices,
        default=AIReviewStatus.PENDING_REVIEW, db_index=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="reviewed_insights")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["review_status"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.title} ({self.review_status})"
