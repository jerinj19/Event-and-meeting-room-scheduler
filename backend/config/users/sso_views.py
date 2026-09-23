import json
import logging
import urllib.request
from urllib.error import HTTPError, URLError
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import UserSerializer

try:
    import requests
except ImportError:
    requests = None

logger = logging.getLogger("users.api")
User = get_user_model()


def fetch_microsoft_profile(ms_token: str):
    """
    Fetches the user's profile from Microsoft Graph API.
    Uses requests if available, with a standard-library urllib fallback.
    Returns (status_code, profile_dict_or_None).
    """
    if requests is not None:
        res = requests.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {ms_token}"},
            timeout=10,
        )
        if res.status_code != 200:
            return res.status_code, None
        return 200, res.json()

    # Fallback using Python standard library
    req = urllib.request.Request(
        "https://graph.microsoft.com/v1.0/me",
        headers={"Authorization": f"Bearer {ms_token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                return 200, data
            return response.status, None
    except HTTPError as e:
        return e.code, None
    except URLError as e:
        raise ConnectionError(f"Network error contacting Microsoft: {e}") from e


class MicrosoftAuthView(APIView):
    """
    POST /api/auth/microsoft/
    Authenticates a user via their Microsoft 365 / Entra ID access token.
    Enforces organization domain restrictions and user pre-registration rules.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        ms_token = request.data.get("access_token")
        if not ms_token:
            return Response(
                {
                    "error": {
                        "code": "MISSING_TOKEN",
                        "message": "Microsoft access token is required.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. Verify token with Microsoft Graph API
        try:
            status_code, profile = fetch_microsoft_profile(ms_token)
        except Exception as e:
            logger.error("Error communicating with Microsoft Graph API: %s", str(e))
            return Response(
                {
                    "error": {
                        "code": "GRAPH_SERVICE_UNAVAILABLE",
                        "message": "Unable to communicate with Microsoft identity services. Please try again.",
                    }
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if status_code != 200 or not profile:
            logger.warning("Microsoft Graph authentication failed with status %s", status_code)
            return Response(
                {
                    "error": {
                        "code": "INVALID_MICROSOFT_TOKEN",
                        "message": "The Microsoft access token is invalid or has expired.",
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        raw_email = profile.get("mail") or profile.get("userPrincipalName", "")
        email = raw_email.strip().lower()

        if not email or "@" not in email:
            return Response(
                {
                    "error": {
                        "code": "MISSING_EMAIL",
                        "message": "Unable to retrieve a verified email address from your Microsoft profile.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        domain = email.split("@")[1]
        admin_contact = getattr(settings, "ADMIN_CONTACT_EMAIL", "admin@innovyx.com")

        # 2. Check Allowed Domains (if configured)
        allowed_domains = getattr(settings, "MICROSOFT_ALLOWED_DOMAINS", [])
        if allowed_domains and domain not in allowed_domains:
            logger.warning("Microsoft SSO domain restriction triggered for domain %s (email: %s)", domain, email)
            return Response(
                {
                    "error": {
                        "code": "DOMAIN_NOT_ALLOWED",
                        "message": f"The domain '@{domain}' is not authorized to access this workspace.",
                        "email": email,
                        "domain": domain,
                        "admin_contact": admin_contact,
                    }
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # 3. Check User Registration in Database
        user = User.objects.filter(email__iexact=email).first()
        require_registered = getattr(settings, "MICROSOFT_REQUIRE_REGISTERED_USER", True)

        if require_registered and not user:
            logger.warning("Microsoft SSO user not registered: %s", email)
            return Response(
                {
                    "error": {
                        "code": "USER_NOT_REGISTERED",
                        "message": "Your Microsoft account is not registered in this system. Please contact your system administrator to gain access.",
                        "email": email,
                        "admin_contact": admin_contact,
                    }
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # 4. Check if existing user is active
        if user and not user.is_active:
            logger.warning("Microsoft SSO attempted for inactive user: %s", email)
            return Response(
                {
                    "error": {
                        "code": "USER_INACTIVE",
                        "message": "Your user account is currently deactivated. Please contact your administrator.",
                        "email": email,
                        "admin_contact": admin_contact,
                    }
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # 5. Auto-provision user if registration is not strictly required
        if not user:
            first_name = profile.get("givenName") or profile.get("displayName", "").split(" ")[0] or "User"
            last_name = profile.get("surname") or ""
            department = profile.get("jobTitle") or profile.get("department") or ""

            user = User.objects.create(
                email=email,
                first_name=first_name,
                last_name=last_name,
                department=department,
                is_active=True,
            )
            user.set_unusable_password()
            user.save()
            logger.info("Auto-provisioned new user via Microsoft SSO: %s", email)
        else:
            # Update missing first/last name if available from Microsoft
            updated = False
            if not user.first_name and profile.get("givenName"):
                user.first_name = profile["givenName"]
                updated = True
            if not user.last_name and profile.get("surname"):
                user.last_name = profile["surname"]
                updated = True
            if updated:
                user.save()

        # 6. Generate SimpleJWT access & refresh tokens
        refresh = RefreshToken.for_user(user)
        refresh["email"] = user.email
        refresh["full_name"] = user.full_name

        logger.info("Microsoft SSO login successful for user: %s", email)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )
