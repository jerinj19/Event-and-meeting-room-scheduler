import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useParams, useLocation, Link } from 'react-router-dom';
import TimeSlotPicker from '../components/booking/TimeSlotPicker';
import { isSlotPastOrCurrent } from '../components/booking/bookingConstants';
import BookingForm from '../components/booking/BookingForm';
import ConflictBanner from '../components/booking/ConflictBanner';
import { fetchWithAuth } from '../services/apiClient';

// Fallback room metadata matching catalog
const ROOM_FALLBACKS = {
  'room-1': {
    id: 'room-1',
    name: 'Boardroom Alpha',
    location: 'Building A • 4th Floor (West Wing)',
    capacity: 14,
    area: '1,200 sq ft',
    hourlyRate: 85,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    amenities: ['4K Screen', 'Polycom Video', 'Whiteboard', 'WiFi 6', 'Coffee Bar'],
  },
  'room-2': {
    id: 'room-2',
    name: 'Innovation Hub',
    location: 'Building B • 2nd Floor',
    capacity: 8,
    area: '750 sq ft',
    hourlyRate: 55,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80',
    amenities: ['Dual Display', 'Video Conf', 'Acoustic Baffles', 'Whiteboard', 'Coffee Bar'],
  },
  'room-3': {
    id: 'room-3',
    name: 'Executive Suite 301',
    location: 'Building A • 3rd Floor',
    capacity: 18,
    area: '1,450 sq ft',
    hourlyRate: 110,
    status: 'In-Maintenance',
    image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
    amenities: ['85" OLED', 'Audio Suite', 'Marble Table', 'WiFi 6'],
  },
  'room-4': {
    id: 'room-4',
    name: 'Focus Pod Gamma',
    location: 'Building B • 1st Floor',
    capacity: 4,
    area: '280 sq ft',
    hourlyRate: 30,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80',
    amenities: ['Display Screen', 'WiFi 6', 'Standing Desk'],
  },
  'room-5': {
    id: 'room-5',
    name: 'Creative Studio Delta',
    location: 'Building A • 2nd Floor East',
    capacity: 10,
    area: '900 sq ft',
    hourlyRate: 65,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80',
    amenities: ['Ultra-wide Screen', 'Glass Wall', 'Podcast Mic', 'WiFi 6'],
  },
  'room-6': {
    id: 'room-6',
    name: 'Acoustic Sprint Pod 102',
    location: 'Building B • 1st Floor West',
    capacity: 2,
    area: '160 sq ft',
    hourlyRate: 25,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
    amenities: ['NRC 0.9 Felt', 'WiFi 6', 'Ergonomic'],
  },
};

export default function BookRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId: paramRoomId } = useParams();
  const [searchParams] = useSearchParams();

  const queryRoomId = paramRoomId || searchParams.get('roomId') || location.state?.room?.id;
  const queryRoomName = searchParams.get('roomName') || location.state?.room?.name;

  const [apiRoom, setApiRoom] = useState(null);

  // Derive base room details from navigation state or catalog fallbacks
  const baseRoom = useMemo(() => {
    if (location.state?.room) return location.state.room;
    if (queryRoomId && ROOM_FALLBACKS[queryRoomId]) return ROOM_FALLBACKS[queryRoomId];
    return {
      id: queryRoomId || '',
      name: queryRoomName || 'Select a Meeting Room',
      location: 'Corporate Campus',
      capacity: 10,
      area: '800 sq ft',
      hourlyRate: 50,
      status: 'Available',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      amenities: ['4K Screen', 'WiFi 6'],
    };
  }, [location.state?.room, queryRoomId, queryRoomName]);

  const room = apiRoom || baseRoom;

  // Scheduling State — read selectedDate from RoomCatalog navigation state or query param if provided
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

  const [availableRooms, setAvailableRooms] = useState([]);

  // Fetch live room details and full rooms list from backend
  useEffect(() => {
    fetchWithAuth('http://127.0.0.1:8000/api/rooms/')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.results || [];
        if (list.length > 0) {
          setAvailableRooms(list);
          const matched = list.find((r) => r.id === queryRoomId);
          const target = matched || list[0];
          setApiRoom({
            ...target,
            image: target.image 
              ? (target.image.startsWith('http') ? target.image : `http://127.0.0.1:8000${target.image}`)
              : baseRoom.image || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
            amenities: Array.isArray(target.amenities)
              ? target.amenities
              : typeof target.amenities === 'string'
              ? target.amenities.split(' ').filter(Boolean)
              : ['4K Screen', 'WiFi 6'],
          });
        }
      })
      .catch(() => {});
  }, [queryRoomId, baseRoom]);

  // Check real-time slot availability for 24h day
  const fetchAvailability = React.useCallback(async () => {
    if (!room?.id || typeof room.id !== 'string' || room.id.length < 30) return;
    setIsLoadingAvailability(true);
    try {
      const startOfDay = new Date(`${selectedDate}T00:00:00`).toISOString();
      const endOfDay = new Date(`${selectedDate}T23:59:59`).toISOString();
      const res = await fetchWithAuth(
        `http://127.0.0.1:8000/api/bookings/check-availability/?room_id=${room.id}&start_time=${startOfDay}&end_time=${endOfDay}`
      );

      if (res.ok) {
        const data = await res.json();
        if (data.conflicts && data.conflicts.length > 0) {
          setBookedSlots(data.conflicts);
        } else {
          setBookedSlots([]);
        }
      }
    } catch {
      setBookedSlots([]);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [room?.id, selectedDate]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Deselect current slot if it is in the past/ongoing or booked on the selected day
  useEffect(() => {
    if (selectedSlot) {
      if (isSlotPastOrCurrent(selectedSlot, selectedDate)) {
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

    if (attendeesCount > (room.capacity || 14)) {
      alert(`Expected attendees exceeds room capacity of ${room.capacity || 14} people.`);
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
      const res = await fetchWithAuth('http://127.0.0.1:8000/api/bookings/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
            message: 'Slot Conflict: Another user just booked this room for the requested period.',
            details: {
              conflicts: [
                {
                  title: 'Team Standup Collision',
                  booked_by: 'colleague@innovyx.com',
                },
              ],
            },
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
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Subheader / Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Link to="/rooms" className="hover:text-slate-900 transition flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Rooms Catalog
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-semibold">{room.name}</span>
            <span>/</span>
            <span className="text-[#0051d5] font-semibold">Schedule & Reserve</span>
          </div>

          <Link
            to="/rooms"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0051d5] transition py-1 px-2.5 rounded-md hover:bg-blue-50/60"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Room Catalog
          </Link>
        </div>
      </div>

      {/* Main Workflow Canvas (2-Column Split View) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full">
        {bookingSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-fadeIn">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <div className="text-sm font-bold">Reservation Successfully Created!</div>
              <div className="text-xs text-emerald-700">Redirecting to your dashboard...</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Selected Room Overview (35% width) */}
          <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-24">
            {/* Card Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected Room</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active & Available
              </span>
            </div>

            {/* Room Selector Dropdown */}
            {availableRooms.length > 0 && (
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                <label className="text-[11px] font-semibold text-slate-600 shrink-0">Switch Room:</label>
                <select
                  value={room.id}
                  onChange={(e) => {
                    const found = availableRooms.find((r) => r.id === e.target.value);
                    if (found) {
                      setApiRoom({
                        ...found,
                        image: found.image || baseRoom.image,
                        amenities: Array.isArray(found.amenities)
                          ? found.amenities
                          : typeof found.amenities === 'string'
                          ? found.amenities.split(' ').filter(Boolean)
                          : ['4K Screen', 'WiFi 6'],
                      });
                    }
                  }}
                  className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
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
            <div className="relative w-full h-52 overflow-hidden bg-slate-100">
              <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-3 left-4 text-white">
                <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">{room.name}</h2>
                <p className="text-xs text-slate-200 drop-shadow-sm">{room.location}</p>
              </div>
            </div>

            {/* Specs & Amenities */}
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3 py-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Max Capacity
                  </div>
                  <div className="text-sm font-bold text-slate-900">{room.capacity} People Max</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    Room Size
                  </div>
                  <div className="text-sm font-bold text-slate-900">{room.area || '1,200 sq ft'}</div>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
                  Room Amenities
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {room.amenities &&
                    room.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/70"
                      >
                        <span className="text-[#0051d5] font-bold">✓</span>
                        {amenity}
                      </span>
                    ))}
                </div>
              </div>

              {/* Policy Box */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 flex items-start gap-2.5">
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
                Change Room
              </Link>
            </div>
          </aside>

          {/* RIGHT COLUMN: Scheduling & Booking Engine (65% width) */}
          <section className="lg:col-span-8 space-y-6">
            {/* Header Banner */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Select Date & Time Slot</h1>
                <span className="text-xs font-semibold text-[#0051d5] bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0051d5]"></span>
                  Step 1 of 2: Scheduling
                </span>
              </div>
              <p className="text-sm text-slate-500">
                Choose an available time slot to reserve {room.name} for your team session.
              </p>
            </div>

            {/* Conflict Banner when 409 error occurs */}
            <ConflictBanner error={conflictError} onRefresh={fetchAvailability} />

            {/* Step 1 & 2: TimeSlotPicker */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <TimeSlotPicker
                roomId={room?.id}
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
              room={room}
              selectedSlot={selectedSlot}
              title={title}
              onChangeTitle={setTitle}
              attendeesCount={attendeesCount}
              onChangeAttendees={setAttendeesCount}
              description={description}
              onChangeDescription={setDescription}
            />

            {/* Action Footer Strip */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0051d5] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Reservation Summary
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Reserving <span className="text-[#0051d5]">{room.name}</span> for {formattedSelectedDate} •{' '}
                    {selectedSlot ? selectedSlot.label : 'Select slot'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Link
                  to="/rooms"
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition text-center"
                >
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting || !selectedSlot}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#0051d5] hover:bg-[#0047be] active:bg-[#003ba0] disabled:opacity-50 rounded-xl shadow-md shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer"
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
      </div>
    </div>
  );
}
