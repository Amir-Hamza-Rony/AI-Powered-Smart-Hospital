"""Audit trail tests: creation on auth/user events, admin-only read, no writes."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.audit.models import AuditLog


class AuditLogTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password="StrongPass123", first_name="Ad", last_name="Min")
        self.patient = User.objects.create_user(
            email="patient@example.com", password="StrongPass123",
            first_name="Pa", last_name="Tient", role=Role.PATIENT)

    def _token(self, email):
        response = self.client.post(reverse("auth-login"), {"email": email, "password": "StrongPass123"}, format="json")
        return response.json()["data"]["access"]

    def test_login_creates_audit_entry(self):
        self.client.post(reverse("auth-login"), {"email": "patient@example.com", "password": "StrongPass123"}, format="json")
        entry = AuditLog.objects.filter(action="LOGIN").order_by("-created_at").first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.user, self.patient)
        self.assertEqual(entry.module, "auth")

    def test_user_crud_creates_audit_entries(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._token('admin@example.com')}")
        created = self.client.post(reverse("users-list"), {
            "first_name": "Tmp", "last_name": "User", "email": "tmp@example.com",
            "password": "StrongPass123", "role": Role.RECEPTIONIST,
        }, format="json")
        uid = User.objects.get(email="tmp@example.com").id
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertTrue(AuditLog.objects.filter(action="USER_CREATED", object_id=str(uid)).exists())

        self.client.patch(reverse("users-detail", args=[str(uid)]), {"phone": "+8801733333333"}, format="json")
        self.assertTrue(AuditLog.objects.filter(action="USER_UPDATED", object_id=str(uid)).exists())

        self.client.delete(reverse("users-detail", args=[str(uid)]))
        self.assertTrue(AuditLog.objects.filter(action="USER_DELETED", object_id=str(uid)).exists())

    def test_audit_list_admin_only(self):
        self.assertEqual(self.client.get(reverse("audit-list")).status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._token('patient@example.com')}")
        self.assertEqual(self.client.get(reverse("audit-list")).status_code, status.HTTP_403_FORBIDDEN)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._token('admin@example.com')}")
        response = self.client.get(reverse("audit-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_audit_has_no_write_endpoints(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._token('admin@example.com')}")
        entry = AuditLog.objects.create(user=self.admin, action="LOGIN", module="auth", description="seed")
        base = reverse("audit-list")
        self.assertEqual(self.client.post(base, {}, format="json").status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.put(f"{base}{entry.id}/", {}, format="json").status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.patch(f"{base}{entry.id}/", {}, format="json").status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.delete(f"{base}{entry.id}/").status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
