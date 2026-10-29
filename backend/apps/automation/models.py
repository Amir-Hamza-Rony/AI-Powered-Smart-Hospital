"""Automation persistence models (Phase 6 — AUTO-02).

Stored entities drive the frontend automation pages
(reminders, lab alerts, stock alerts, queue, purchase requests,
events and notifications). Each mutation writes an immutable
audit record via ``apps.audit.utils.log_audit``.
"""

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class AutomationWorkflow(models.TextChoices):
    APPOINTMENT_REMINDER = "Appointment Reminders", "Appointment Reminders"
    LAB_ALERT = "Lab Alerts", "Lab Alerts"
    STOCK_ALERT = "Stock Alerts", "Stock Alerts"
    WAITING_QUEUE = "Waiting Queue", "Waiting Queue"
    SYSTEM = "System", "System"


class WorkflowStatus(models.TextChoices):
    ACTIVE = "Active", "Active"
    PAUSED = "Paused", "Paused"
    LIVE = "Live", "Live"


class ReminderStatus(models.TextChoices):
    SCHEDULED = "Scheduled", "Scheduled"
    PENDING = "Pending", "Pending"
    SENT = "Sent", "Sent"
    FAILED = "Failed", "Failed"
    CANCELLED = "Cancelled", "Cancelled"


class ReminderChannel(models.TextChoices):
    SMS = "SMS", "SMS"
    EMAIL = "Email", "Email"
    IN_APP = "In-App", "In-App"


class LabAlertStatus(models.TextChoices):
    PROCESSING = "Processing", "Processing"
    READY = "Ready", "Ready"
    REVIEWED = "Reviewed", "Reviewed"
    NOTIFICATION_SENT = "Notification Sent", "Notification Sent"


class StockAlertStatus(models.TextChoices):
    NORMAL = "Normal", "Normal"
    LOW = "Low", "Low"
    CRITICAL = "Critical", "Critical"
    NEAR_EXPIRY = "Near Expiry", "Near Expiry"


class PurchaseRequestStatus(models.TextChoices):
    REQUESTED = "Requested", "Requested"
    APPROVED = "Approved", "Approved"
    ORDERED = "Ordered", "Ordered"
    RECEIVED = "Received", "Received"
    CANCELLED = "Cancelled", "Cancelled"


class QueueStatus(models.TextChoices):
    WAITING = "Waiting", "Waiting"
    CALLED = "Called", "Called"
    IN_CONSULTATION = "In Consultation", "In Consultation"
    COMPLETED = "Completed", "Completed"
    SKIPPED = "Skipped", "Skipped"


class AutomationEventStatus(models.TextChoices):
    SUCCESS = "Success", "Success"
    PENDING = "Pending", "Pending"
    FAILED = "Failed", "Failed"
    WARNING = "Warning", "Warning"


class NotificationCategory(models.TextChoices):
    APPOINTMENTS = "Appointments", "Appointments"
    LABORATORY = "Laboratory", "Laboratory"
    PHARMACY = "Pharmacy", "Pharmacy"
    QUEUE = "Queue", "Queue"
    SYSTEM = "System", "System"


class AutomationWorkflowModel(models.Model):
    """One registered automation workflow."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=WorkflowStatus.choices, default=WorkflowStatus.ACTIVE)
    enabled = models.BooleanField(default=True)
    last_execution = models.DateTimeField(null=True, blank=True)
    next_execution = models.CharField(max_length=60, blank=True, default="")
    event_count = models.PositiveIntegerField(default=0)
    href = models.CharField(max_length=200, blank=True, default="/automation")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Automation workflow"
        verbose_name_plural = "Automation workflows"

    def __str__(self):
        return self.name


class AppointmentReminder(models.Model):
    """One scheduled patient appointment reminder."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment_id = models.CharField(max_length=60, db_index=True)
    patient_id = models.CharField(max_length=60, db_index=True)
    patient_name = models.CharField(max_length=120)
    doctor_name = models.CharField(max_length=120)
    specialty = models.CharField(max_length=80, blank=True, default="")
    date = models.DateField()
    time = models.CharField(max_length=30, blank=True, default="")
    status = models.CharField(max_length=20, choices=ReminderStatus.choices, default=ReminderStatus.SCHEDULED)
    no_show_risk = models.CharField(max_length=10, blank=True, default="Low")
    channels = models.JSONField(default=list, blank=True)
    last_reminder = models.CharField(max_length=40, blank=True, default="")
    message_preview = models.TextField(blank=True, default="")
    history = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["appointment_id"]),
            models.Index(fields=["patient_id"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.id} · {self.appointment_id} · {self.patient_name}"


class LabCompletionAlert(models.Model):
    """One lab-order completion alert with doctor/patient notifications."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lab_order_id = models.CharField(max_length=60, db_index=True)
    patient_name = models.CharField(max_length=120)
    test = models.CharField(max_length=120)
    ordered_by = models.CharField(max_length=120)
    status = models.CharField(max_length=30, choices=LabAlertStatus.choices, default=LabAlertStatus.PROCESSING)
    completed_at = models.DateTimeField(null=True, blank=True)
    doctor_notification = models.CharField(max_length=20, blank=True, default="Pending")
    patient_notification = models.CharField(max_length=20, blank=True, default="Pending")
    result_status = models.CharField(max_length=20, blank=True, default="Pending")
    recipients = models.JSONField(default=list, blank=True)
    channels = models.JSONField(default=list, blank=True)
    history = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["lab_order_id"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.id} · {self.lab_order_id} · {self.test}"


class StockAlert(models.Model):
    """One pharmacy stock threshold / expiry alert."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medicine = models.CharField(max_length=160)
    sku = models.CharField(max_length=60, db_index=True)
    current_stock = models.PositiveIntegerField(default=0)
    minimum_level = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=StockAlertStatus.choices, default=StockAlertStatus.NORMAL)
    expiry_date = models.DateField(null=True, blank=True)
    supplier = models.CharField(max_length=160, blank=True, default="")
    last_updated = models.DateTimeField(null=True, blank=True)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["sku"]),
            models.Index(fields=["status"]),
            models.Index(fields=["resolved"]),
        ]

    def __str__(self):
        return f"{self.id} · {self.medicine} · {self.sku}"


class PurchaseRequest(models.Model):
    """One restocking purchase request raised from a stock alert."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medicine = models.CharField(max_length=160)
    sku = models.CharField(max_length=60, db_index=True)
    current_stock = models.PositiveIntegerField(default=0)
    required_quantity = models.PositiveIntegerField(default=0)
    supplier = models.CharField(max_length=160, blank=True, default="")
    priority = models.CharField(max_length=10, blank=True, default="Normal")
    notes = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=PurchaseRequestStatus.choices, default=PurchaseRequestStatus.REQUESTED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["sku"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.id} · {self.medicine} × {self.required_quantity}"


class QueuePatient(models.Model):
    """One waiting-room queue entry."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    serial = models.CharField(max_length=30, db_index=True)
    patient_name = models.CharField(max_length=120)
    patient_id = models.CharField(max_length=60, blank=True, default="")
    doctor_name = models.CharField(max_length=120, blank=True, default="")
    department = models.CharField(max_length=80, blank=True, default="")
    status = models.CharField(max_length=30, choices=QueueStatus.choices, default=QueueStatus.WAITING)
    arrival_time = models.CharField(max_length=30, blank=True, default="")
    waiting_minutes = models.PositiveIntegerField(default=0)
    priority = models.CharField(max_length=20, blank=True, default="Normal")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["serial"]
        indexes = [
            models.Index(fields=["serial"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.serial} · {self.patient_name} · {self.status}"


class AutomationEvent(models.Model):
    """One immutable automation audit event."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.CharField(max_length=40, choices=AutomationWorkflow.choices)
    event_type = models.CharField(max_length=120)
    description = models.TextField()
    triggered_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=AutomationEventStatus.choices, default=AutomationEventStatus.SUCCESS)
    triggered_by = models.CharField(max_length=120, blank=True, default="Automation")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["workflow"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.id} · {self.workflow} · {self.event_type}"


class HospitalNotification(models.Model):
    """One in-app notification shown to staff."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.CharField(max_length=30, choices=NotificationCategory.choices)
    title = models.CharField(max_length=160)
    description = models.TextField()
    time = models.DateTimeField()
    read = models.BooleanField(default=False)
    module = models.CharField(max_length=80, blank=True, default="Automation")
    href = models.CharField(max_length=200, blank=True, default="/automation")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["read"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.title
