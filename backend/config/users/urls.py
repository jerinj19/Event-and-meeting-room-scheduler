from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    EmailTokenObtainPairView, 
    RegisterView, 
    LogoutView, 
    UserListView, 
    UserUpdateView, 
    MeView,
    CreateAdminView,
    ForgotPasswordView,
    ResetPasswordView,
    TransferOwnershipView
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/create-admin/", CreateAdminView.as_view(), name="auth-create-admin"),
    path("auth/token/", EmailTokenObtainPairView.as_view(), name="auth-token"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    
    path("users/", UserListView.as_view(), name="user-list"),
    path("users/transfer-ownership/", TransferOwnershipView.as_view(), name="user-transfer-ownership"),
    path("users/<uuid:pk>/", UserUpdateView.as_view(), name="user-update"),
]
