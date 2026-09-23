from unittest.mock import MagicMock, patch
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class MicrosoftSSOTests(APITestCase):
    def setUp(self):
        self.url = reverse("auth-microsoft")
        self.registered_email = "employee@innovyx.com"
        self.user = User.objects.create(
            email=self.registered_email,
            first_name="Jane",
            last_name="Doe",
            department="Engineering",
            is_active=True,
        )

    def test_missing_access_token_returns_400(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "MISSING_TOKEN")

    @patch("requests.get")
    def test_invalid_microsoft_token_returns_401(self, mock_get):
        mock_res = MagicMock()
        mock_res.status_code = 401
        mock_res.text = "Unauthorized"
        mock_get.return_value = mock_res

        response = self.client.post(self.url, {"access_token": "invalid-token"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"]["code"], "INVALID_MICROSOFT_TOKEN")

    @patch("requests.get")
    @override_settings(MICROSOFT_ALLOWED_DOMAINS=["innovyx.com"], MICROSOFT_REQUIRE_REGISTERED_USER=True)
    def test_disallowed_domain_returns_403_domain_not_allowed(self, mock_get):
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {
            "mail": "outsider@othercorp.com",
            "displayName": "Outsider",
        }
        mock_get.return_value = mock_res

        response = self.client.post(self.url, {"access_token": "valid-token-from-ms"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"]["code"], "DOMAIN_NOT_ALLOWED")
        self.assertEqual(response.data["error"]["domain"], "othercorp.com")
        self.assertIn("admin_contact", response.data["error"])

    @patch("requests.get")
    @override_settings(MICROSOFT_ALLOWED_DOMAINS=["innovyx.com"], MICROSOFT_REQUIRE_REGISTERED_USER=True)
    def test_unregistered_user_returns_403_user_not_registered(self, mock_get):
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {
            "mail": "unregistered@innovyx.com",
            "displayName": "Unregistered Person",
        }
        mock_get.return_value = mock_res

        response = self.client.post(self.url, {"access_token": "valid-token-from-ms"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"]["code"], "USER_NOT_REGISTERED")
        self.assertEqual(response.data["error"]["email"], "unregistered@innovyx.com")
        self.assertIn("admin_contact", response.data["error"])

    @patch("requests.get")
    @override_settings(MICROSOFT_ALLOWED_DOMAINS=["innovyx.com"], MICROSOFT_REQUIRE_REGISTERED_USER=True)
    def test_inactive_registered_user_returns_403(self, mock_get):
        self.user.is_active = False
        self.user.save()

        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {
            "mail": self.registered_email,
            "displayName": "Jane Doe",
        }
        mock_get.return_value = mock_res

        response = self.client.post(self.url, {"access_token": "valid-token-from-ms"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"]["code"], "USER_INACTIVE")

    @patch("requests.get")
    @override_settings(MICROSOFT_ALLOWED_DOMAINS=["innovyx.com"], MICROSOFT_REQUIRE_REGISTERED_USER=True)
    def test_registered_user_login_success(self, mock_get):
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {
            "mail": self.registered_email,
            "givenName": "Jane",
            "surname": "Doe",
            "displayName": "Jane Doe",
        }
        mock_get.return_value = mock_res

        response = self.client.post(self.url, {"access_token": "valid-token-from-ms"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], self.registered_email)
        self.assertEqual(response.data["user"]["first_name"], "Jane")
