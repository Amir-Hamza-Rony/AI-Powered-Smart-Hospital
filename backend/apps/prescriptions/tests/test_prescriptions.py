"""Prescription API tests: CRUD, items, transitions, filters, permissions, audit."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.audit.models import AuditLog
from apps.doctors.models import Doctor
from apps.patients.models import Patient


def make_user(email, role, staff=False, superuser=False):
    return User.objects.create_user(
        email=email, password="StrongPass123", first_name="Test",
        last_name="User", role=role, is_staff=staff, is_superuser=superuser)


def make_patient(phone="+8801715000001", nid="198501010011"):
    return Patient.objects.create(
        first_name="Test", last_name="Patient", date_of_birth="1990-01-01",
        gender="Male", phone=phone, nid=nid,
        emergency_contact="Kin", emergency_phone="+8801715000002")


def make_doctor(reg="BMDC-A-70001"):
    return Doctor.objects.create(
        first_name="Doc", last_name="Tor", specialization="General Medicine",
        registration_no=reg, phone="+8801715000011")


def item_payload(**overrides):
    data = {
        "medicine_name": "Paracetamol", "strength": "500mg",
        "dosage": "1 tablet", "frequency": "Twice daily",
        "duration": "5 days", "route": "Oral", "quantity": 10,
        "instructions": "After meals",
    }
    data.update(overrides)
    return data


class PrescriptionApiTests(APITestCase):
    def setUp(self):
        self.doctor_user = make_user("doctor@example.com", Role.DOCTOR, staff=True)
        self.receptionist = make_user("recep@example.com", Role.RECEPTIONIST)
        self.patient_user = make_user("patient@example.com", Role.PATIENT)
        self.patient = make_patient()
        self.doctor = make_doctor()

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _payload(self, **overrides):
        data = {
            "patient": str(self.patient.id), "doctor": str(self.doctor.id),
            "date": "2026-09-20", "chief_complaint": "Fever",
            "diagnosis": "Viral fever", "symptoms": "Fever, headache",
            "clinical_notes": "Rest advised.", "follow_up_required": True,
            "follow_up_date": "2026-09-27",
            "follow_up_instructions": "Return if fever persists.",
            "items": [item_payload()],
        }
        data.update(overrides)
        return data

    def test_unauthenticated_cannot_list(self):
        self.assertEqual(
            self.client.get(reverse("prescriptions-list")).status_code,
            status.HTTP_401_UNAUTHORIZED)

    def test_patient_role_cannot_create(self):
        self._auth(self.patient_user)
        self.assertEqual(
            self.client.post(reverse("prescriptions-list"), self._payload(), format="json").status_code,
            status.HTTP_403_FORBIDDEN)

    def test_receptionist_cannot_create(self):
        self._auth(self.receptionist)
        self.assertEqual(
            self.client.post(reverse("prescriptions-list"), self._payload(), format="json").status_code,
            status.HTTP_403_FORBIDDEN)

    def test_doctor_can_create_and_audit(self):
        self._auth(self.doctor_user)
        response = self.client.post(
            reverse("prescriptions-list"), self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["status"], "Active")
        self.assertEqual(len(body["data"]["items"]), 1)
        self.assertTrue(AuditLog.objects.filter(
            action="PRESCRIPTION_CREATED", object_id=body["data"]["id"]).exists())

    def test_items_required(self):
        self._auth(self.doctor_user)
        response = self.client.post(
            reverse("prescriptions-list"), self._payload(items=[]), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_patient_rejected(self):
        self._auth(self.doctor_user)
        response = self.client.post(
            reverse("prescriptions-list"),
            self._payload(patient="00000000-0000-0000-0000-000000000000"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_future_date_rejected(self):
        self._auth(self.doctor_user)
        response = self.client.post(
            reverse("prescriptions-list"), self._payload(date="2990-01-01"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_follow_up_date_required_when_flagged(self):
        self._auth(self.doctor_user)
        payload = self._payload()
        del payload["follow_up_date"]
        response = self.client.post(reverse("prescriptions-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_update_and_status_transition(self):
        self._auth(self.doctor_user)
        created = self.client.post(
            reverse("prescriptions-list"), self._payload(), format="json").json()["data"]
        self._auth(self.receptionist)
        response = self.client.get(reverse("prescriptions-detail", args=[created["id"]]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self._auth(self.doctor_user)
        response = self.client.patch(
            reverse("prescriptions-detail", args=[created["id"]]),
            {"status": "Completed"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(AuditLog.objects.filter(
            action="PRESCRIPTION_UPDATED", object_id=created["id"]).exists())
        # Terminal: cannot reopen or edit content.
        self.assertEqual(self.client.patch(
            reverse("prescriptions-detail", args=[created["id"]]),
            {"status": "Active"}, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.patch(
            reverse("prescriptions-detail", args=[created["id"]]),
            {"diagnosis": "Changed"}, format="json").status_code, status.HTTP_400_BAD_REQUEST)

    def test_filtering(self):
        self._auth(self.doctor_user)
        self.client.post(reverse("prescriptions-list"), self._payload(), format="json")
        other = make_patient(phone="+8801715000005", nid="198501010015")
        self.client.post(reverse("prescriptions-list"), self._payload(
            patient=str(other.id), date="2026-09-21", diagnosis="Migraine",
            status="Active", items=[item_payload(medicine_name="Ibuprofen")]), format="json")
        self.assertEqual(len(self.client.get(
            reverse("prescriptions-list"), {"patient": str(self.patient.id)}).json()["results"]), 1)
        self.assertEqual(len(self.client.get(
            reverse("prescriptions-list"), {"doctor": str(self.doctor.id)}).json()["results"]), 2)
        self.assertEqual(len(self.client.get(
            reverse("prescriptions-list"), {"search": "Migraine"}).json()["results"]), 1)
        self.assertEqual(len(self.client.get(
            reverse("prescriptions-list"), {"date": "2026-09-20"}).json()["results"]), 1)
