from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os

from .serializers import EmailTokenObtainPairSerializer, RegisterSerializer, UserSerializer

token_generator = PasswordResetTokenGenerator()

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/"""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # If this is the very first user registering, make them an admin
        if User.objects.count() == 1:
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
        user.is_superuser = True
        user.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class EmailTokenObtainPairView(TokenObtainPairView):
    """POST /api/auth/token/ — email + password -> JWT access/refresh pair."""

    permission_classes = [permissions.AllowAny]
    serializer_class = EmailTokenObtainPairSerializer


class GoogleLoginView(APIView):
    """POST /api/auth/google/ — accepts an id_token, verifies it, creates/gets user, returns JWTs."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('id_token')
        if not token:
            return Response({'error': 'id_token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client_id = os.environ.get('GOOGLE_OAUTH2_CLIENT_ID', 'YOUR_GOOGLE_CLIENT_ID')
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)

            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            domain = email.split('@')[-1].lower() if email else ''
            from django.conf import settings
            if settings.ALLOWED_EMAIL_DOMAINS and domain not in settings.ALLOWED_EMAIL_DOMAINS:
                return Response({'error': 'Contact admin to get access, you are not from this organisation.'}, status=status.HTTP_403_FORBIDDEN)

            # Get or create user
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'department': 'Other'
                }
            )
            
            # If the user was created but didn't have a password set, they can't login via email yet, 
            # but they can login via Google.

            # Generate JWT tokens
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)

        except ValueError:
            return Response({'error': 'Invalid Google token'}, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    """GET/PATCH /api/auth/me/ — retrieve or update the authenticated user's profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        
        # Profile updates
        if 'first_name' in request.data:
            user.first_name = request.data['first_name']
        if 'last_name' in request.data:
            user.last_name = request.data['last_name']
        if 'department' in request.data:
            user.department = request.data['department']
            
        # Password update
        if 'old_password' in request.data and 'new_password' in request.data:
            if not user.check_password(request.data['old_password']):
                return Response({"error": "Incorrect old password."}, status=status.HTTP_400_BAD_REQUEST)
            if 'confirm_new_password' in request.data and request.data['new_password'] != request.data['confirm_new_password']:
                return Response({"error": "New passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(request.data['new_password'])
            
        user.save()
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    def delete(self, request):
        user = request.user
        if getattr(user, 'is_owner', False):
            return Response(
                {"error": "The system owner cannot delete their account. Transfer ownership first."},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ForgotPasswordView(APIView):
    """POST /api/auth/forgot-password/ — sends a reset link to the user's email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Return 200 to prevent email enumeration
            return Response({"message": "If an account with this email exists, a reset link has been sent."}, status=status.HTTP_200_OK)
            
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = token_generator.make_token(user)
        
        # Hardcoding frontend URL for demonstration
        reset_url = f"http://localhost:5173/reset-password?uid={uidb64}&token={token}"
        
        send_mail(
            subject='Reset Your Password',
            message=f'Click the following link to reset your password: {reset_url}',
            from_email='noreply@example.com',
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        return Response({"message": "If an account with this email exists, a reset link has been sent."}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """POST /api/auth/reset-password/ — validates token and sets new password."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')
        
        if not all([uidb64, token, password, confirm_password]):
            return Response({"error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)
            
        if password != confirm_password:
            return Response({"error": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"error": "Invalid reset link."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not token_generator.check_token(user, token):
            return Response({"error": "Invalid or expired reset link."}, status=status.HTTP_400_BAD_REQUEST)
            
        user.set_password(password)
        user.save()
        
        return Response({"message": "Password successfully reset."}, status=status.HTTP_200_OK)


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

class UserListView(generics.ListAPIView):
    """GET /api/users/ — Returns all users, filterable by ?role=admin"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        queryset = User.objects.all().order_by('email')
        role = self.request.query_params.get("role")
        if role == "admin":
            queryset = queryset.filter(is_staff=True)
        elif role == "user":
            queryset = queryset.filter(is_staff=False)
        return queryset

class UserUpdateView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH /api/users/<id>/ — Updates a user (e.g. promoting to admin)"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Don't allow users to demote themselves to prevent lockouts
        system_owner = User.objects.filter(is_owner=True).first()

        # Restrict role management (is_staff) and blocking (is_active) to the system owner
        if 'is_staff' in request.data or 'is_active' in request.data:
            if request.user.id != system_owner.id:
                return Response(
                    {"error": "Only the System Owner can manage roles or block users."},
                    status=status.HTTP_403_FORBIDDEN
                )

        if 'is_active' in request.data and not request.data['is_active']:
            if instance.id == request.user.id:
                return Response({"error": "You cannot block yourself."}, status=status.HTTP_400_BAD_REQUEST)
            if instance.id == system_owner.id:
                return Response({"error": "You cannot block the system owner."}, status=status.HTTP_400_BAD_REQUEST)

        if 'is_staff' in request.data and not request.data['is_staff']:
            if instance.id == request.user.id:
                return Response(
                    {"error": "You cannot demote yourself."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if instance.id == system_owner.id:
                return Response(
                    {"error": "You cannot demote the system owner."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Allow updating is_staff and is_superuser
        if 'is_staff' in request.data:
            instance.is_staff = request.data['is_staff']
            instance.is_superuser = request.data['is_staff']
            
        if 'is_active' in request.data:
            instance.is_active = request.data['is_active']
            
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        system_owner = User.objects.filter(is_owner=True).first()

        if request.user.id != system_owner.id:
            return Response(
                {"error": "Only the System Owner can delete users."},
                status=status.HTTP_403_FORBIDDEN
            )

        if instance.id == request.user.id:
            return Response({"error": "You cannot delete yourself."}, status=status.HTTP_400_BAD_REQUEST)

        if instance.id == system_owner.id:
            return Response({"error": "You cannot delete the system owner."}, status=status.HTTP_400_BAD_REQUEST)

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TransferOwnershipView(APIView):
    """PATCH /api/users/transfer-ownership/ — transfers system ownership to another admin."""
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request):
        current_owner = User.objects.filter(is_owner=True).first()
        
        if request.user.id != current_owner.id:
            return Response(
                {"error": "Only the current System Owner can transfer ownership."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        new_owner_id = request.data.get("new_owner_id")
        if not new_owner_id:
            return Response({"error": "new_owner_id is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            new_owner = User.objects.get(id=new_owner_id, is_staff=True)
        except User.DoesNotExist:
            return Response({"error": "Invalid user or user is not an administrator."}, status=status.HTTP_400_BAD_REQUEST)
            
        if current_owner.id == new_owner.id:
            return Response({"error": "You are already the owner."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Swap ownership
        current_owner.is_owner = False
        new_owner.is_owner = True
        current_owner.save()
        new_owner.save()
        
        return Response({"message": f"Ownership successfully transferred to {new_owner.email}."}, status=status.HTTP_200_OK)
