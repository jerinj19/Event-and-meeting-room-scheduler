from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class AuthenticationTests(APITestCase):
	password = 'A-secure-test-password-123'

	def setUp(self):
		self.user = User.objects.create_user(
			email='member@example.com',
			password=self.password,
			first_name='Test',
			last_name='Member',
		)

	def test_registration_creates_user_without_returning_password(self):
		response = self.client.post(
			reverse('auth-register'),
			{
				'email': 'new@example.com',
				'first_name': 'New',
				'last_name': 'Member',
				'department': 'Engineering',
				'password': self.password,
				'confirm_password': self.password,
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertTrue(User.objects.filter(email='new@example.com').exists())
		self.assertNotIn('password', response.data)

	def test_registration_rejects_duplicate_email_case_insensitively(self):
		response = self.client.post(
			reverse('auth-register'),
			{
				'email': 'MEMBER@example.com',
				'first_name': 'Duplicate',
				'last_name': 'Member',
				'password': self.password,
				'confirm_password': self.password,
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data['error']['code'], 'VALIDATION_ERROR')
		self.assertIn('email', response.data['error']['details'])

	def test_registration_validation_returns_error_envelope(self):
		response = self.client.post(
			reverse('auth-register'),
			{'email': 'invalid-email'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data['error']['code'], 'VALIDATION_ERROR')
		self.assertEqual(response.data['error']['message'], 'Request validation failed.')
		self.assertIn('first_name', response.data['error']['details'])

	def test_login_returns_jwt_pair_and_user_payload(self):
		response = self.client.post(
			reverse('auth-token'),
			{'email': self.user.email, 'password': self.password},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('access', response.data)
		self.assertIn('refresh', response.data)
		self.assertEqual(response.data['user']['email'], self.user.email)

	def test_login_failure_returns_unauthorized_error_envelope(self):
		response = self.client.post(
			reverse('auth-token'),
			{'email': self.user.email, 'password': 'wrong-password'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
		self.assertEqual(response.data['error']['code'], 'UNAUTHORIZED')
		self.assertTrue(response.data['error']['message'])

	def test_me_requires_jwt_and_returns_authenticated_user(self):
		unauthenticated_response = self.client.get(reverse('auth-me'))
		self.assertEqual(unauthenticated_response.status_code, status.HTTP_401_UNAUTHORIZED)
		self.assertEqual(unauthenticated_response.data['error']['code'], 'UNAUTHORIZED')

		login_response = self.client.post(
			reverse('auth-token'),
			{'email': self.user.email, 'password': self.password},
			format='json',
		)
		self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

		response = self.client.get(reverse('auth-me'))

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['id'], str(self.user.id))
		self.assertEqual(response.data['email'], self.user.email)

	def test_unknown_api_route_returns_not_found_error_envelope(self):
		response = self.client.get('/api/auth/does-not-exist/')

		self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
		self.assertEqual(response.json()['error']['code'], 'NOT_FOUND')
		self.assertEqual(
			response.json()['error']['message'],
			'The requested resource was not found.',
		)

	def test_refresh_returns_new_access_token(self):
		login_response = self.client.post(
			reverse('auth-token'),
			{'email': self.user.email, 'password': self.password},
			format='json',
		)

		response = self.client.post(
			reverse('auth-token-refresh'),
			{'refresh': login_response.data['refresh']},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('access', response.data)

	def test_logout_blacklists_refresh_token(self):
		login_response = self.client.post(
			reverse('auth-token'),
			{'email': self.user.email, 'password': self.password},
			format='json',
		)
		access_token = login_response.data['access']
		refresh_token = login_response.data['refresh']

		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
		logout_response = self.client.post(
			reverse('auth-logout'),
			{'refresh': refresh_token},
			format='json',
		)
		self.assertEqual(logout_response.status_code, status.HTTP_205_RESET_CONTENT)

		# Attempting to refresh the blacklisted token must fail with 401
		self.client.credentials()
		refresh_response = self.client.post(
			reverse('auth-token-refresh'),
			{'refresh': refresh_token},
			format='json',
		)
		self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_logout_without_refresh_token_returns_400(self):
		login_response = self.client.post(
			reverse('auth-token'),
			{'email': self.user.email, 'password': self.password},
			format='json',
		)
		self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")
		response = self.client.post(reverse('auth-logout'), {}, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

	def test_logout_unauthenticated_returns_401(self):
		response = self.client.post(reverse('auth-logout'), {'refresh': 'any'}, format='json')
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

