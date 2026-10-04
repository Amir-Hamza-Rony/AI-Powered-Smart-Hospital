"""Laboratory API tests: catalog, order workflow, results, filters, permissions, audit."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.audit.models import AuditLog
from apps.doctors.models import Doctor
from apps.laboratory.models import LabTest
from apps.patients.models import Patient


def make_user(email, role, staff=False, superuser=False):
    return User.objects.create_user(
        email=email, password="StrongPass123", first_name="Test",
        last_name="User", role=role, is_staff=staff, is_superuser=superuser)


def make_patient(phone="+8801716000001", nid="198501010021"):
    return Patient.objects.create(
        first_name="Test", last_name="Patient", date_of_birth="1990-01-01",
        gender="Male", phone=phone, nid=nid,
        emergency_contact="Kin", emergency_phone="+8801716000002")


def make_doctor(reg="BMDC-A-80001"):
    return Doctor.objects.create(
        first_name="Doc", last_name="Tor", specialization="General Medicine",
        registration_no=reg, phone="+8801716000011")


def make_test(code="LT-9001", name="Complete Blood Count"):
    return LabTest.objects.create(
        name=name, code=code, category="Hematology", price="350.00",
        sample_type="Blood")


class LabApiTests(APITestCase):
    def setUp(self):
        self.admin = make_user("admin@example.com", Role.SUPER_ADMIN, staff=True, superuser=True)
        self.doctor_user = make_user("doctor@example.com", Role.DOCTOR, staff=True)
        self.pathologist = make_user("patho@example.com", Role.PATHOLOGIST)
        self.patient_user = make_user("patient@example.com", Role.PATIENT)
        self.patient = make_patient()
        self.doctor = make_doctor()
        self.test = make_test()

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _order_payload(self, **overrides):
        data = {
            "patient": str(self.patient.id), "doctor": str(self.doctor.id),
            "order_date": "2026-09-20", "priority": "Normal",
            "instructions": "Fasting required.",
            "items": [{"test": str(self.test.id)}],
        }
        data.update(overrides)
        return data

    def test_test_catalog_permissions(self):
        payload = {"name": "X-Ray", "code": "LT-9002", "price": "500.00"}
        self.assertEqual(
            self.client.post(reverse("lab-tests-list"), payload, format="json").status_code,
            status.HTTP_401_UNAUTHORIZED)
        self._auth(self.patient_user)
        self.assertEqual(
            self.client.get(reverse("lab-tests-list")).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.post(reverse("lab-tests-list"), payload, format="json").status_code,
            status.HTTP_403_FORBIDDEN)
        self._auth(self.pathologist)
        response = self.client.post(reverse("lab-tests-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(AuditLog.objects.filter(
            action="LAB_TEST_CREATED", object_id=response.json()["data"]["id"]).exists())

    def test_duplicate_test_code_rejected(self):
        self._auth(self.admin)
        response = self.client.post(
            reverse("lab-tests-list"),
            {"name": "Other", "code": "LT-9001", "price": "100.00"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_can_create_order_and_audit(self):
        self._auth(self.doctor_user)
        response = self.client.post(
            reverse("lab-orders-list"), self._order_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertEqual(body["data"]["status"], "Pending")
        self.assertEqual(len(body["data"]["items"]), 1)
        self.assertTrue(AuditLog.objects.filter(
            action="LAB_ORDER_CREATED", object_id=body["data"]["id"]).exists())

    def test_order_requires_items(self):
        self._auth(self.doctor_user)
        self.assertEqual(self.client.post(
            reverse("lab-orders-list"), self._order_payload(items=[]),
            format="json").status_code, status.HTTP_400_BAD_REQUEST)

    def test_full_workflow_pending_processing_ready(self):
        self._auth(self.doctor_user)
        created = self.client.post(
            reverse("lab-orders-list"), self._order_payload(), format="json").json()["data"]
        self._auth(self.pathologist)
        self.assertEqual(
            self.client.post(reverse("lab-orders-process", args=[created["id"]])).json()["data"]["status"],
            "Processing")
        # Ready requires results first.
        self.assertEqual(
            self.client.post(reverse("lab-orders-ready", args=[created["id"]])).status_code,
            status.HTTP_400_BAD_REQUEST)
        results = self.client.post(
            reverse("lab-orders-results", args=[created["id"]]),
            {"items": [{"test": str(self.test.id), "result": "13.5",
                        "unit": "g/dL", "reference_range": "13-17",
                        "status": "Normal"}]}, format="json")
        self.assertEqual(results.status_code, status.HTTP_200_OK)
        self.assertTrue(AuditLog.objects.filter(
            action="LAB_RESULT_UPDATED", object_id=created["id"]).exists())
        self.assertEqual(
            self.client.post(reverse("lab-orders-ready", args=[created["id"]])).json()["data"]["status"],
            "Ready")

    def test_invalid_transitions_rejected(self):
        self._auth(self.doctor_user)
        created = self.client.post(
            reverse("lab-orders-list"), self._order_payload(), format="json").json()["data"]
        self._auth(self.pathologist)
        # Pending -> Ready skips Processing.
        self.assertEqual(
            self.client.post(reverse("lab-orders-ready", args=[created["id"]])).status_code,
            status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.patch(
            reverse("lab-orders-detail", args=[created["id"]]),
            {"status": "Completed"}, format="json").status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancellation(self):
        self._auth(self.doctor_user)
        created = self.client.post(
            reverse("lab-orders-list"), self._order_payload(), format="json").json()["data"]
        self._auth(self.pathologist)
        self.assertEqual(
            self.client.post(reverse("lab-orders-cancel", args=[created["id"]])).json()["data"]["status"],
            "Cancelled")
        self.assertEqual(
            self.client.post(reverse("lab-orders-process", args=[created["id"]])).status_code,
            status.HTTP_400_BAD_REQUEST)

    def test_workflow_actions_require_pathologist_or_admin(self):
        self._auth(self.doctor_user)
        created = self.client.post(
            reverse("lab-orders-list"), self._order_payload(), format="json").json()["data"]
        self.assertEqual(
            self.client.post(reverse("lab-orders-process", args=[created["id"]])).status_code,
            status.HTTP_403_FORBIDDEN)

    def test_results_require_processing_status(self):
        self._auth(self.doctor_user)
        created = self.client.post(
            reverse("lab-orders-list"), self._order_payload(), format="json").json()["data"]
        self._auth(self.pathologist)
        self.assertEqual(self.client.post(
            reverse("lab-orders-results", args=[created["id"]]),
            {"items": [{"test": str(self.test.id), "result": "x"}]},
            format="json").status_code, status.HTTP_400_BAD_REQUEST)

    def test_filtering(self):
        self._auth(self.doctor_user)
        self.client.post(reverse("lab-orders-list"), self._order_payload(), format="json")
        other = make_test(code="LT-9005", name="Lipid Profile")
        self.client.post(reverse("lab-orders-list"), self._order_payload(
            priority="Urgent", items=[{"test": str(other.id)}]), format="json")
        self.assertEqual(len(self.client.get(
            reverse("lab-orders-list"), {"priority": "Urgent"}).json()["results"]), 1)
        self.assertEqual(len(self.client.get(
            reverse("lab-orders-list"), {"patient": str(self.patient.id)}).json()["results"]), 2)
        self.assertEqual(len(self.client.get(
            reverse("lab-orders-list"), {"search": "Lipid"}).json()["results"]), 1)
