from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rooms.models import Room
from django.db import IntegrityError, OperationalError
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import Booking
from .serializers import (
    BookingSerializer,
    CheckAvailabilitySerializer,
    BookingConflictException,
)


class IsBookingOwnerOrStaff(permissions.BasePermission):
    """
    Object-level permission allowing only the owner of the booking
    or staff/admin users to modify or cancel it.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user or request.user.is_staff or request.user.is_superuser


class BookingListCreateView(generics.ListCreateAPIView):
    """
    - GET /api/bookings/: List bookings with filtering (room, status, date, date range, search).
    - POST /api/bookings/: Create a new reservation for the authenticated user.
      Validates for room conflicts, returning HTTP 409 if slot is unavailable.
    """

    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Booking.objects.select_related("room", "user").all().order_by("start_time")

        room_id = self.request.query_params.get("room") or self.request.query_params.get("room_id")
        if room_id:
            queryset = queryset.filter(room_id=room_id)

        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status__iexact=status_param.strip())

        date_param = self.request.query_params.get("date")
        if date_param:
            parsed = parse_date(date_param.strip())
            if parsed:
                queryset = queryset.filter(start_time__date=parsed)

        start_date = self.request.query_params.get("start_date")
        if start_date:
            parsed_start = parse_date(start_date.strip())
            if parsed_start:
                queryset = queryset.filter(start_time__date__gte=parsed_start)

        end_date = self.request.query_params.get("end_date")
        if end_date:
            parsed_end = parse_date(end_date.strip())
            if parsed_end:
                queryset = queryset.filter(start_time__date__lte=parsed_end)

        search = self.request.query_params.get("search")
        if search:
            search = search.strip()
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(room__name__icontains=search)
                | Q(user__email__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        try:
            serializer.save(user=self.request.user)
        except (IntegrityError, OperationalError, DjangoValidationError) as e:
            raise BookingConflictException(detail=str(e))


class BookingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    - GET /api/bookings/{id}/: Retrieve single booking details.
    - PUT / PATCH /api/bookings/{id}/: Update booking (owner or staff only).
    - DELETE /api/bookings/{id}/: Delete booking (owner or staff only).
    """

    queryset = Booking.objects.select_related("room", "user").all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsBookingOwnerOrStaff]

    def perform_update(self, serializer):
        try:
            serializer.save()
        except (IntegrityError, OperationalError, DjangoValidationError) as e:
            raise BookingConflictException(detail=str(e))


class CheckAvailabilityView(APIView):
    """
    GET /api/bookings/check-availability/
    Query parameters:
      - room_id: UUID of room
      - start_time: ISO 8601 datetime
      - end_time: ISO 8601 datetime
    Returns boolean availability and conflicting slots if any.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = CheckAvailabilitySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        room = serializer.validated_data["room"]
        start_time = serializer.validated_data["start_time"]
        end_time = serializer.validated_data["end_time"]

        conflicts = Booking.objects.filter(
            room=room,
            status=Booking.STATUS_CONFIRMED,
            start_time__lt=end_time,
            end_time__gt=start_time,
        ).select_related("user")

        is_available = not conflicts.exists() and room.is_active

        conflict_data = [
            {
                "id": str(c.id),
                "title": c.title,
                "start_time": c.start_time.isoformat(),
                "end_time": c.end_time.isoformat(),
                "booked_by": c.user.email,
            }
            for c in conflicts
        ]

        return Response(
            {
                "room_id": str(room.id),
                "room_name": room.name,
                "room_active": room.is_active,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "is_available": is_available,
                "conflicts": conflict_data,
            },
            status=status.HTTP_200_OK,
        )


class MyBookingsView(generics.ListAPIView):
    """
    GET /api/my-bookings/
    Returns the authenticated user's reservations.
    Optional query parameters:
      - upcoming=true: only return future confirmed bookings
      - status: filter by status (CONFIRMED / CANCELLED)
    """

    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Booking.objects.filter(user=self.request.user)
            .select_related("room", "user")
            .order_by("start_time")
        )

        upcoming = self.request.query_params.get("upcoming")
        if upcoming and upcoming.lower() in ["true", "1"]:
            queryset = queryset.filter(
                start_time__gte=timezone.now(),
                status=Booking.STATUS_CONFIRMED,
            )

        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status__iexact=status_param.strip())

        return queryset


class CancelBookingView(APIView):
    """
    PATCH / POST /api/bookings/{id}/cancel/
    Cancels a reservation. Only the booking owner or an admin can cancel.
    Returns HTTP 400 if already cancelled.
    """

    permission_classes = [permissions.IsAuthenticated]

    def _cancel(self, request, pk):
        try:
            booking = Booking.objects.select_related("room", "user").get(pk=pk)
        except Booking.DoesNotExist:
            return Response(
                {
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Booking not found.",
                        "details": {},
                    }
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if booking.user != request.user and not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "You do not have permission to cancel this booking.",
                        "details": {},
                    }
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status == Booking.STATUS_CANCELLED:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "This booking is already cancelled.",
                        "details": {},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.STATUS_CANCELLED
        booking.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "message": f"Booking '{booking.title}' has been successfully cancelled.",
                "booking": BookingSerializer(booking).data,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk):
        return self._cancel(request, pk)

    def post(self, request, pk):
        return self._cancel(request, pk)


class BookingStatsView(APIView):
    """
    GET /api/bookings/stats/
    Returns summary statistics for reservations.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        today = now.date()

        total = Booking.objects.count()
        confirmed = Booking.objects.filter(status=Booking.STATUS_CONFIRMED).count()
        cancelled = Booking.objects.filter(status=Booking.STATUS_CANCELLED).count()
        today_count = (
            Booking.objects.filter(start_time__date=today, status=Booking.STATUS_CONFIRMED).count()
        )
        upcoming = Booking.objects.filter(start_time__gte=now, status=Booking.STATUS_CONFIRMED).count()

        return Response(
            {
                "total_bookings": total,
                "confirmed_bookings": confirmed,
                "cancelled_bookings": cancelled,
                "today_bookings": today_count,
                "upcoming_bookings": upcoming,
            },
            status=status.HTTP_200_OK,
        )
