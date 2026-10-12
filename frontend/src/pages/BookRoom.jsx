import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams, useLocation, Link } from 'react-router-dom';
import TimeSlotPicker from '../components/booking/TimeSlotPicker';
import { isSlotCompleted } from '../components/booking/bookingConstants';
import BookingForm from '../components/booking/BookingForm';
import ConflictBanner from '../components/booking/ConflictBanner';
import { fetchWithAuth } from '../services/apiClient';

const API_BASE = window.location.hostname === 'localhost' && window.location.port !== '8000'
  ? 'http://localhost:8000'
  : '';

const FALLBACK_ROOM_IMAGE = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80';

export default function BookRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId: paramRoomId } = useParams();
  const [searchParams] = useSearchParams();

  const queryRoomId = paramRoomId || searchParams.get('roomId') || location.state?.room?.id;
  const queryRoomName = searchParams.get('roomName') || location.state?.room?.name;

  const [availableRooms, setAvailableRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomLoadError, setRoomLoadError] = useState(null);

  // Scheduling Date State
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const incomingDate = searchParams.get('date') || searchParams.get('selectedDate') || location.state?.selectedDate || location.state?.date;
  const [selectedDate, setSelectedDate] = useState(() => {
    if (incomingDate && /^\d{4}-\d{2}-\d{2}$/.test(incomingDate) && incomingDate >= todayIso) {
      return incomingDate;
    }
    return todayIso;
  });

  useEffect(() => {
    const passedDate = searchParams.get('date') || searchParams.get('selectedDate') || location.state?.selectedDate || location.state?.date;
    if (passedDate && /^\d{4}-\d{2}-\d{2}$/.test(passedDate) && passedDate >= todayIso) {
      setSelectedDate(passedDate);
    } else if (passedDate && passedDate < todayIso) {
      setSelectedDate(todayIso);
    }
  }, [searchParams, location.state, todayIso]);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [title, setTitle] = useState('');
  const [attendeesCount, setAttendeesCount] = useState(1);
  const [description, setDescription] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);

  const [conflictError, setConflictError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Helper to format a room object from backend
  const formatRoomData = useCallback((target) => {
    if (!target) return null;
    let imgUrl = FALLBACK_ROOM_IMAGE;
    if (target.image) {
      imgUrl = target.image.startsWith('http') ? target.image : `${API_BASE}${target.image}`;
    }

    let parsedAmenities = [];
    if (Array.isArray(target.amenities)) {
      parsedAmenities = target.amenities;
    } else if (typeof target.amenities === 'string') {
      try {
        const json = JSON.parse(target.amenities);
        parsedAmenities = Array.isArray(json) ? json : [target.amenities];
      } catch {
        parsedAmenities = target.amenities.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    return {
      id: target.id,
      name: target.name || 'Meeting Room',
      location: target.location || 'Main Corporate Campus',
      capacity: target.capacity || 10,
      hourly_rate: target.hourly_rate || 0,
      is_active: target.is_active !== undefined ? target.is_active : true,
      image: imgUrl,
      amenities: parsedAmenities.length > 0 ? parsedAmenities : ['Display Screen', 'High-Speed WiFi'],
    };
  }, []);

  // Fetch real rooms list from backend
  useEffect(() => {
    let isMounted = true;
    setIsLoadingRooms(true);
    setRoomLoadError(null);

    fetchWithAuth(`${API_BASE}/api/rooms/`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch rooms list');
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.results || [];

        if (isMounted) {
          setAvailableRooms(list);

          if (list.length > 0) {
            // Find matched room by queryRoomId, or default to first room
            const matched = queryRoomId ? list.find((r) => String(r.id) === String(queryRoomId)) : null;
            const chosen = matched || list[0];
            setActiveRoom(formatRoomData(chosen));
          } else {
            // If queryRoomId is provided, try single room retrieval
            if (queryRoomId) {
              const singleRes = await fetchWithAuth(`${API_BASE}/api/rooms/${queryRoomId}/`);
              if (singleRes.ok) {
                const singleData = await singleRes.json();
                if (isMounted) setActiveRoom(formatRoomData(singleData));
                return;
              }
            }
            setRoomLoadError('No active meeting rooms available for reservation.');
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          // Attempt single room fallback if list endpoint failed but roomId is present
          if (queryRoomId) {
            fetchWithAuth(`${API_BASE}/api/rooms/${queryRoomId}/`)
              .then((res) => (res.ok ? res.json() : null))
              .then((singleData) => {
                if (singleData && isMounted) {
                  setActiveRoom(formatRoomData(singleData));
                  return;
                }
                setRoomLoadError(err.message || 'Unable to connect to the room service.');
              })
              .catch(() => {
                setRoomLoadError(err.message || 'Unable to connect to the room service.');
              });
          } else {
            setRoomLoadError(err.message || 'Unable to connect to the room service.');
          }
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingRooms(false);
      });

    return () => {
      isMounted = false;
    };
  }, [queryRoomId, formatRoomData]);

  // Check real-time slot availability for 24h day from backend
  const fetchAvailability = useCallback(async () => {
    if (!activeRoom?.id) return;
    setIsLoadingAvailability(true);
    try {
      const startOfDay = new Date(`${selectedDate}T00:00:00`).toISOString();
      const endOfDay = new Date(`${selectedDate}T23:59:59`).toISOString();
      const res = await fetchWithAuth(
        `${API_BASE}/api/bookings/check-availability/?room_id=${activeRoom.id}&start_time=${startOfDay}&end_time=${endOfDay}`
      );

      if (res.ok) {
        const data = await res.json();
        setBookedSlots(data.conflicts || []);
      } else {
        setBookedSlots([]);
      }
    } catch {
      setBookedSlots([]);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [activeRoom?.id, selectedDate]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Deselect current slot if it is in the past or booked on the selected day
  useEffect(() => {
    if (selectedSlot) {
      if (isSlotCompleted(selectedSlot, selectedDate)) {
        setSelectedSlot(null);
        return;
      }
      if (bookedSlots.length > 0) {
        const slotStart = new Date(`${selectedDate}T${selectedSlot.start}:00`).getTime();
        const slotEnd = new Date(`${selectedDate}T${selectedSlot.end}:00`).getTime();
        const isBooked = bookedSlots.some((b) => {
          if (!b.start_time || !b.end_time) return false;
          const bStart = new Date(b.start_time).getTime();
          const bEnd = new Date(b.end_time).getTime();
          return slotStart < bEnd && slotEnd > bStart;
        });
        if (isBooked) {
          setSelectedSlot(null);
        }
      }
    }
  }, [bookedSlots, selectedSlot, selectedDate]);

  // Handle Booking Submission
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    setConflictError(null);

    if (!activeRoom) {
      alert('Please select a valid room to reserve.');
      return;
    }

    if (!selectedSlot) {
      alert('Please select an available time slot.');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a meeting title.');
      return;
    }

    if (attendeesCount < 1) {
      alert('Expected attendees must be at least 1 person.');
      return;
    }

    if (attendeesCount > (activeRoom.capacity || 14)) {
      alert(`Expected attendees exceeds room capacity of ${activeRoom.capacity} people.`);
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('Please sign in to confirm your reservation.');
      navigate('/');
      return;
    }

    // Convert local slot selection to precise ISO 8601 UTC timestamp
    const startIso = new Date(`${selectedDate}T${selectedSlot.start}:00`).toISOString();
    const endIso = new Date(`${selectedDate}T${selectedSlot.end}:00`).toISOString();

    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/bookings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room: activeRoom.id,
          title: title.trim(),
          start_time: startIso,
          end_time: endIso,
          attendees_count: attendeesCount,
          description: description.trim(),
        }),
      });

      if (res.status === 201) {
        setBookingSuccess(true);
        setTimeout(() => {
          navigate('/my-bookings');
        }, 1200);
      } else if (res.status === 401) {
        alert('Your login session has expired. Please sign in again.');
        navigate('/');
      } else if (res.status === 409) {
        const errorData = await res.json();
        setConflictError(
          errorData.error || {
            message: errorData.message || 'Slot Conflict: Another user has booked this room for the requested period.',
            details: errorData.details || {},
          }
        );
      } else {
        const errorData = await res.json();
        alert(errorData.error?.message || errorData.detail || 'Reservation failed.');
      }
    } catch {
      alert('Network error connecting to the scheduler API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="flex-1 flex flex-col min-w-0 w-full bg-slate-50/50">
      {/* Subheader / Responsive Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center flex-wrap gap-2 text-slate-500 font-medium">
            <Link to="/rooms" className="hover:text-slate-900 transition flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Rooms Catalog</span>
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-semibold truncate max-w-[180px] sm:max-w-xs">
              {activeRoom?.name || queryRoomName || 'Select Room'}
            </span>
            <span>/</span>
            <span className="text-[#0051d5] font-semibold">Schedule & Reserve</span>
          </div>

          <Link
            to="/rooms"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0051d5] transition py-1 px-2.5 rounded-lg hover:bg-blue-50/60"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Room Catalog</span>
          </Link>
        </div>
      </div>

      {/* Main Workflow Canvas (Responsive 2-Column Split View) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 flex-1 w-full">
        {bookingSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <div className="text-sm font-bold">Reservation Successfully Created!</div>
              <div className="text-xs text-emerald-700">Redirecting to your dashboard...</div>
            </div>
          </div>
        )}

        {isLoadingRooms ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold text-slate-600">Loading meeting room details from database...</p>
          </div>
        ) : roomLoadError || !activeRoom ? (
          <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Room Not Available</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {roomLoadError || 'The requested room could not be found or has been deactivated.'}
            </p>
            <div className="pt-2">
              <Link
                to="/rooms"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0051d5] text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition"
              >
                Browse Room Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* LEFT COLUMN: Selected Room Overview (35% width, stacked on mobile) */}
            <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:sticky lg:top-24 w-full">
              {/* Card Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected Room</span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  activeRoom.is_active
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-amber-700 bg-amber-50 border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${activeRoom.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  {activeRoom.is_active ? 'Active & Available' : 'Maintenance / Offline'}
                </span>
              </div>

              {/* Room Selector Dropdown */}
              {availableRooms.length > 1 && (
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                  <label className="text-[11px] font-semibold text-slate-600 shrink-0">Switch Room:</label>
                  <select
                    value={activeRoom.id}
                    onChange={(e) => {
                      const found = availableRooms.find((r) => String(r.id) === String(e.target.value));
                      if (found) {
                        setActiveRoom(formatRoomData(found));
                        setSelectedSlot(null);
                        setConflictError(null);
                      }
                    }}
                    className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs cursor-pointer"
                  >
                    {availableRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.capacity} seats)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Room Image */}
              <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-slate-100">
                <img
                  src={activeRoom.image}
                  alt={activeRoom.name}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_ROOM_IMAGE;
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent"></div>
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-sm truncate">
                    {activeRoom.name}
                  </h2>
                  <p className="text-xs text-slate-200 drop-shadow-sm truncate mt-0.5">
                    {activeRoom.location}
                  </p>
                </div>
              </div>

              {/* Specs & Amenities */}
              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 py-1">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Capacity</span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">{activeRoom.capacity} People Max</div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Rate</span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">
                      {activeRoom.hourly_rate && Number(activeRoom.hourly_rate) > 0
                        ? `₹${Number(activeRoom.hourly_rate).toLocaleString('en-IN')}/hr`
                        : 'Complimentary'}
                    </div>
                  </div>
                </div>

                {/* Amenities List */}
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Room Amenities
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeRoom.amenities && activeRoom.amenities.length > 0 ? (
                      activeRoom.amenities.map((amenity, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/70"
                        >
                          <span className="text-[#0051d5] font-bold">✓</span>
                          <span>{amenity}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">Standard Conference Room Amenities</span>
                    )}
                  </div>
                </div>

                {/* Policy Box */}
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-[#0051d5] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-blue-950 font-normal leading-relaxed">
                    Complimentary for internal teams • Free cancellation up to 1 hr before start.
                  </p>
                </div>

                {/* Change Room Action */}
                <Link
                  to="/rooms"
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-2 text-center"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>Select Another Room</span>
                </Link>
              </div>
            </aside>

            {/* RIGHT COLUMN: Scheduling & Booking Engine (65% width) */}
            <section className="lg:col-span-8 space-y-6 w-full min-w-0">
              {/* Header Banner */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Select Date & Time Slot
                  </h1>
                  <span className="text-xs font-semibold text-[#0051d5] bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0051d5]"></span>
                    <span>Step 1 of 2: Scheduling</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  Choose an available time slot to reserve {activeRoom.name} for your team session.
                </p>
              </div>

              {/* Conflict Banner when 409 error occurs */}
              <ConflictBanner error={conflictError} onRefresh={fetchAvailability} />

              {/* Step 1 & 2: TimeSlotPicker */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <TimeSlotPicker
                  roomId={activeRoom?.id}
                  selectedDate={selectedDate}
                  onSelectDate={(newDate) => {
                    setSelectedDate(newDate);
                    setConflictError(null);
                  }}
                  selectedSlot={selectedSlot}
                  onSelectSlot={(slot) => {
                    setSelectedSlot(slot);
                    setConflictError(null);
                  }}
                  bookedSlots={bookedSlots}
                  isLoading={isLoadingAvailability}
                />
              </div>

              {/* Step 3: Reservation Details Form */}
              <BookingForm
                room={activeRoom}
                selectedSlot={selectedSlot}
                title={title}
                onChangeTitle={setTitle}
                attendeesCount={attendeesCount}
                onChangeAttendees={setAttendeesCount}
                description={description}
                onChangeDescription={setDescription}
              />

              {/* Action Footer Strip */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0051d5] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                      Reservation Summary
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      Reserving <span className="text-[#0051d5]">{activeRoom.name}</span> for {formattedSelectedDate} •{' '}
                      {selectedSlot ? selectedSlot.label : 'Select slot'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-end">
                  <Link
                    to="/rooms"
                    className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition text-center"
                  >
                    Cancel
                  </Link>
                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={isSubmitting || !selectedSlot}
                    className="flex-1 sm:flex-initial px-6 py-2.5 text-xs font-bold text-white bg-[#0051d5] hover:bg-[#0047be] active:bg-[#003ba0] disabled:opacity-50 rounded-xl shadow-md shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Confirming...</span>
                    ) : (
                      <>
                        <span>Confirm Reservation</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
