"""Doctor API tests: CRUD, roster validation, schedules, filtering, permissions."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.audit.models import AuditLog
from apps.doctors.models import Doctor


def make_user(email, role, staff=False, superuser=False):
    return User.objects.create_user(
        email=email, password="StrongPass123", first_name="Test",
        last_name="User", role=role, is_staff=staff, is_superuser=superuser)


def doctor_payload(**overrides):
    data = {
        "first_name": "Salma", "last_name": "Begum",
        "specialization": "Cardiology", "qualification": "MBBS, MD",
        "experience_years": 12, "registration_no": "BMDC-A-50001",
        "phone": "+8801713000001", "email": "salma@example.com",
        "department": "Cardiology", "room": "201", "consultation_fee": "1200.00",
        "availability": "Available", "status": "Active",
        "schedules": [
            {"day": 0, "is_available": True, "slots": ["09:00 AM", "10:30 AM"]},
            {"day": 4, "is_available": False, "slots": []},
        ],
    }
    data.update(overrides)
    return data


class DoctorApiTests(APITestCase):
    def setUp(self):
        self.receptionist = make_user("recep@example.com", Role.RECEPTIONIST)
        self.doctor_user = make_user("doctor@example.com", Role.DOCTOR, staff=True)
        self.patient_user = make_user("patient@example.com", Role.PATIENT)

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_unauthenticated_cannot_list(self):
        self.assertEqual(
            self.client.get(reverse("doctors-list")).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patient_can_list_but_not_create(self):
        Doctor.objects.create(**{k: v for k, v in doctor_payload().items() if k != "schedules"})
        self._auth(self.patient_user)
        self.assertEqual(
            self.client.get(reverse("doctors-list")).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.post(reverse("doctors-list"), doctor_payload(
                registration_no="BMDC-A-59999"), format="json").status_code,
            status.HTTP_403_FORBIDDEN)

    def test_doctor_role_cannot_create_roster(self):
        self._auth(self.doctor_user)
        self.assertEqual(
            self.client.post(reverse("doctors-list"), doctor_payload(), format="json").status_code,
            status.HTTP_403_FORBIDDEN)

    def test_frontdesk_can_create_with_schedules(self):
        self._auth(self.receptionist)
        response = self.client.post(reverse("doctors-list"), doctor_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(len(body["data"]["schedules"]), 2)
        self.assertTrue(AuditLog.objects.filter(
            action="DOCTOR_CREATED", object_id=body["data"]["id"]).exists())

    def test_retrieve_update_and_audit(self):
        self._auth(self.receptionist)
        created = self.client.post(reverse("doctors-list"), doctor_payload(), format="json").json()["data"]
        self._auth(self.patient_user)
        response = self.client.get(reverse("doctors-detail", args=[created["id"]]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self._auth(self.receptionist)
        response = self.client.patch(
            reverse("doctors-detail", args=[created["id"]]),
            {"consultation_fee": "1500.00", "availability": "On Leave"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["data"]["availability"], "On Leave")
        self.assertTrue(AuditLog.objects.filter(
            action="DOCTOR_UPDATED", object_id=created["id"]).exists())

    def test_delete_and_audit(self):
        self._auth(self.receptionist)
        created = self.client.post(reverse("doctors-list"), doctor_payload(), format="json").json()["data"]
        response = self.client.delete(reverse("doctors-detail", args=[created["id"]]))
        self.assertIn(response.status_code, (status.HTTP_200_OK, status.HTTP_204_NO_CONTENT))
        self.assertTrue(AuditLog.objects.filter(
            action="DOCTOR_DELETED", object_id=created["id"]).exists())

    def test_duplicate_registration_no_rejected(self):
        self._auth(self.receptionist)
        self.client.post(reverse("doctors-list"), doctor_payload(), format="json")
        response = self.client.post(reverse("doctors-list"), doctor_payload(
            first_name="Other", phone="+8801713000099"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_linked_user_must_be_doctor_role(self):
        nurse = make_user("nurse@example.com", Role.NURSE)
        self._auth(self.receptionist)
        response = self.client.post(
            reverse("doctors-list"), doctor_payload(user=str(nurse.id)), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filtering(self):
        self._auth(self.receptionist)
        self.client.post(reverse("doctors-list"), doctor_payload(), format="json")
        self.client.post(reverse("doctors-list"), doctor_payload(
            first_name="Kamal", registration_no="BMDC-A-50002",
            specialization="Neurology", department="Neuro",
            phone="+8801713000002", availability="Off Duty",
            status="Inactive", schedules=[]), format="json")
        self.assertEqual(len(self.client.get(
            reverse("doctors-list"), {"specialization": "Neurology"}).json()["results"]), 1)
        self.assertEqual(len(self.client.get(
            reverse("doctors-list"), {"status": "Inactive"}).json()["results"]), 1)
        self.assertEqual(len(self.client.get(
            reverse("doctors-list"), {"availability": "Off Duty"}).json()["results"]), 1)
        self.assertEqual(len(self.client.get(
            reverse("doctors-list"), {"search": "Salma"}).json()["results"]), 1)
