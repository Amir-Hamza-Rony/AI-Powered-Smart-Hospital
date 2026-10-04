"""Appointment API tests: booking, state machine, conflicts, filtering, permissions."""

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.appointments.models import Appointment
from apps.audit.models import AuditLog
from apps.doctors.models import Doctor
from apps.patients.models import Patient


def make_user(email, role, staff=False, superuser=False):
    return User.objects.create_user(
        email=email, password="StrongPass123", first_name="Test",
        last_name="User", role=role, is_staff=staff, is_superuser=superuser)


def make_patient(phone="+8801714000001", nid="198501010001"):
    return Patient.objects.create(
        first_name="Test", last_name="Patient", date_of_birth="1990-01-01",
        gender="Male", phone=phone, nid=nid,
        emergency_contact="Kin", emergency_phone="+8801714000002")


def make_doctor(reg="BMDC-A-60001"):
    return Doctor.objects.create(
        first_name="Doc", last_name="Tor", specialization="General Medicine",
        registration_no=reg, phone="+8801714000011")


def future(days=7):
    return (timezone.localdate() + timedelta(days=days)).isoformat()


class AppointmentApiTests(APITestCase):
    def setUp(self):
        self.staff = make_user("staff@example.com", Role.RECEPTIONIST)
        self.doctor_user = make_user("doctor@example.com", Role.DOCTOR, staff=True)
        self.patient_user = make_user("patient@example.com", Role.PATIENT)
        self.patient = make_patient()
        self.doctor = make_doctor()

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _payload(self, **overrides):
        data = {
            "patient": str(self.patient.id), "doctor": str(self.doctor.id),
            "date": future(), "time": "09:00:00", "type": "In-person",
            "reason": "Fever and checkup.", "notes": "",
        }
        data.update(overrides)
        return data

    def test_unauthenticated_cannot_list(self):
        self.assertEqual(
            self.client.get(reverse("appointments-list")).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patient_role_cannot_create(self):
        self._auth(self.patient_user)
        self.assertEqual(
            self.client.post(reverse("appointments-list"), self._payload(), format="json").status_code,
            status.HTTP_403_FORBIDDEN)

    def test_staff_can_create_pending_and_audit(self):
        self._auth(self.staff)
        response = self.client.post(reverse("appointments-list"), self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["status"], "Pending")
        self.assertEqual(body["data"]["patient_name"], "Test Patient")
        self.assertTrue(AuditLog.objects.filter(
            action="APPOINTMENT_CREATED", object_id=body["data"]["id"]).exists())

    def test_create_with_non_pending_status_rejected(self):
        self._auth(self.staff)
        response = self.client.post(
            reverse("appointments-list"), self._payload(status="Confirmed"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_past_date_rejected(self):
        self._auth(self.staff)
        past = (timezone.localdate() - timedelta(days=1)).isoformat()
        response = self.client.post(
            reverse("appointments-list"), self._payload(date=past), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_conflicting_slot_rejected(self):
        self._auth(self.staff)
        self.assertEqual(
            self.client.post(reverse("appointments-list"), self._payload(), format="json").status_code,
            status.HTTP_201_CREATED)
        other_patient = make_patient(phone="+8801714000005", nid="198501010005")
        response = self.client.post(
            reverse("appointments-list"), self._payload(patient=str(other_patient.id)), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancelled_slot_reusable(self):
        self._auth(self.staff)
        created = self.client.post(
            reverse("appointments-list"), self._payload(), format="json").json()["data"]
        self.client.post(reverse("appointments-cancel", args=[created["id"]]))
        other_patient = make_patient(phone="+8801714000006", nid="198501010006")
        response = self.client.post(
            reverse("appointments-list"), self._payload(patient=str(other_patient.id)), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_valid_transitions_via_actions(self):
        self._auth(self.staff)
        created = self.client.post(
            reverse("appointments-list"), self._payload(), format="json").json()["data"]
        url_confirm = reverse("appointments-confirm", args=[created["id"]])
        self.assertEqual(self.client.post(url_confirm).json()["data"]["status"], "Confirmed")
        url_complete = reverse("appointments-complete", args=[created["id"]])
        self.assertEqual(self.client.post(url_complete).json()["data"]["status"], "Completed")

    def test_valid_transition_via_patch(self):
        self._auth(self.staff)
        created = self.client.post(
            reverse("appointments-list"), self._payload(), format="json").json()["data"]
        response = self.client.patch(
            reverse("appointments-detail", args=[created["id"]]),
            {"status": "Confirmed"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(AuditLog.objects.filter(
            action="APPOINTMENT_UPDATED", object_id=created["id"]).exists())

    def test_invalid_transitions_rejected(self):
        self._auth(self.staff)
        created = self.client.post(
            reverse("appointments-list"), self._payload(), format="json").json()["data"]
        # Pending -> Completed skips Confirmed
        response = self.client.patch(
            reverse("appointments-detail", args=[created["id"]]),
            {"status": "Completed"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Pending -> Completed via action also invalid
        self.assertEqual(
            self.client.post(reverse("appointments-complete", args=[created["id"]])).status_code,
            status.HTTP_400_BAD_REQUEST)
        # Complete then cancel (terminal) is invalid
        self.client.post(reverse("appointments-confirm", args=[created["id"]]))
        self.client.post(reverse("appointments-complete", args=[created["id"]]))
        self.assertEqual(
            self.client.post(reverse("appointments-cancel", args=[created["id"]])).status_code,
            status.HTTP_400_BAD_REQUEST)
        response = self.client.patch(
            reverse("appointments-detail", args=[created["id"]]),
            {"status": "Cancelled"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filtering(self):
        self._auth(self.staff)
        first = self.client.post(
            reverse("appointments-list"), self._payload(), format="json").json()["data"]
        other_patient = make_patient(phone="+8801714000007", nid="198501010007")
        self.client.post(
            reverse("appointments-list"),
            self._payload(patient=str(other_patient.id), date=future(8), time="10:00:00"),
            format="json")
        self.assertEqual(len(self.client.get(
            reverse("appointments-list"), {"status": "Pending"}).json()["results"]), 2)
        self.assertEqual(len(self.client.get(
            reverse("appointments-list"), {"patient": str(self.patient.id)}).json()["results"]), 1)
        self.assertEqual(len(self.client.get(
            reverse("appointments-list"), {"doctor": str(self.doctor.id)}).json()["results"]), 2)
        self.assertEqual(len(self.client.get(
            reverse("appointments-list"), {"date": first["date"]}).json()["results"]), 1)
        self.assertEqual(len(self.client.get(
            reverse("appointments-list"), {"search": "Fever"}).json()["results"]), 2)

    def test_doctor_can_read_appointments(self):
        self._auth(self.staff)
        self.client.post(reverse("appointments-list"), self._payload(), format="json")
        self._auth(self.doctor_user)
        self.assertEqual(
            self.client.get(reverse("appointments-list")).status_code, status.HTTP_200_OK)
