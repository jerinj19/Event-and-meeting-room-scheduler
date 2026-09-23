import React, { useState, useEffect, useCallback } from 'react';
import TimeSlotPicker from './TimeSlotPicker';
import { DEFAULT_SLOTS } from './bookingConstants';
import BookingForm from './BookingForm';
import ConflictBanner from './ConflictBanner';

export default function BookingModal({ isOpen, room, onClose, onSuccess }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [title, setTitle] = useState('Q4 Product Roadmap & Architecture Sync');
  const [attendeesCount, setAttendeesCount] = useState(6);
  const [description, setDescription] = useState('Reviewing module handoffs with Jerin & Prashanth');
  const [conflictError, setConflictError] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([
    { start: '10:00', end: '11:30', title: 'Reserved: Sarah T. (Standup)' },
    { start: '14:00', end: '15:30', title: 'Reserved: All-Hands' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch real availability when room or date changes
  const fetchAvailability = useCallback(async () => {
    if (!room?.id) return;
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(
        `http://127.0.0.1:8000/api/bookings/check-availability/?room_id=${room.id}&start_time=${selectedDate}T00:00:00Z&end_time=${selectedDate}T23:59:59Z`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.conflicts && data.conflicts.length > 0) {
          setBookedSlots(data.conflicts);
        }
      }
    } catch {
      // Keep existing mock slots if offline or server inactive
    }
  }, [room?.id, selectedDate]);

  useEffect(() => {
    if (isOpen && room?.id) {
      fetchAvailability();
    }
  }, [isOpen, room?.id, fetchAvailability]);

  if (!isOpen || !room) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setConflictError(null);

    if (!selectedSlot) {
      alert('Please select a time slot first.');
      return;
    }

    if (attendeesCount > (room.capacity || 14)) {
      alert(`Attendees count exceeds ${room.name}'s capacity of ${room.capacity} seats!`);
      return;
    }

    const token = localStorage.getItem('access_token');

    // Build ISO 8601 timestamps
    const startIso = new Date(`${selectedDate}T${selectedSlot.start}:00`).toISOString();
    const endIso = new Date(`${selectedDate}T${selectedSlot.end}:00`).toISOString();

    setIsSubmitting(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/bookings/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          room: room.id,
          title: title.trim(),
          start_time: startIso,
          end_time: endIso,
          attendees_count: attendeesCount,
          description: description.trim(),
        }),
      });

      if (res.status === 201) {
        const newBooking = await res.json();
        if (onSuccess) onSuccess(newBooking);
        onClose();
      } else if (res.status === 409) {
        const errorData = await res.json();
        setConflictError(
          errorData.error || {
            message: 'Slot Conflict: Another user just reserved this time slot.',
            details: { conflicts: [{ title: 'Simultaneous Booking', booked_by: 'Another User' }] },
          }
        );
      } else {
        const errorData = await res.json();
        alert(errorData.error?.message || errorData.detail || 'Failed to book room.');
      }
    } catch {
      alert('Unable to connect to backend server. Please verify backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Dimmed Backdrop */}
      <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Dialog Window */}
      <div className="relative bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 z-10 max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in duration-200">
        {/* 1. Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Book {room.name}</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Available Now
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {room.location} • Max {room.capacity || 14} Seats
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 2. Scrollable Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Conflict Banner when 409 occurs */}
          <ConflictBanner error={conflictError} onRefresh={fetchAvailability} />

          {/* Time Slot Picker Grid */}
          <TimeSlotPicker
            roomId={room?.id}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setConflictError(null);
            }}
            selectedSlot={selectedSlot}
            onSelectSlot={(slot) => {
              setSelectedSlot(slot);
              setConflictError(null);
            }}
            bookedSlots={bookedSlots}
          />

          {/* Reservation Details Form */}
          <BookingForm
            room={room}
            selectedSlot={selectedSlot}
            title={title}
            onChangeTitle={setTitle}
            attendeesCount={attendeesCount}
            onChangeAttendees={setAttendeesCount}
            description={description}
            onChangeDescription={setDescription}
          />

          {/* Sticky Modal Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Instant confirmation • Free cancellation up to 1 hr before start</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition shadow-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedSlot}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#0051d5] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-xl shadow-md shadow-blue-600/25 transition flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Reserving...</span>
                ) : (
                  <>
                    <span>Confirm Reservation</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
