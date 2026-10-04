"""Patient API tests: CRUD, validation, deduplication, filtering, permissions."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.audit.models import AuditLog
from apps.patients.models import Patient


def make_user(email, role, staff=False, superuser=False):
    user = User.objects.create_user(
        email=email, password="StrongPass123", first_name="Test",
        last_name="User", role=role, is_staff=staff, is_superuser=superuser)
    return user


def patient_payload(**overrides):
    data = {
        "first_name": "Rahim", "last_name": "Uddin",
        "date_of_birth": "1990-03-14", "gender": "Male", "blood_group": "B+",
        "phone": "+8801712000001", "email": "rahim@example.com",
        "nid": "199003145511", "address": "Dhaka",
        "emergency_contact": "Karim", "emergency_phone": "+8801712000002",
        "allergies": ["Penicillin"], "chronic_conditions": ["Diabetes"],
        "medical_history": "None", "notes": "", "status": "Active",
    }
    data.update(overrides)
    return data


class PatientApiTests(APITestCase):
    def setUp(self):
        self.staff = make_user("staff@example.com", Role.RECEPTIONIST)
        self.patient_user = make_user("patient@example.com", Role.PATIENT)

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_unauthenticated_cannot_list(self):
        self.assertEqual(
            self.client.get(reverse("patients-list")).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patient_role_cannot_create(self):
        self._auth(self.patient_user)
        response = self.client.post(reverse("patients-list"), patient_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authenticated_can_list_and_retrieve(self):
        Patient.objects.create(**{**patient_payload(), "nid": "199003145512",
                                                   "phone": "+8801712000011",
                                                   "date_of_birth": "1990-03-14"})
        self._auth(self.patient_user)
        response = self.client.get(reverse("patients-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self._auth(self.staff)
        patient_id = Patient.objects.first().id
        response = self.client.get(reverse("patients-detail", args=[str(patient_id)]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["success"])

    def test_staff_can_create_patient(self):
        self._auth(self.staff)
        response = self.client.post(reverse("patients-list"), patient_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["name"], "Rahim Uddin")
        self.assertTrue(AuditLog.objects.filter(
            action="PATIENT_CREATED", object_id=body["data"]["id"]).exists())

    def test_update_and_audit(self):
        self._auth(self.staff)
        created = self.client.post(reverse("patients-list"), patient_payload(), format="json").json()["data"]
        response = self.client.patch(
            reverse("patients-detail", args=[created["id"]]), {"notes": "Follow-up"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(AuditLog.objects.filter(
            action="PATIENT_UPDATED", object_id=created["id"]).exists())

    def test_delete_and_audit(self):
        self._auth(self.staff)
        created = self.client.post(reverse("patients-list"), patient_payload(), format="json").json()["data"]
        response = self.client.delete(reverse("patients-detail", args=[created["id"]]))
        self.assertIn(response.status_code, (status.HTTP_200_OK, status.HTTP_204_NO_CONTENT))
        self.assertTrue(AuditLog.objects.filter(
            action="PATIENT_DELETED", object_id=created["id"]).exists())

    def test_duplicate_nid_rejected(self):
        self._auth(self.staff)
        self.assertEqual(
            self.client.post(reverse("patients-list"), patient_payload(), format="json").status_code,
            status.HTTP_201_CREATED)
        response = self.client.post(
            reverse("patients-list"), patient_payload(phone="+8801712000099"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_phone_rejected(self):
        self._auth(self.staff)
        self.client.post(reverse("patients-list"), patient_payload(), format="json")
        response = self.client.post(
            reverse("patients-list"), patient_payload(nid="199003149999"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_future_dob_rejected(self):
        self._auth(self.staff)
        response = self.client.post(
            reverse("patients-list"), patient_payload(date_of_birth="2990-01-01"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filtering(self):
        self._auth(self.staff)
        self.client.post(reverse("patients-list"), patient_payload(), format="json")
        self.client.post(reverse("patients-list"), patient_payload(
            first_name="Ayesha", phone="+8801712000021", nid="199003145522",
            gender="Female", status="Critical"), format="json")
        self.assertEqual(len(self.client.get(
            reverse("patients-list"), {"gender": "Female"}).json()["results"]), 1)
        self.assertEqual(len(self.client.get(
            reverse("patients-list"), {"status": "Critical"}).json()["results"]), 1)
        self.assertEqual(len(self.client.get(
            reverse("patients-list"), {"search": "Ayesha"}).json()["results"]), 1)
        self.assertEqual(len(self.client.get(
            reverse("patients-list"), {"search": "199003145511"}).json()["results"]), 1)
