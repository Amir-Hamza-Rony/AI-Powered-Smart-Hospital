"""API root index tests: GET /api/ is public and docs endpoints keep working."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class ApiRootTests(APITestCase):
    def test_api_root_returns_index_without_auth(self):
        response = self.client.get(reverse("api-root"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["name"], "Smart Hospital API")
        links = body["data"]["links"]
        for key in ("auth", "users", "audit", "schema", "docs", "redoc"):
            self.assertIn(key, links)

    def test_docs_schema_redoc_still_available(self):
        self.assertEqual(self.client.get(reverse("api-schema")).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(reverse("api-docs")).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(reverse("api-redoc")).status_code, status.HTTP_200_OK)
