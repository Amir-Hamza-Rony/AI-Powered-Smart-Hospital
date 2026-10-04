"""RBAC tests: admin-only user management and role permission classes."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User


def make_user(email, role, password="StrongPass123"):
    names = email.split("@")[0].split(".")
    first = (names[0] if names else "Test").capitalize()
    return User.objects.create_user(email=email, password=password, first_name=first,
                                    last_name="User", role=role)


class UserManagementPermissionTests(APITestCase):
    def setUp(self):
        self.admin = make_user("admin@example.com", Role.SUPER_ADMIN)
        self.admin.is_staff = True
        self.admin.is_superuser = True
        self.admin.save()
        self.doctor = make_user("doctor@example.com", Role.DOCTOR)
        self.patient = make_user("patient@example.com", Role.PATIENT)

    def _token(self, email):
        response = self.client.post(reverse("auth-login"), {"email": email, "password": "StrongPass123"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.json()["data"]["access"]

    def test_unauthenticated_cannot_list_users(self):
        response = self.client.get(reverse("users-list"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patient_cannot_access_admin_endpoints(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._token('patient@example.com')}")
        self.assertEqual(self.client.get(reverse("users-list")).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.get(reverse("users-detail", args=[str(self.admin.id)])).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_doctor_cannot_manage_users(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._token('doctor@example.com')}")
        self.assertEqual(self.client.get(reverse("users-list")).status_code, status.HTTP_403_FORBIDDEN)
        response = self.client.post(reverse("users-list"), {
            "first_name": "No", "last_name": "Way", "email": "noway@example.com",
            "password": "StrongPass123", "role": Role.NURSE,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_manage_users(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._token('admin@example.com')}")
        listing = self.client.get(reverse("users-list"))
        self.assertEqual(listing.status_code, status.HTTP_200_OK)

        created = self.client.post(reverse("users-list"), {
            "first_name": "New", "last_name": "Nurse", "email": "nurse@example.com",
            "password": "StrongPass123", "role": Role.NURSE,
        }, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertTrue(created.json()["success"])
        nurse = User.objects.get(email="nurse@example.com")
        self.assertEqual(nurse.role, Role.NURSE)

        detail = self.client.get(reverse("users-detail", args=[str(nurse.id)]))
        self.assertEqual(detail.status_code, status.HTTP_200_OK)

        patched = self.client.patch(reverse("users-detail", args=[str(nurse.id)]),
                                    {"phone": "+8801722222222"}, format="json")
        self.assertEqual(patched.status_code, status.HTTP_200_OK)

        filtered = self.client.get(reverse("users-list") + "?role=NURSE&search=nurse")
        self.assertEqual(filtered.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(filtered.json()["count"], 1)

        deleted = self.client.delete(reverse("users-detail", args=[str(nurse.id)]))
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(email="nurse@example.com").exists())

    def test_admin_cannot_deactivate_or_delete_self(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._token('admin@example.com')}")
        url = reverse("users-detail", args=[str(self.admin.id)])
        self.assertEqual(self.client.patch(url, {"is_active": False}, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_400_BAD_REQUEST)
