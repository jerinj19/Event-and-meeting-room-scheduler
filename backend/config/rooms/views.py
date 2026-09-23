from django.db.models import Q
from rest_framework import parsers, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

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
    - GET /api/rooms/gallery/: Distinct previously uploaded room images.
    """

    queryset = Room.objects.select_related("created_by").order_by("name")
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="gallery")
    def gallery(self, request):
        """
        Return a list of distinct previously uploaded room images for reuse.
        """
        rooms_with_images = Room.objects.exclude(image="").exclude(image__isnull=True).order_by("-updated_at")
        seen_urls = set()
        gallery_items = []
        for r in rooms_with_images:
            if r.image:
                url = request.build_absolute_uri(r.image.url)
                if url not in seen_urls:
                    seen_urls.add(url)
                    gallery_items.append({
                        "id": str(r.id),
                        "room_name": r.name,
                        "image_url": url,
                    })
        return Response(gallery_items)

    @action(detail=False, methods=["post"], url_path="notify-maintenance")
    def notify_maintenance(self, request):
        """
        Scan for CONFIRMED bookings in inactive rooms that haven't ended yet
        and send an email notification to the host (user).
        """
        from django.utils import timezone
        from bookings.models import Booking
        from django.core.mail import send_mail

        now = timezone.now()
        affected_bookings = Booking.objects.filter(
            room__is_active=False,
            status='CONFIRMED',
            end_time__gt=now
        ).select_related('user', 'room')

        notified_users = set()
        count = 0

        for booking in affected_bookings:
            user = booking.user
            if user.email not in notified_users:
                send_mail(
                    subject='Urgent: Room Maintenance Alert',
                    message=f'Hello {user.first_name},\n\nThe room "{booking.room.name}" you have booked is currently offline for maintenance. Please reschedule your upcoming bookings or contact an administrator.\n\nThank you,\nAdmin Team',
                    from_email=None,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
                notified_users.add(user.email)
                count += 1

        return Response({"message": f"Successfully notified {count} hosts about maintenance conflicts.", "notified_count": count})

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

        # Filter by min_rate / max_rate
        min_rate = self.request.query_params.get("min_rate")
        if min_rate:
            try:
                queryset = queryset.filter(hourly_rate__gte=float(min_rate))
            except ValueError:
                raise ValidationError({"min_rate": "Must be a valid number."})

        max_rate = self.request.query_params.get("max_rate")
        if max_rate:
            try:
                queryset = queryset.filter(hourly_rate__lte=float(max_rate))
            except ValueError:
                raise ValidationError({"max_rate": "Must be a valid number."})

        # General search keyword in name or location
        search = self.request.query_params.get("search")
        if search:
            search = search.strip()
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(location__icontains=search)
            )

        return queryset
