from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from django.utils.dateparse import parse_date, parse_datetime
from django.db.models import Q
from django.utils import timezone
from .models import Booking
from .serializers import BookingSerializer, CheckAvailabilitySerializer


class BookingListCreateView(ListCreateAPIView):
    serializer_class = BookingSerializer

    def get_queryset(self):
        queryset = Booking.objects.all()

        room_name = self.request.query_params.get('room_name')
        if room_name:
            queryset = queryset.filter(room_name__iexact=room_name)

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status__iexact=status_param)

        date_param = self.request.query_params.get('date')
        if date_param:
            parsed_date = parse_date(date_param)
            if parsed_date:
                queryset = queryset.filter(start_time__date=parsed_date)

        start_date = self.request.query_params.get('start_date')
        if start_date:
            parsed_start = parse_date(start_date)
            if parsed_start:
                queryset = queryset.filter(start_time__date__gte=parsed_start)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            parsed_end = parse_date(end_date)
            if parsed_end:
                queryset = queryset.filter(start_time__date__lte=parsed_end)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(user_name__icontains=search) |
                Q(room_name__icontains=search)
            )

        return queryset.order_by('start_time')


class BookingDetailView(RetrieveUpdateDestroyAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer


class CancelBookingView(APIView):
    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

        booking.status = 'CANCELLED'
        booking.save(update_fields=['status', 'updated_at'])
        return Response({
            "message": f"Booking '{booking.title}' has been cancelled.",
            "booking": BookingSerializer(booking).data
        }, status=status.HTTP_200_OK)


class CheckAvailabilityView(APIView):
    def get(self, request):
        room_name = request.query_params.get('room_name')
        start_time_str = request.query_params.get('start_time')
        end_time_str = request.query_params.get('end_time')

        if not all([room_name, start_time_str, end_time_str]):
            return Response(
                {"error": "Please provide 'room_name', 'start_time', and 'end_time' query parameters."},
                status=status.HTTP_400_BAD_REQUEST
            )

        start_time = parse_datetime(start_time_str)
        end_time = parse_datetime(end_time_str)

        if not start_time or not end_time:
            return Response(
                {"error": "Invalid datetime format. Please use ISO format (e.g. YYYY-MM-DDTHH:MM)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if end_time <= start_time:
            return Response(
                {"error": "End time must be after start time."},
                status=status.HTTP_400_BAD_REQUEST
            )

        conflicts = Booking.objects.filter(
            room_name__iexact=room_name,
            start_time__lt=end_time,
            end_time__gt=start_time
        ).exclude(status='CANCELLED')

        is_available = not conflicts.exists()

        conflicting_bookings = []
        if not is_available:
            conflicting_bookings = BookingSerializer(conflicts, many=True).data

        return Response({
            "room_name": room_name,
            "start_time": start_time,
            "end_time": end_time,
            "is_available": is_available,
            "conflicts": conflicting_bookings
        }, status=status.HTTP_200_OK)


class BookingStatsView(APIView):
    def get(self, request):
        now = timezone.now()
        today = now.date()

        total = Booking.objects.count()
        confirmed = Booking.objects.filter(status='CONFIRMED').count()
        cancelled = Booking.objects.filter(status='CANCELLED').count()
        today_count = Booking.objects.filter(start_time__date=today).exclude(status='CANCELLED').count()
        upcoming = Booking.objects.filter(start_time__gte=now, status='CONFIRMED').count()

        return Response({
            "total_bookings": total,
            "confirmed_bookings": confirmed,
            "cancelled_bookings": cancelled,
            "today_bookings": today_count,
            "upcoming_bookings": upcoming,
        }, status=status.HTTP_200_OK)
