"""Automation API views (Phase 6 — AUTO-02/AUTO-04).

Persisted automation backend for reminders, lab alerts, stock alerts,
purchase requests, waiting-room queue, events (audit trail) and
in-app notifications. All mutations write an immutable audit record.
Email/SMS delivery is intentionally out of scope (AUTO-01): the
``channel`` field records where those transports would hook in later.
"""

from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from apps.accounts.permissions import IsStaffUser
from apps.audit.utils import log_audit
from config.drf import error_response, success_response

from . import models as m
from .serializers import (
    AppointmentReminderSerializer,
    AutomationEventSerializer,
    AutomationWorkflowSerializer,
    HospitalNotificationSerializer,
    LabCompletionAlertSerializer,
    PurchaseRequestSerializer,
    StockAlertSerializer,
    QueuePatientSerializer,
)


def _audit(request, action: str, module: str, description: str, obj=None):
    return log_audit(
        request.user,
        action,
        module,
        description,
        object_type=module,
        object_id=str(obj.id) if obj else "",
        request=request,
    )


class WorkflowViewSet(ModelViewSet):
    queryset = m.AutomationWorkflowModel.objects.all()
    serializer_class = AutomationWorkflowSerializer
    permission_classes = [IsStaffUser]
    http_method_names = ["get", "put", "patch", "post", "delete", "head", "options"]

    @extend_schema(summary="Toggle workflow enabled state")
    @action(detail=True, methods=["post"])
    def toggle(self, request, pk=None):
        wf = self.get_object()
        wf.enabled = not wf.enabled
        wf.status = (
            m.WorkflowStatus.LIVE if wf.id == "queue" else wf.status
        ) if wf.enabled else m.WorkflowStatus.PAUSED
        wf.save(update_fields=["enabled", "status", "updated_at"])
        _audit(
            request,
            "AUTOMATION_WORKFLOW_TOGGLED",
            "Automation",
            f"Workflow '{wf.name}' {'enabled' if wf.enabled else 'disabled'}.",
            wf,
        )
        return success_response(self.get_serializer(wf).data, "Workflow toggled.")


class ReminderViewSet(ModelViewSet):
    queryset = m.AppointmentReminder.objects.all()
    serializer_class = AppointmentReminderSerializer
    permission_classes = [IsStaffUser]

    @extend_schema(summary="Send a reminder (marks Sent, logs event)")
    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        r = self.get_object()
        primary = (r.channels or ["In-App"])[0]
        now = timezone.now()
        r.status = m.ReminderStatus.SENT
        r.last_reminder = now.isoformat()
        history = list(r.history or [])
        history.append({"at": now.isoformat(), "channel": primary, "result": "Sent"})
        r.history = history
        r.save(update_fields=["status", "last_reminder", "history", "updated_at"])
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.APPOINTMENT_REMINDER,
            event_type="Appointment reminder sent",
            description=f"{primary} reminder sent to {r.patient_name} for {r.appointment_id}.",
            triggered_at=now,
            status=m.AutomationEventStatus.SUCCESS,
            triggered_by=getattr(request.user, "email", "staff"),
        )
        m.HospitalNotification.objects.create(
            category=m.NotificationCategory.APPOINTMENTS,
            title="Appointment Reminder Sent",
            description=f"{primary} reminder sent to {r.patient_name} for {r.appointment_id}.",
            time=now,
            module="Appointment Reminders",
            href="/automation/reminders",
        )
        _audit(request, "AUTOMATION_REMINDER_SENT", "Automation", f"Reminder {r.id} sent ({primary}).", r)
        return success_response(self.get_serializer(r).data, "Reminder sent.")

    @extend_schema(summary="Reschedule a reminder (marks Scheduled)")
    @action(detail=True, methods=["post"])
    def reschedule(self, request, pk=None):
        r = self.get_object()
        now = timezone.now()
        r.status = m.ReminderStatus.SCHEDULED
        r.last_reminder = "—"
        r.save(update_fields=["status", "last_reminder", "updated_at"])
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.APPOINTMENT_REMINDER,
            event_type="Appointment reminder rescheduled",
            description=f"Reminder for {r.appointment_id} moved to the next batch.",
            triggered_at=now,
            status=m.AutomationEventStatus.PENDING,
            triggered_by=getattr(request.user, "email", "staff"),
        )
        _audit(request, "REMINDER_RESCHEDULED", "Automation", f"Reminder {r.id} rescheduled.", r)
        return success_response(self.get_serializer(r).data, "Reminder rescheduled.")

    @extend_schema(summary="Cancel a reminder")
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        r = self.get_object()
        r.status = m.ReminderStatus.CANCELLED
        r.save(update_fields=["status", "updated_at"])
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.APPOINTMENT_REMINDER,
            event_type="Appointment reminder cancelled",
            description=f"Reminder for {r.appointment_id} cancelled by staff.",
            triggered_at=timezone.now(),
            status=m.AutomationEventStatus.WARNING,
            triggered_by=getattr(request.user, "email", "staff"),
        )
        _audit(request, "AUTOMATION_REMINDER_CANCELLED", "Automation", f"Reminder {r.id} cancelled.", r)
        return success_response(self.get_serializer(r).data, "Reminder cancelled.")


class LabAlertViewSet(ModelViewSet):
    queryset = m.LabCompletionAlert.objects.all()
    serializer_class = LabCompletionAlertSerializer
    permission_classes = [IsStaffUser]

    @extend_schema(summary="Notify doctor that a lab report is ready")
    @action(detail=True, methods=["post"])
    def notify_doctor(self, request, pk=None):
        alert = self.get_object()
        now = timezone.now()
        alert.doctor_notification = "Sent"
        if alert.patient_notification == "Sent":
            alert.status = m.LabAlertStatus.NOTIFICATION_SENT
        history = list(alert.history or [])
        history.append(f"{now.isoformat()} — Doctor notified (In-App)")
        alert.history = history
        alert.save(update_fields=["doctor_notification", "status", "history", "updated_at"])
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.LAB_ALERT,
            event_type="Doctor notification sent",
            description=f"{alert.ordered_by} notified about {alert.lab_order_id} (In-App).",
            triggered_at=now,
            status=m.AutomationEventStatus.SUCCESS,
            triggered_by=getattr(request.user, "email", "staff"),
        )
        m.HospitalNotification.objects.create(
            category=m.NotificationCategory.LABORATORY,
            title="Doctor Notified",
            description=f"{alert.ordered_by} was notified about {alert.lab_order_id} ({alert.test}).",
            time=now,
            module="Lab Alerts",
            href="/automation/lab-alerts",
        )
        _audit(request, "AUTOMATION_LAB_DOCTOR_NOTIFIED", "Automation", f"Doctor notified for {alert.id}.", alert)
        return success_response(self.get_serializer(alert).data, "Doctor notified.")

    @extend_schema(summary="Notify patient that a lab report is ready")
    @action(detail=True, methods=["post"])
    def notify_patient(self, request, pk=None):
        alert = self.get_object()
        now = timezone.now()
        alert.patient_notification = "Sent"
        if alert.doctor_notification == "Sent":
            alert.status = m.LabAlertStatus.NOTIFICATION_SENT
        history = list(alert.history or [])
        history.append(f"{now.isoformat()} — Patient notified (SMS)")
        alert.history = history
        alert.save(update_fields=["patient_notification", "status", "history", "updated_at"])
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.LAB_ALERT,
            event_type="Patient notification sent",
            description=f"{alert.patient_name} notified about {alert.lab_order_id} (SMS).",
            triggered_at=now,
            status=m.AutomationEventStatus.SUCCESS,
            triggered_by=getattr(request.user, "email", "staff"),
        )
        m.HospitalNotification.objects.create(
            category=m.NotificationCategory.LABORATORY,
            title="Patient Notified",
            description=f"{alert.patient_name} was notified that {alert.test} results are ready.",
            time=now,
            module="Lab Alerts",
            href="/automation/lab-alerts",
        )
        _audit(request, "LAB_PATIENT_NOTIFIED", "Automation", f"Patient notified for {alert.id}.", alert)
        return success_response(self.get_serializer(alert).data, "Patient notified.")

    @extend_schema(summary="Mark a lab report as reviewed")
    @action(detail=True, methods=["post"])
    def mark_reviewed(self, request, pk=None):
        alert = self.get_object()
        now = timezone.now()
        alert.status = m.LabAlertStatus.REVIEWED
        history = list(alert.history or [])
        history.append(f"{now.isoformat()} — Marked reviewed")
        alert.history = history
        alert.save(update_fields=["status", "history", "updated_at"])
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.LAB_ALERT,
            event_type="Lab report completed",
            description=f"{alert.lab_order_id} reviewed by ordering doctor.",
            triggered_at=now,
            status=m.AutomationEventStatus.SUCCESS,
            triggered_by=getattr(request.user, "email", "staff"),
        )
        _audit(request, "AUTOMATION_LAB_REVIEWED", "Automation", f"Lab alert {alert.id} reviewed.", alert)
        return success_response(self.get_serializer(alert).data, "Marked as reviewed.")

    @extend_schema(summary="Simulate a lab completion (Processing → Ready + notifications)")
    @action(detail=False, methods=["post"])
    def simulate_completion(self, request):
        next_alert = (
            m.LabCompletionAlert.objects.filter(status=m.LabAlertStatus.PROCESSING)
            .order_by("created_at")
            .first()
        )
        if not next_alert:
            return error_response("No Processing tests remain.", status_code=status.HTTP_400_BAD_REQUEST)
        now = timezone.now()
        next_alert.status = m.LabAlertStatus.READY
        next_alert.completed_at = now
        next_alert.result_status = "Normal"
        next_alert.doctor_notification = "Sent"
        next_alert.patient_notification = "Sent"
        history = list(next_alert.history or [])
        history += [
            f"{now.isoformat()} — Report marked ready by lab (simulated)",
            f"{now.isoformat()} — Doctor notified (In-App)",
            f"{now.isoformat()} — Patient notified (SMS)",
        ]
        next_alert.history = history
        next_alert.save(update_fields=["status", "completed_at", "result_status", "doctor_notification", "patient_notification", "history", "updated_at"])
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.LAB_ALERT,
            event_type="Lab report completed",
            description=f"{next_alert.test} report ({next_alert.lab_order_id}) marked ready (simulated).",
            triggered_at=now,
            status=m.AutomationEventStatus.SUCCESS,
            triggered_by="Lab Technician",
        )
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.LAB_ALERT,
            event_type="Doctor notification sent",
            description=f"{next_alert.ordered_by} notified about {next_alert.lab_order_id} (In-App).",
            triggered_at=now,
            status=m.AutomationEventStatus.SUCCESS,
            triggered_by="Automation",
        )
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.LAB_ALERT,
            event_type="Patient notification sent",
            description=f"{next_alert.patient_name} notified about {next_alert.lab_order_id} (SMS).",
            triggered_at=now,
            status=m.AutomationEventStatus.SUCCESS,
            triggered_by="Automation",
        )
        m.HospitalNotification.objects.create(
            category=m.NotificationCategory.LABORATORY,
            title="Lab Report Ready",
            description=f"{next_alert.test} report ({next_alert.lab_order_id}) for {next_alert.patient_name} is ready.",
            time=now,
            module="Lab Alerts",
            href="/automation/lab-alerts",
        )
        _audit(request, "LAB_SIMULATE_COMPLETION", "Automation", f"Simulated completion for {next_alert.id}.", next_alert)
        return success_response(self.get_serializer(next_alert).data, "Lab completion simulated.")


class StockAlertViewSet(ModelViewSet):
    queryset = m.StockAlert.objects.all()
    serializer_class = StockAlertSerializer
    permission_classes = [IsStaffUser]

    @extend_schema(summary="Resolve a stock alert (marks Normal)")
    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.resolved = True
        alert.status = m.StockAlertStatus.NORMAL
        alert.last_updated = timezone.now()
        alert.save(update_fields=["resolved", "status", "last_updated", "updated_at"])
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.STOCK_ALERT,
            event_type="Medicine stock threshold reached",
            description=f"{alert.medicine} alert resolved by pharmacy staff.",
            triggered_at=timezone.now(),
            status=m.AutomationEventStatus.SUCCESS,
            triggered_by=getattr(request.user, "email", "staff"),
        )
        _audit(request, "AUTOMATION_STOCK_RESOLVED", "Automation", f"Stock alert {alert.id} resolved.", alert)
        return success_response(self.get_serializer(alert).data, "Alert resolved.")


class PurchaseRequestViewSet(ModelViewSet):
    queryset = m.PurchaseRequest.objects.all()
    serializer_class = PurchaseRequestSerializer
    permission_classes = [IsStaffUser]


class QueueViewSet(ModelViewSet):
    queryset = m.QueuePatient.objects.all()
    serializer_class = QueuePatientSerializer
    permission_classes = [IsStaffUser]

    def _set_status(self, serial, new_status):
        return m.QueuePatient.objects.filter(serial=serial).update(status=new_status)

    @extend_schema(summary="Call a patient by serial number")
    @action(detail=True, methods=["post"])
    def call(self, request, pk=None):
        q = self.get_object()
        q.status = m.QueueStatus.CALLED
        q.save(update_fields=["status", "updated_at"])
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.WAITING_QUEUE,
            event_type="Patient called",
            description=f"Serial {q.serial} ({q.patient_name}) called to {q.department or 'clinic'}.",
            triggered_at=timezone.now(),
            status=m.AutomationEventStatus.SUCCESS,
            triggered_by=getattr(request.user, "email", "staff"),
        )
        m.HospitalNotification.objects.create(
            category=m.NotificationCategory.QUEUE,
            title="Patient Called",
            description=f"Serial {q.serial} ({q.patient_name}) was called.",
            time=timezone.now(),
            module="Waiting Queue",
            href="/automation/queue",
        )
        _audit(request, "AUTOMATION_QUEUE_CALLED", "Automation", f"Serial {q.serial} called.", q)
        return success_response(self.get_serializer(q).data, "Patient called.")

    @extend_schema(summary="Start consultation for a serial")
    @action(detail=True, methods=["post"])
    def start_consultation(self, request, pk=None):
        q = self.get_object()
        q.status = m.QueueStatus.IN_CONSULTATION
        q.save(update_fields=["status", "updated_at"])
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.WAITING_QUEUE,
            event_type="Queue updated",
            description=f"Serial {q.serial} moved to In Consultation ({q.department or '—'}).",
            triggered_at=timezone.now(),
            status=m.AutomationEventStatus.SUCCESS,
            triggered_by=getattr(request.user, "email", "staff"),
        )
        _audit(request, "AUTOMATION_QUEUE_START_CONSULT", "Automation", f"Serial {q.serial} consultation started.", q)
        return success_response(self.get_serializer(q).data, "Consultation started.")

    @extend_schema(summary="Complete consultation for a serial")
    @action(detail=True, methods=["post"])
    def complete_consultation(self, request, pk=None):
        q = self.get_object()
        q.status = m.QueueStatus.COMPLETED
        q.save(update_fields=["status", "updated_at"])
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.WAITING_QUEUE,
            event_type="Queue updated",
            description=f"Serial {q.serial} ({q.patient_name}) completed consultation.",
            triggered_at=timezone.now(),
            status=m.AutomationEventStatus.SUCCESS,
            triggered_by=getattr(request.user, "email", "staff"),
        )
        _audit(request, "QUEUE_COMPLETE_CONSULT", "Automation", f"Serial {q.serial} completed.", q)
        return success_response(self.get_serializer(q).data, "Consultation completed.")

    @extend_schema(summary="Skip a patient (moves to end)")
    @action(detail=True, methods=["post"])
    def skip(self, request, pk=None):
        q = self.get_object()
        q.status = m.QueueStatus.SKIPPED
        q.save(update_fields=["status", "updated_at"])
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.WAITING_QUEUE,
            event_type="Queue updated",
            description=f"Serial {q.serial} ({q.patient_name}) skipped — moved to end of queue.",
            triggered_at=timezone.now(),
            status=m.AutomationEventStatus.WARNING,
            triggered_by=getattr(request.user, "email", "staff"),
        )
        _audit(request, "AUTOMATION_QUEUE_SKIPPED", "Automation", f"Serial {q.serial} skipped.", q)
        return success_response(self.get_serializer(q).data, "Patient skipped.")

    @extend_schema(summary="Call next waiting patient")
    @action(detail=False, methods=["post"])
    def call_next(self, request):
        next_q = m.QueuePatient.objects.filter(status=m.QueueStatus.WAITING).order_by("created_at").first()
        if not next_q:
            return error_response("No waiting patients.", status_code=status.HTTP_400_BAD_REQUEST)
        now = timezone.now()
        m.QueuePatient.objects.filter(serial=next_q.serial).update(status=m.QueueStatus.CALLED)
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.WAITING_QUEUE,
            event_type="Patient called",
            description=f"Serial {next_q.serial} ({next_q.patient_name}) called — next in queue.",
            triggered_at=now,
            status=m.AutomationEventStatus.SUCCESS,
            triggered_by=getattr(request.user, "email", "staff"),
        )
        m.HospitalNotification.objects.create(
            category=m.NotificationCategory.QUEUE,
            title="Patient Called",
            description=f"Serial {next_q.serial} ({next_q.patient_name}) was called.",
            time=now,
            module="Waiting Queue",
            href="/automation/queue",
        )
        _audit(request, "AUTOMATION_QUEUE_CALL_NEXT", "Automation", f"Serial {next_q.serial} called next.", next_q)
        return success_response(self.get_serializer(next_q).data, "Next patient called.")

    @extend_schema(summary="Auto-advance the queue (polling tick)")
    @action(detail=False, methods=["post"])
    def auto_advance(self, request):
        called = m.QueuePatient.objects.filter(status=m.QueueStatus.CALLED).first()
        now = timezone.now()
        if called:
            called.status = m.QueueStatus.IN_CONSULTATION
            called.save(update_fields=["status", "updated_at"])
            m.AutomationEvent.objects.create(
                workflow=m.AutomationWorkflow.WAITING_QUEUE,
                event_type="Queue updated",
                description=f"Serial {called.serial} moved to In Consultation (auto-update).",
                triggered_at=now,
                status=m.AutomationEventStatus.SUCCESS,
                triggered_by="Queue Monitor",
            )
            return success_response(self.get_serializer(called).data, "Auto-advance: called → in consultation.")
        waiting = m.QueuePatient.objects.filter(status=m.QueueStatus.WAITING).order_by("created_at").first()
        if waiting:
            waiting.status = m.QueueStatus.CALLED
            waiting.save(update_fields=["status", "updated_at"])
            m.AutomationEvent.objects.create(
                workflow=m.AutomationWorkflow.WAITING_QUEUE,
                event_type="Patient called",
                description=f"Serial {waiting.serial} ({waiting.patient_name}) called (auto-update).",
                triggered_at=now,
                status=m.AutomationEventStatus.SUCCESS,
                triggered_by="Queue Monitor",
            )
            return success_response(self.get_serializer(waiting).data, "Auto-advance: next patient called.")
        return success_response(None, "No changes.")


class EventViewSet(ReadOnlyModelViewSet):
    queryset = m.AutomationEvent.objects.all()
    serializer_class = AutomationEventSerializer
    permission_classes = [IsStaffUser]


class NotificationViewSet(ModelViewSet):
    queryset = m.HospitalNotification.objects.all()
    serializer_class = HospitalNotificationSerializer
    permission_classes = [IsStaffUser]
    http_method_names = ["get", "put", "patch", "post", "delete", "head", "options"]

    @extend_schema(summary="Mark one notification as read")
    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        n = self.get_object()
        n.read = True
        n.save(update_fields=["read"])
        return success_response(self.get_serializer(n).data, "Notification marked read.")

    @extend_schema(summary="Mark all notifications as read")
    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        m.HospitalNotification.objects.filter(read=False).update(read=True)
        return success_response(None, "All notifications marked read.")

    @extend_schema(summary="Delete one notification")
    @action(detail=True, methods=["delete"])
    def delete_notification(self, request, pk=None):
        self.get_object().delete()
        return success_response(None, "Notification deleted.")
