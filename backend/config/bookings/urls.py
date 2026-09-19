from django.urls import path

from .views import (
    BookingDetailView,
    BookingListCreateView,
    BookingStatsView,
    CancelBookingView,
    CheckAvailabilityView,
    MyBookingsView,
)

urlpatterns = [
    path("bookings/", BookingListCreateView.as_view(), name="booking-list-create"),
    path("bookings/check-availability/", CheckAvailabilityView.as_view(), name="booking-check-availability"),
    path("bookings/stats/", BookingStatsView.as_view(), name="booking-stats"),
    path("bookings/<uuid:pk>/", BookingDetailView.as_view(), name="booking-detail"),
    path("bookings/<uuid:pk>/cancel/", CancelBookingView.as_view(), name="booking-cancel"),
    path("my-bookings/", MyBookingsView.as_view(), name="my-bookings"),
]
