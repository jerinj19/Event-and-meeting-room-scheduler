from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission class ensuring:
    1. Only authenticated users can access any rooms endpoint (safe methods allowed for authenticated users).
    2. Only staff/admin users can perform write operations (POST, PUT, PATCH, DELETE).
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        return bool(request.user.is_staff or request.user.is_superuser)
