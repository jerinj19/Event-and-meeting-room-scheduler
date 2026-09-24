from django.db.models import Q
from rest_framework import parsers, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import Room, RoomImage
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

    queryset = Room.objects.select_related("created_by").prefetch_related("images").order_by("name")
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def perform_create(self, serializer):
        room = serializer.save(created_by=self.request.user)
        self._handle_multiple_images(room)

    def perform_update(self, serializer):
        room = serializer.save()
        self._handle_multiple_images(room)

    def _handle_multiple_images(self, room):
        uploaded_files = self.request.FILES.getlist("images")
        primary_index_raw = self.request.data.get("primary_image_index", 0)
        try:
            primary_index = int(primary_index_raw)
        except (ValueError, TypeError):
            primary_index = 0

        # Handle deletion of any existing images requested
        delete_ids = self.request.data.get("delete_image_ids")
        if delete_ids:
            if isinstance(delete_ids, str):
                import json
                try:
                    delete_ids = json.loads(delete_ids)
                except Exception:
                    delete_ids = [delete_ids]
            if isinstance(delete_ids, list):
                room.images.filter(id__in=delete_ids).delete()

        # Handle existing image primary designation
        primary_image_id = self.request.data.get("primary_image_id")
        if primary_image_id:
            try:
                target = room.images.get(id=primary_image_id)
                room.images.all().update(is_primary=False)
                target.is_primary = True
                target.save(update_fields=["is_primary"])
                room.image = target.image
                room.save(update_fields=["image"])
            except Exception:
                pass

        # Handle newly uploaded files
        if uploaded_files:
            if 0 <= primary_index < len(uploaded_files):
                room.images.all().update(is_primary=False)

            for idx, img_file in enumerate(uploaded_files):
                is_primary = (idx == primary_index)
                room_img = RoomImage.objects.create(
                    room=room,
                    image=img_file,
                    is_primary=is_primary,
                )
                if is_primary:
                    room.image = room_img.image
                    room.save(update_fields=["image"])
        elif room.image and not room.images.exists():
            # If a single image was uploaded via the legacy/standard 'image' field
            RoomImage.objects.create(
                room=room,
                image=room.image,
                is_primary=True,
            )

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
