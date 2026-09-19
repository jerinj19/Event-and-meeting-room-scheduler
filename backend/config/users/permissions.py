from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """
    Object-level permission: only the user who owns an object
    (object.user_id == request.user) may view/edit it.
    Used to enforce "users can only edit/cancel their own reservations".
    """

    def has_object_permission(self, request, view, obj):
        owner_id = getattr(obj, "user_id", None)
        return bool(request.user and owner_id == request.user.id)
