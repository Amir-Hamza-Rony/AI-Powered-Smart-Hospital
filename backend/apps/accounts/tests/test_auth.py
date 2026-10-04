"""Authentication flow tests: register, login, refresh, me, update."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.audit.models import AuditLog


class AuthFlowTests(APITestCase):
    def test_register_creates_patient(self):
        url = reverse("auth-register")
        payload = {
            "first_name": "Test",
            "last_name": "Patient",
            "email": "patient@example.com",
            "phone": "+8801711000000",
            "password": "StrongPass123",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["role"], Role.PATIENT)
        self.assertNotIn("password", body["data"])
        user = User.objects.get(email="patient@example.com")
        self.assertTrue(user.check_password("StrongPass123"))
        self.assertTrue(AuditLog.objects.filter(action="USER_CREATED", object_id=str(user.id)).exists())

    def test_register_rejects_duplicate_email(self):
        User.objects.create_user(email="dup@example.com", password="StrongPass123",
                                 first_name="A", last_name="B")
        response = self.client.post(reverse("auth-register"), {
            "first_name": "A", "last_name": "B",
            "email": "DUP@example.com", "password": "StrongPass123",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.json()["success"])

    def test_register_rejects_weak_password(self):
        response = self.client.post(reverse("auth-register"), {
            "first_name": "A", "last_name": "B", "email": "weak@example.com", "password": "123",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_tokens_and_user(self):
        User.objects.create_user(email="doc@example.com", password="StrongPass123",
                                 first_name="Doc", last_name="Tor", role=Role.DOCTOR)
        response = self.client.post(reverse("auth-login"), {
            "email": "doc@example.com", "password": "StrongPass123",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertIn("access", body["data"])
        self.assertIn("refresh", body["data"])
        self.assertEqual(body["data"]["user"]["role"], "DOCTOR")
        self.assertNotIn("password", body["data"]["user"])
        self.assertTrue(AuditLog.objects.filter(action="LOGIN").exists())
        self.refresh_token = body["data"]["refresh"]
        self.access_token = body["data"]["access"]

    def test_invalid_login_rejected(self):
        User.objects.create_user(email="doc@example.com", password="StrongPass123",
                                 first_name="Doc", last_name="Tor")
        response = self.client.post(reverse("auth-login"), {
            "email": "doc@example.com", "password": "WrongPass999",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.json()["success"])

    def test_inactive_user_cannot_login(self):
        user = User.objects.create_user(email="off@example.com", password="StrongPass123",
                                        first_name="O", last_name="Ff")
        user.is_active = False
        user.save()
        response = self.client.post(reverse("auth-login"), {
            "email": "off@example.com", "password": "StrongPass123",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        user = User.objects.create_user(email="r@example.com", password="StrongPass123",
                                        first_name="R", last_name="R")
        login = self.client.post(reverse("auth-login"), {"email": "r@example.com", "password": "StrongPass123"}, format="json")
        refresh = login.json()["data"]["refresh"]
        response = self.client.post(reverse("auth-refresh"), {"refresh": refresh}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["success"])
        self.assertIn("access", response.json()["data"])

    def test_invalid_refresh_rejected(self):
        response = self.client.post(reverse("auth-refresh"), {"refresh": "invalid.token.here"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_requires_authentication(self):
        response = self.client.get(reverse("auth-me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.json()["success"])

    def test_me_and_update(self):
        user = User.objects.create_user(email="me@example.com", password="StrongPass123",
                                        first_name="Me", last_name="You", phone="+8801700000000")
        login = self.client.post(reverse("auth-login"), {"email": "me@example.com", "password": "StrongPass123"}, format="json")
        token = login.json()["data"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        me = self.client.get(reverse("auth-me"))
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.json()["data"]["email"], "me@example.com")

        patch = self.client.patch(reverse("users-me"), {"phone": "+8801711111111", "role": "DOCTOR"}, format="json")
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.phone, "+8801711111111")
        self.assertEqual(user.role, Role.PATIENT)  # role change via self-service is ignored
        self.assertTrue(AuditLog.objects.filter(action="USER_UPDATED", object_id=str(user.id)).exists())

    def test_logout_blacklists_refresh_token(self):
        User.objects.create_user(email="out@example.com", password="StrongPass123",
                                 first_name="O", last_name="U")
        login = self.client.post(reverse("auth-login"), {"email": "out@example.com", "password": "StrongPass123"}, format="json")
        tokens = login.json()["data"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        logout = self.client.post(reverse("auth-logout"), {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(logout.status_code, status.HTTP_200_OK)
        self.assertTrue(AuditLog.objects.filter(action="LOGOUT").exists())
        # Reusing the refresh token must now fail.
        again = self.client.post(reverse("auth-refresh"), {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(again.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_requires_refresh_token(self):
        user = User.objects.create_user(email="out2@example.com", password="StrongPass123",
                                        first_name="O", last_name="U")
        login = self.client.post(reverse("auth-login"), {"email": "out2@example.com", "password": "StrongPass123"}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.json()['data']['access']}")
        response = self.client.post(reverse("auth-logout"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.json()["success"])
