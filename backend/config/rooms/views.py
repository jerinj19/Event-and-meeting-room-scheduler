from django.db.models import Q
from rest_framework import parsers, permissions, viewsets
from rest_framework.exceptions import ValidationError

from .models import Room
from .permissions import IsAdminOrReadOnly
from .serializers import RoomSerializer


class RoomViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing meeting rooms and spaces:
    - GET /api/rooms/: List rooms with query filters (min_capacity, max_capacity, location, amenity, search, is_active).
    - POST /api/rooms/: Create a new room (Staff/Admin only).
    - GET /api/rooms/{id}/: Retrieve room details.
    - PUT / PATCH /api/rooms/{id}/: Update room (Staff/Admin only).
    - DELETE /api/rooms/{id}/: Delete room (Staff/Admin only).
    """

    queryset = Room.objects.select_related("created_by").order_by("name")
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        queryset = Room.objects.select_related("created_by").order_by("name")

        # By default, non-staff users only see active rooms unless specified
        is_active_param = self.request.query_params.get("is_active")
        if is_active_param is not None:
            if is_active_param.lower() in ["true", "1"]:
                queryset = queryset.filter(is_active=True)
            elif is_active_param.lower() in ["false", "0"]:
                queryset = queryset.filter(is_active=False)
        elif not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)

        # Filter by min_capacity
        min_capacity = self.request.query_params.get("min_capacity")
        if min_capacity:
            try:
                min_cap_int = int(min_capacity)
                queryset = queryset.filter(capacity__gte=min_cap_int)
            except ValueError:
                raise ValidationError({"min_capacity": "Must be an integer."})

        # Filter by max_capacity
        max_capacity = self.request.query_params.get("max_capacity")
        if max_capacity:
            try:
                max_cap_int = int(max_capacity)
                queryset = queryset.filter(capacity__lte=max_cap_int)
            except ValueError:
                raise ValidationError({"max_capacity": "Must be an integer."})

        # Filter by location (case-insensitive contains)
        location = self.request.query_params.get("location")
        if location:
            queryset = queryset.filter(location__icontains=location.strip())

        # Filter by amenity (case-insensitive substring in JSON serialized list)
        amenity = self.request.query_params.get("amenity")
        if amenity:
            queryset = queryset.filter(amenities__icontains=amenity.strip())

        # General search keyword in name or location
        search = self.request.query_params.get("search")
        if search:
            search = search.strip()
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(location__icontains=search)
            )

        return queryset
