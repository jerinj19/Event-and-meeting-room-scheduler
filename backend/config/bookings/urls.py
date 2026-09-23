from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AvailableSlotsView,
    BookingDetailView,
    BookingListCreateView,
    BookingStatsView,
    CancelBookingView,
    CheckAvailabilityView,
    MyBookingsView,
    TimeSlotViewSet,
)

router = DefaultRouter()
router.register(r"time-slots", TimeSlotViewSet, basename="time-slot")
router.register(r"bookings/time-slots", TimeSlotViewSet, basename="booking-time-slot")

urlpatterns = [
    path("bookings/", BookingListCreateView.as_view(), name="booking-list-create"),
    path("bookings/check-availability/", CheckAvailabilityView.as_view(), name="booking-check-availability"),
    path("bookings/available-slots/", AvailableSlotsView.as_view(), name="booking-available-slots"),
    path("bookings/stats/", BookingStatsView.as_view(), name="booking-stats"),
    path("bookings/<uuid:pk>/", BookingDetailView.as_view(), name="booking-detail"),
    path("bookings/<uuid:pk>/cancel/", CancelBookingView.as_view(), name="booking-cancel"),
    path("my-bookings/", MyBookingsView.as_view(), name="my-bookings"),
    path("", include(router.urls)),
]

