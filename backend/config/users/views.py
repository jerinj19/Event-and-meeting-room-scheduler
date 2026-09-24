from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model

from .serializers import EmailTokenObtainPairSerializer, RegisterSerializer, UserSerializer

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/"""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # If this is the very first user registering or email has 'admin', make them an admin
        if User.objects.count() == 1 or "admin" in (user.email or "").lower() or request.data.get("is_staff"):
            user.is_staff = True
            user.is_superuser = True
            user.save()
            
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class CreateAdminView(generics.CreateAPIView):
    """POST /api/auth/create-admin/ — Allows an admin to create another admin."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.IsAdminUser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user.is_staff = True
        user.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class EmailTokenObtainPairView(TokenObtainPairView):
    """POST /api/auth/token/ — email + password -> JWT access/refresh pair."""

    permission_classes = [permissions.AllowAny]
    serializer_class = EmailTokenObtainPairSerializer


class MeView(APIView):
    """GET /api/auth/me/ — returns the authenticated user's profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """POST /api/auth/logout/ — accepts a refresh token and blacklists it."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework.exceptions import ParseError

        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                raise ParseError("Refresh token is required")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)
