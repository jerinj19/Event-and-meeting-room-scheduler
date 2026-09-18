from django.urls import path
from .views import (
    BookingListCreateView,
    BookingDetailView,
    CancelBookingView,
    CheckAvailabilityView,
    BookingStatsView,
)

urlpatterns = [
    path('bookings/', BookingListCreateView.as_view(), name='booking-list-create'),
    path('bookings/<int:pk>/', BookingDetailView.as_view(), name='booking-detail'),
    path('bookings/<int:pk>/cancel/', CancelBookingView.as_view(), name='booking-cancel'),
    path('bookings/check-availability/', CheckAvailabilityView.as_view(), name='booking-check-availability'),
    path('bookings/stats/', BookingStatsView.as_view(), name='booking-stats'),
]
