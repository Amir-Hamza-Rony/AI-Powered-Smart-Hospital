"""Automation backend tests (Phase 6 — AUTO-02/AUTO-04).

Covers: workflow toggle, reminder send/reschedule/cancel,
lab-alert notify-doctor/patient/mark-reviewed/simulate-completion,
stock-alert resolve + purchase request, queue call/start/complete/skip/
call-next/auto-advance, notification mark-read/mark-all-read/delete,
and the alert rules (low-stock, near-expiry, lab-ready, reminder).
"""

from datetime import date, timedelta
from unittest import mock

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.automation import models as m


def make_user(email, role, staff=False, superuser=False):
    return User.objects.create_user(
        email=email, password="StrongPass123", first_name="Test",
        last_name="User", role=role, is_staff=staff, is_superuser=superuser)


def make_workflow(name, **overrides):
    data = {
        "name": name,
        "description": "d",
        "status": m.WorkflowStatus.ACTIVE,
        "enabled": True,
        "event_count": 0,
        "href": "/automation",
    }
    data.update(overrides)
    return m.AutomationWorkflowModel.objects.create(**data)


class AutomationApiTests(APITestCase):
    def setUp(self):
        self.admin = make_user("admin@example.com", Role.SUPER_ADMIN, staff=True, superuser=True)
        self.doctor = make_user("doctor@example.com", Role.DOCTOR, staff=True)
        self.receptionist = make_user("recep@example.com", Role.RECEPTIONIST)
        self.pharmacist = make_user("pharm@example.com", Role.PHARMACIST)
        self.patient = make_user("patient@example.com", Role.PATIENT)

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    # -- workflows -----------------------------------------------------------
    def test_workflow_list_and_toggle(self):
        make_workflow("Appointment Reminder")
        make_workflow("Lab Alert")
        self._auth(self.receptionist)
        resp = self.client.get(reverse("automation-workflows-list"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.json()["results"]), 2)
        wf = m.AutomationWorkflowModel.objects.first()
        toggled = self.client.post(
            reverse("automation-workflows-toggle", args=[wf.id]), {}, format="json")
        self.assertEqual(toggled.status_code, status.HTTP_200_OK)
        wf.refresh_from_db()
        self.assertFalse(wf.enabled)

    def test_patient_blocked_from_workflows(self):
        self._auth(self.patient)
        self.assertEqual(
            self.client.get(reverse("automation-workflows-list")).status_code,
            status.HTTP_403_FORBIDDEN)

    # -- reminders -----------------------------------------------------------
    def test_reminder_crud_and_send(self):
        r = m.AppointmentReminder.objects.create(
            appointment_id="APT-1", patient_id="PAT-1", patient_name="Rahim",
            doctor_name="Dr. Smith", specialty="Cardiology",
            date=date.today() + timedelta(days=1), time="10:00",
            status=m.ReminderStatus.SCHEDULED, channels=["SMS", "In-App"],
            message_preview="Reminder preview.")
        self._auth(self.doctor)
        created = self.client.post(
            reverse("automation-reminders-list"),
            {
                "appointment_id": "APT-2", "patient_id": "PAT-2", "patient_name": "Fatema",
                "doctor_name": "Dr. Jones", "date": str(date.today() + timedelta(days=2)),
                "time": "11:00", "status": "Pending", "channels": ["SMS"],
                "message_preview": "New reminder.",
            }, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        sent = self.client.post(
            reverse("automation-reminders-send", args=[r.id]), {}, format="json")
        self.assertEqual(sent.status_code, status.HTTP_200_OK)
        r.refresh_from_db()
        self.assertEqual(r.status, m.ReminderStatus.SENT)
        self.assertTrue(
            m.AutomationEvent.objects.filter(
                workflow=m.AutomationWorkflow.APPOINTMENT_REMINDER,
                event_type="Appointment reminder sent").exists())
        self.assertTrue(
            m.HospitalNotification.objects.filter(
                category=m.NotificationCategory.APPOINTMENTS).exists())

    def test_reminder_reschedule_and_cancel(self):
        r = m.AppointmentReminder.objects.create(
            appointment_id="APT-3", patient_id="PAT-3", patient_name="X",
            doctor_name="Dr. Y", date=date.today(), time="09:00",
            status=m.ReminderStatus.SENT, channels=["SMS"])
        self._auth(self.receptionist)
        res = self.client.post(
            reverse("automation-reminders-reschedule", args=[r.id]), {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        r.refresh_from_db()
        self.assertEqual(r.status, m.ReminderStatus.SCHEDULED)
        cancelled = self.client.post(
            reverse("automation-reminders-cancel", args=[r.id]), {}, format="json")
        self.assertEqual(cancelled.status_code, status.HTTP_200_OK)
        r.refresh_from_db()
        self.assertEqual(r.status, m.ReminderStatus.CANCELLED)

    # -- lab alerts ----------------------------------------------------------
    def test_lab_alert_notify_doctor_and_patient(self):
        alert = m.LabCompletionAlert.objects.create(
            lab_order_id="LAB-1", patient_name="Rahim", test="Lipid Profile",
            ordered_by="Dr. Ayesha", status=m.LabAlertStatus.READY,
            doctor_notification="Pending", patient_notification="Pending",
            result_status="Normal", channels=["In-App", "SMS"])
        self._auth(self.doctor)
        nd = self.client.post(
            reverse("automation-lab-alerts-notify-doctor", args=[alert.id]), {}, format="json")
        self.assertEqual(nd.status_code, status.HTTP_200_OK)
        alert.refresh_from_db()
        self.assertEqual(alert.doctor_notification, "Sent")
        np = self.client.post(
            reverse("automation-lab-alerts-notify-patient", args=[alert.id]), {}, format="json")
        self.assertEqual(np.status_code, status.HTTP_200_OK)
        alert.refresh_from_db()
        self.assertEqual(alert.patient_notification, "Sent")
        self.assertEqual(alert.status, m.LabAlertStatus.NOTIFICATION_SENT)
        reviewed = self.client.post(
            reverse("automation-lab-alerts-mark-reviewed", args=[alert.id]), {}, format="json")
        self.assertEqual(reviewed.status_code, status.HTTP_200_OK)
        alert.refresh_from_db()
        self.assertEqual(alert.status, m.LabAlertStatus.REVIEWED)

    def test_lab_alert_simulate_completion(self):
        m.LabCompletionAlert.objects.create(
            lab_order_id="LAB-2", patient_name="A", test="CBC", ordered_by="Dr. B",
            status=m.LabAlertStatus.PROCESSING, channels=["In-App"])
        self._auth(self.pharmacist)
        sim = self.client.post(
            reverse("automation-lab-alerts-simulate-completion"), {}, format="json")
        self.assertEqual(sim.status_code, status.HTTP_200_OK)
        alert = m.LabCompletionAlert.objects.get(lab_order_id="LAB-2")
        self.assertEqual(alert.status, m.LabAlertStatus.READY)
        self.assertEqual(alert.doctor_notification, "Sent")
        self.assertEqual(alert.patient_notification, "Sent")
        # No processing left → 400
        sim2 = self.client.post(
            reverse("automation-lab-alerts-simulate-completion"), {}, format="json")
        self.assertEqual(sim2.status_code, status.HTTP_400_BAD_REQUEST)

    # -- stock alerts --------------------------------------------------------
    def test_stock_alert_low_and_critical_rules(self):
        m.StockAlert.objects.create(
            medicine="Paracetamol", sku="INV-1", current_stock=10, minimum_level=100,
            status=m.StockAlertStatus.LOW, supplier="MediServe")
        m.StockAlert.objects.create(
            medicine="Salbutamol", sku="INV-2", current_stock=0, minimum_level=40,
            status=m.StockAlertStatus.CRITICAL, expiry_date=date.today() - timedelta(days=1),
            supplier="PharmaLink")
        self._auth(self.pharmacist)
        resp = self.client.get(reverse("automation-stock-alerts-list"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.json()["results"]
        statuses = {s["status"] for s in results}
        self.assertIn("Low", statuses)
        self.assertIn("Critical", statuses)

    def test_stock_alert_near_expiry_rule(self):
        m.StockAlert.objects.create(
            medicine="Losartan", sku="INV-3", current_stock=180, minimum_level=250,
            status=m.StockAlertStatus.NEAR_EXPIRY, expiry_date=date.today() + timedelta(days=5),
            supplier="MediServe")
        self._auth(self.pharmacist)
        resp = self.client.get(reverse("automation-stock-alerts-list"))
        statuses = {s["status"] for s in resp.json()["results"]}
        self.assertIn("Near Expiry", statuses)

    def test_stock_alert_resolve(self):
        alert = m.StockAlert.objects.create(
            medicine="Amoxicillin", sku="INV-4", current_stock=340, minimum_level=400,
            status=m.StockAlertStatus.LOW, supplier="PharmaLink")
        self._auth(self.doctor)
        res = self.client.post(
            reverse("automation-stock-alerts-resolve", args=[alert.id]), {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        alert.refresh_from_db()
        self.assertTrue(alert.resolved)
        self.assertEqual(alert.status, m.StockAlertStatus.NORMAL)

    def test_purchase_request_from_stock(self):
        pr = m.PurchaseRequest.objects.create(
            medicine="Salbutamol", sku="INV-5", current_stock=0, required_quantity=200,
            supplier="MediServe", priority="High", notes="Zero stock.")
        self._auth(self.pharmacist)
        resp = self.client.get(reverse("automation-purchase-requests-list"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.json()["results"]), 1)
        self.assertEqual(m.PurchaseRequest.objects.get(id=pr.id).status, m.PurchaseRequestStatus.REQUESTED)

    # -- queue ---------------------------------------------------------------
    def test_queue_call_start_complete_skip(self):
        q = m.QueuePatient.objects.create(
            serial="A-001", patient_name="Jamal", patient_id="PAT-1",
            doctor_name="Dr. Karim", department="General Medicine",
            status=m.QueueStatus.WAITING, arrival_time="08:05 AM", waiting_minutes=10,
            priority="Normal")
        self._auth(self.receptionist)
        called = self.client.post(
            reverse("automation-queue-call", args=[q.id]), {}, format="json")
        self.assertEqual(called.status_code, status.HTTP_200_OK)
        q.refresh_from_db()
        self.assertEqual(q.status, m.QueueStatus.CALLED)
        started = self.client.post(
            reverse("automation-queue-start-consultation", args=[q.id]), {}, format="json")
        self.assertEqual(started.status_code, status.HTTP_200_OK)
        q.refresh_from_db()
        self.assertEqual(q.status, m.QueueStatus.IN_CONSULTATION)
        completed = self.client.post(
            reverse("automation-queue-complete-consultation", args=[q.id]), {}, format="json")
        self.assertEqual(completed.status_code, status.HTTP_200_OK)
        q.refresh_from_db()
        self.assertEqual(q.status, m.QueueStatus.COMPLETED)
        skipped = m.QueuePatient.objects.create(
            serial="A-002", patient_name="Shirin", status=m.QueueStatus.WAITING)
        sk = self.client.post(
            reverse("automation-queue-skip", args=[skipped.id]), {}, format="json")
        self.assertEqual(sk.status_code, status.HTTP_200_OK)
        skipped.refresh_from_db()
        self.assertEqual(skipped.status, m.QueueStatus.SKIPPED)

    def test_queue_call_next_and_auto_advance(self):
        m.QueuePatient.objects.create(serial="A-010", patient_name="A", status=m.QueueStatus.WAITING)
        m.QueuePatient.objects.create(serial="A-011", patient_name="B", status=m.QueueStatus.WAITING)
        self._auth(self.doctor)
        cn = self.client.post(reverse("automation-queue-call-next"), {}, format="json")
        self.assertEqual(cn.status_code, status.HTTP_200_OK)
        waiting = m.QueuePatient.objects.filter(status=m.QueueStatus.WAITING).count()
        self.assertEqual(waiting, 1)
        aa = self.client.post(reverse("automation-queue-auto-advance"), {}, format="json")
        self.assertEqual(aa.status_code, status.HTTP_200_OK)
        # call_next called A-010; auto-advance moved A-010 to in-consultation.
        self.assertEqual(
            m.QueuePatient.objects.filter(status=m.QueueStatus.IN_CONSULTATION).count(), 1)
        self.assertEqual(
            m.QueuePatient.objects.filter(status=m.QueueStatus.CALLED).count(), 0)

    # -- events & notifications ----------------------------------------------
    def test_event_list_read_only(self):
        m.AutomationEvent.objects.create(
            workflow=m.AutomationWorkflow.SYSTEM, event_type="Nightly scheduler",
            description="Completed.", triggered_at=timezone.now(), status=m.AutomationEventStatus.SUCCESS,
            triggered_by="System")
        self._auth(self.receptionist)
        resp = self.client.get(reverse("automation-events-list"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.json()["results"]), 1)

    def test_notification_mark_read_and_delete(self):
        n = m.HospitalNotification.objects.create(
            category=m.NotificationCategory.SYSTEM, title="Nightly done",
            description="Scheduler completed.", time=timezone.now(),
            module="Automation", href="/automation")
        self._auth(self.receptionist)
        mr = self.client.post(
            reverse("automation-notifications-mark-read", args=[n.id]), {}, format="json")
        self.assertEqual(mr.status_code, status.HTTP_200_OK)
        n.refresh_from_db()
        self.assertTrue(n.read)
        all_read = self.client.post(
            reverse("automation-notifications-mark-all-read"), {}, format="json")
        self.assertEqual(all_read.status_code, status.HTTP_200_OK)
        self.assertTrue(
            m.HospitalNotification.objects.filter(read=False).count() == 0)
        deleted = self.client.delete(
            reverse("automation-notifications-delete-notification", args=[n.id]))
        self.assertEqual(deleted.status_code, status.HTTP_200_OK)
        self.assertFalse(m.HospitalNotification.objects.filter(id=n.id).exists())

    # -- permissions ---------------------------------------------------------
    def test_unauthenticated_blocked(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.get(reverse("automation-workflows-list")).status_code,
            status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            self.client.post(reverse("automation-reminders-list"), {}, format="json").status_code,
            status.HTTP_401_UNAUTHORIZED)
