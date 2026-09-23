from datetime import datetime, time, timedelta
import calendar
import uuid

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rooms.models import Room
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import Booking, TimeSlot
from .serializers import (
    BookingSerializer,
    CheckAvailabilitySerializer,
    BookingConflictException,
    TimeSlotSerializer,
)


class BookingPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "current_page": self.page.number,
                "page_size": self.get_page_size(self.request),
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )


class TimeSlotPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        if request.query_params.get("no_pagination", "").lower() in ["true", "1"]:
            return None
        if (
            "page" not in request.query_params
            and "page_size" not in request.query_params
            and request.query_params.get("paginate", "").lower() not in ["true", "1"]
        ):
            return None
        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "current_page": self.page.number,
                "page_size": self.get_page_size(self.request),
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
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
    - GET /api/bookings/: List bookings with filtering (room, period, session, status, date range, search).
    - POST /api/bookings/: Create a new reservation for the authenticated user.
      Validates for room conflicts, returning HTTP 409 if slot is unavailable.
    """

    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = BookingPagination

    def get_queryset(self):
        queryset = Booking.objects.select_related("room", "user").all().order_by("-start_time")

        room_param = self.request.query_params.get("room") or self.request.query_params.get("room_id")
        if room_param and room_param.upper() != "ALL":
            is_uuid = False
            try:
                uuid.UUID(str(room_param).strip())
                is_uuid = True
            except ValueError:
                is_uuid = False

            if is_uuid or (isinstance(room_param, str) and room_param.isdigit()):
                queryset = queryset.filter(room_id=room_param)
            else:
                queryset = queryset.filter(room__name__iexact=room_param.strip())

        status_param = self.request.query_params.get("status")
        if status_param and status_param.upper() != "ALL":
            queryset = queryset.filter(status__iexact=status_param.strip())

        # Period filter: this_month, this_week, custom
        period_param = self.request.query_params.get("period")
        now = timezone.localtime(timezone.now())

        if period_param == "this_month":
            start_of_month = now.date().replace(day=1)
            _, last_day = calendar.monthrange(now.year, now.month)
            end_of_month = now.date().replace(day=last_day)
            queryset = queryset.filter(
                start_time__date__gte=start_of_month,
                start_time__date__lte=end_of_month,
            )
        elif period_param == "this_week":
            start_of_week = now.date() - timedelta(days=now.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            queryset = queryset.filter(
                start_time__date__gte=start_of_week,
                start_time__date__lte=end_of_week,
            )
        else:
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

        # Session filter: morning, afternoon, evening
        session_param = self.request.query_params.get("session")
        if session_param and session_param.lower() != "all":
            sess = session_param.lower().strip()
            if sess == "morning":
                queryset = queryset.filter(start_time__time__lt=time(12, 0))
            elif sess == "afternoon":
                queryset = queryset.filter(
                    start_time__time__gte=time(12, 0),
                    start_time__time__lt=time(17, 0),
                )
            elif sess == "evening":
                queryset = queryset.filter(start_time__time__gte=time(17, 0))

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
        except (IntegrityError, DjangoValidationError) as e:
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
        except (IntegrityError, DjangoValidationError) as e:
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


STANDARD_SLOTS = [
    {"id": "m1", "start": "09:00", "end": "10:00", "label": "09:00 – 10:00 AM", "duration": "60 mins", "period": "morning"},
    {"id": "m2", "start": "10:00", "end": "11:30", "label": "10:00 – 11:30 AM", "duration": "90 mins", "period": "morning"},
    {"id": "m3", "start": "11:30", "end": "12:30", "label": "11:30 AM – 12:30 PM", "duration": "60 mins", "period": "morning"},
    {"id": "a1", "start": "13:00", "end": "14:00", "label": "01:00 – 02:00 PM", "duration": "60 mins", "period": "afternoon"},
    {"id": "a2", "start": "14:00", "end": "15:30", "label": "02:00 – 03:30 PM", "duration": "90 mins", "period": "afternoon"},
    {"id": "a3", "start": "15:30", "end": "16:30", "label": "03:30 – 04:30 PM", "duration": "60 mins", "period": "afternoon"},
    {"id": "a4", "start": "16:30", "end": "17:30", "label": "04:30 – 05:30 PM", "duration": "60 mins", "period": "afternoon"},
    {"id": "e1", "start": "17:30", "end": "18:30", "label": "05:30 – 06:30 PM", "duration": "60 mins", "period": "evening"},
    {"id": "e2", "start": "18:30", "end": "19:30", "label": "06:30 – 07:30 PM", "duration": "60 mins", "period": "evening"},
    {"id": "e3", "start": "19:30", "end": "20:30", "label": "07:30 – 08:30 PM", "duration": "60 mins", "period": "evening"},
    {"id": "e4", "start": "20:30", "end": "22:00", "label": "08:30 – 10:00 PM", "duration": "90 mins", "period": "evening"},
]


def seed_default_time_slots():
    """
    Ensure the 11 standard corporate default time slots exist in the database.
    Default templates have date=None so they apply across each and every day.
    Seeds globally (room=None) as well as for all active rooms that do not have custom slots.
    """
    # 1. Global templates
    for index, slot in enumerate(STANDARD_SLOTS):
        sh, sm = map(int, slot["start"].split(":"))
        eh, em = map(int, slot["end"].split(":"))
        TimeSlot.objects.update_or_create(
            start_time=time(sh, sm),
            end_time=time(eh, em),
            room=None,
            date=None,
            defaults={
                "label": slot["label"],
                "period": slot["period"],
                "is_active": True,
                "sort_order": index,
            },
        )

    # 2. Per-room standard slots for active rooms without custom templates
    for room in Room.objects.filter(is_active=True):
        if room.name.lower() == "xyz":
            continue
        for index, slot in enumerate(STANDARD_SLOTS):
            sh, sm = map(int, slot["start"].split(":"))
            eh, em = map(int, slot["end"].split(":"))
            TimeSlot.objects.update_or_create(
                start_time=time(sh, sm),
                end_time=time(eh, em),
                room=room,
                date=None,
                defaults={
                    "label": slot["label"],
                    "period": slot["period"],
                    "is_active": True,
                    "sort_order": index,
                },
            )


def is_admin_user(user):
    """
    Check if a user has administrator / staff access.
    Matches is_staff, is_superuser, or email containing 'admin'.
    """
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        return True
    email = (getattr(user, "email", "") or "").lower()
    return "admin" in email


class IsAdminOrReadOnlySlot(permissions.BasePermission):
    """
    Allows all users (including unauthenticated visitors evaluating scheduling)
    read access to active time slots.
    Write operations (create, update, delete, toggle) are permitted
    for authenticated staff/admin users.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return is_admin_user(request.user)


class TimeSlotViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing dynamic time slots:
    - GET /api/bookings/time-slots/: List time slots with filtering (room_id, is_active, period, search).
    - POST /api/bookings/time-slots/: Create new time slot (Staff/Admin only).
    - GET /api/bookings/time-slots/{id}/: Retrieve slot details.
    - PUT / PATCH /api/bookings/time-slots/{id}/: Update slot (Staff/Admin only).
    - DELETE /api/bookings/time-slots/{id}/: Delete slot (Staff/Admin only).
    - POST /api/bookings/time-slots/reset-defaults/: Restore standard default slots (Staff/Admin only).
    """

    queryset = TimeSlot.objects.select_related("room").order_by("date", "start_time", "sort_order")
    serializer_class = TimeSlotSerializer
    permission_classes = [IsAdminOrReadOnlySlot]
    pagination_class = TimeSlotPagination

    def get_queryset(self):
        queryset = TimeSlot.objects.select_related("room").order_by("date", "start_time", "sort_order")

        room_param = self.request.query_params.get("room_id") or self.request.query_params.get("room")
        exact_room = self.request.query_params.get("exact_room", "").lower() in ["true", "1"]
        if room_param:
            if room_param.lower() == "global":
                queryset = queryset.filter(room__isnull=True)
            elif room_param.upper() != "ALL":
                is_uuid = False
                try:
                    uuid.UUID(str(room_param).strip())
                    is_uuid = True
                except ValueError:
                    is_uuid = False

                if exact_room:
                    if is_uuid or (isinstance(room_param, str) and room_param.isdigit()):
                        queryset = queryset.filter(room_id=room_param)
                    else:
                        queryset = queryset.filter(room__name__iexact=room_param.strip())
                else:
                    if is_uuid or (isinstance(room_param, str) and room_param.isdigit()):
                        queryset = queryset.filter(Q(room_id=room_param) | Q(room__isnull=True))
                    else:
                        queryset = queryset.filter(Q(room__name__iexact=room_param.strip()) | Q(room__isnull=True))

        is_active_param = self.request.query_params.get("is_active")
        if is_active_param is not None:
            if is_active_param.lower() in ["true", "1"]:
                queryset = queryset.filter(is_active=True)
            elif is_active_param.lower() in ["false", "0"]:
                queryset = queryset.filter(is_active=False)

        # Date type filter: recurring (date is null) vs dated (date is not null)
        date_type = self.request.query_params.get("date_type")
        if date_type:
            dt = date_type.lower().strip()
            if dt == "recurring":
                queryset = queryset.filter(date__isnull=True)
            elif dt == "dated":
                queryset = queryset.filter(date__isnull=False)

        # Period filter: this_month, this_week, custom
        period_param = self.request.query_params.get("period")
        now = timezone.localtime(timezone.now())

        if period_param == "this_month":
            start_of_month = now.date().replace(day=1)
            _, last_day = calendar.monthrange(now.year, now.month)
            end_of_month = now.date().replace(day=last_day)
            queryset = queryset.filter(
                Q(date__gte=start_of_month, date__lte=end_of_month) | Q(date__isnull=True)
            )
        elif period_param == "this_week":
            start_of_week = now.date() - timedelta(days=now.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            queryset = queryset.filter(
                Q(date__gte=start_of_week, date__lte=end_of_week) | Q(date__isnull=True)
            )
        elif period_param == "custom":
            start_date = self.request.query_params.get("start_date")
            end_date = self.request.query_params.get("end_date")
            if start_date:
                parsed_start = parse_date(start_date.strip())
                if parsed_start:
                    queryset = queryset.filter(date__gte=parsed_start)
            if end_date:
                parsed_end = parse_date(end_date.strip())
                if parsed_end:
                    queryset = queryset.filter(date__lte=parsed_end)
        else:
            date_param = self.request.query_params.get("date")
            if date_param:
                parsed = parse_date(date_param.strip())
                if parsed:
                    queryset = queryset.filter(Q(date=parsed) | Q(date__isnull=True))

        # Session filter: morning, afternoon, evening
        session_param = self.request.query_params.get("session")
        if session_param and session_param.lower() != "all":
            queryset = queryset.filter(period__iexact=session_param.strip())

        search_param = self.request.query_params.get("search")
        if search_param:
            query = search_param.strip()
            queryset = queryset.filter(
                Q(label__icontains=query)
                | Q(period__icontains=query)
                | Q(room__name__icontains=query)
            )

        return queryset

    @action(detail=False, methods=["post"], url_path="reset-defaults")
    def reset_defaults(self, request):
        if not is_admin_user(request.user):
            return Response(
                {"error": {"code": "FORBIDDEN", "message": "Only admins can restore default time slots."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        seed_default_time_slots()
        slots = TimeSlot.objects.select_related("room").order_by("date", "start_time", "sort_order")
        serializer = self.get_serializer(slots, many=True)
        return Response(
            {
                "message": "Standard default time slots restored successfully.",
                "slots": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="bulk-create")
    def bulk_create(self, request):
        """
        Create multiple time slots at once in a single transaction.
        Payload can be:
        1. A list of slot objects.
        2. An object with a 'slots' list and optional 'dates' list.
        If 'dates' is provided, each slot in 'slots' is cloned for each date in 'dates'!
        """
        if not is_admin_user(request.user):
            return Response(
                {"error": {"code": "FORBIDDEN", "message": "Only administrators can create time slots."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        raw_slots = request.data if isinstance(request.data, list) else request.data.get("slots", [])
        raw_dates = [] if isinstance(request.data, list) else request.data.get("dates", [])

        if not raw_slots or not isinstance(raw_slots, list):
            return Response(
                {"error": {"code": "INVALID_DATA", "message": "A non-empty list of time slots is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expanded_slots = []
        if raw_dates and isinstance(raw_dates, list):
            for d_str in raw_dates:
                for slot in raw_slots:
                    slot_copy = dict(slot)
                    slot_copy["date"] = d_str
                    expanded_slots.append(slot_copy)
        else:
            expanded_slots = raw_slots

        serializer = self.get_serializer(data=expanded_slots, many=True)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            instances = serializer.save()

        return Response(
            {
                "message": f"Successfully created {len(instances)} time slots.",
                "slots": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class AvailableSlotsView(APIView):
    """
    GET /api/bookings/available-slots/
    Query parameters:
      - date: YYYY-MM-DD (defaults to today)
      - room_id: UUID of room (optional)

    Returns only valid upcoming time slots for the specified date.
    Any slot that has already started, is currently in progress (e.g. current time 9:30 AM
    for a 9:00 - 10:00 AM slot), or is in the past will NOT be fetched / returned.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        now = timezone.now()
        local_now = timezone.localtime(now)

        date_param = request.query_params.get("date")
        if date_param:
            parsed_date = parse_date(date_param.strip())
            if not parsed_date:
                return Response(
                    {"error": {"code": "INVALID_DATE", "message": "Date must be in YYYY-MM-DD format."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            target_date = parsed_date
        else:
            target_date = local_now.date()

        room_id = request.query_params.get("room_id") or request.query_params.get("room")
        room = None
        if room_id:
            try:
                room = Room.objects.get(id=room_id)
            except (Room.DoesNotExist, ValueError):
                pass

        conflicts = []
        if room:
            conflicts = list(
                Booking.objects.filter(
                    room=room,
                    status=Booking.STATUS_CONFIRMED,
                    start_time__date=target_date,
                )
            )

        tz = timezone.get_current_timezone()

        # Helper to resolve slots for target_date:
        # 1. Any slot specifically set for target_date takes precedence.
        # 2. If no date-specific slots exist for target_date, fallback to recurring templates (date is None).
        # 3. If neither exists, fallback to raw_slots.
        def resolve_slots_for_date(raw_slots, date_val):
            date_specific = [s for s in raw_slots if s.date == date_val]
            if date_specific:
                return date_specific
            null_date = [s for s in raw_slots if s.date is None]
            if null_date:
                return null_date
            return raw_slots

        # Query dynamic slots from DB:
        if room:
            room_slots_raw = list(TimeSlot.objects.filter(room=room).order_by("start_time", "sort_order"))
            chosen_room_slots = resolve_slots_for_date(room_slots_raw, target_date)

            global_slots_raw = list(TimeSlot.objects.filter(room__isnull=True).order_by("start_time", "sort_order"))
            chosen_global_slots = resolve_slots_for_date(global_slots_raw, target_date)

            if chosen_room_slots:
                # Include all room-specific slots (they take precedence for this room)
                combined_slots = list(chosen_room_slots)
                # Include global slots that do not overlap with any room-specific slot
                for g in chosen_global_slots:
                    overlaps = any(
                        r.start_time < g.end_time and r.end_time > g.start_time
                        for r in chosen_room_slots
                    )
                    if not overlaps:
                        combined_slots.append(g)
                db_slots = combined_slots
            else:
                db_slots = chosen_global_slots
        else:
            global_slots_raw = list(TimeSlot.objects.filter(room__isnull=True).order_by("start_time", "sort_order"))
            db_slots = resolve_slots_for_date(global_slots_raw, target_date)

        # Deduplicate slots by (start_time, end_time) to avoid duplicate buttons
        seen_intervals = set()
        unique_db_slots = []
        for s in sorted(db_slots, key=lambda x: (x.start_time, 0 if x.room_id else 1, x.sort_order)):
            interval = (s.start_time, s.end_time)
            if interval not in seen_intervals:
                seen_intervals.add(interval)
                unique_db_slots.append(s)
        db_slots = unique_db_slots

        # If database has no slots defined yet, fall back to STANDARD_SLOTS
        if db_slots:
            slot_definitions = [
                {
                    "id": str(s.id),
                    "start": s.start_time.strftime("%H:%M"),
                    "end": s.end_time.strftime("%H:%M"),
                    "label": s.formatted_label,
                    "duration": s.duration_label,
                    "period": s.period,
                    "room_id": str(s.room_id) if s.room_id else None,
                    "is_active": s.is_active,
                }
                for s in db_slots
            ]
        else:
            slot_definitions = STANDARD_SLOTS

        valid_slots = []
        morning = []
        afternoon = []
        evening = []

        for slot_def in slot_definitions:
            start_h, start_m = map(int, slot_def["start"].split(":"))
            end_h, end_m = map(int, slot_def["end"].split(":"))

            slot_start_dt = timezone.make_aware(
                datetime.combine(target_date, time(start_h, start_m)),
                tz,
            )
            slot_end_dt = timezone.make_aware(
                datetime.combine(target_date, time(end_h, end_m)),
                tz,
            )

            # Determine whether slot is completed, current, or future
            is_completed = (target_date < local_now.date()) or (target_date == local_now.date() and slot_end_dt <= now)
            is_current = (target_date == local_now.date()) and (slot_start_dt <= now < slot_end_dt)

            # Do not return completed slots for target date
            if is_completed:
                continue

            # Check if booked in DB
            is_booked = any(
                c.start_time < slot_end_dt and c.end_time > slot_start_dt
                for c in conflicts
            )

            slot_item = {
                "id": slot_def["id"],
                "start": slot_def["start"],
                "end": slot_def["end"],
                "label": slot_def["label"],
                "duration": slot_def["duration"],
                "period": slot_def["period"],
                "is_booked": is_booked,
                "is_past": False,
                "is_current": is_current,
                "is_active": slot_def.get("is_active", True),
            }

            valid_slots.append(slot_item)
            if slot_def["period"] == "morning":
                morning.append(slot_item)
            elif slot_def["period"] == "afternoon":
                afternoon.append(slot_item)
            elif slot_def["period"] == "evening":
                evening.append(slot_item)

        return Response(
            {
                "date": target_date.isoformat(),
                "room_id": str(room.id) if room else None,
                "current_time": local_now.isoformat(),
                "total_slots": len(valid_slots),
                "slots": valid_slots,
                "grouped": {
                    "morning": morning,
                    "afternoon": afternoon,
                    "evening": evening,
                },
            },
            status=status.HTTP_200_OK,
        )

