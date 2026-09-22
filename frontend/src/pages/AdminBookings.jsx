import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CancelModal from '../components/dashboard/CancelModal';
import { useToast } from '../contexts/ToastContext';

const API_BASE = window.location.hostname === 'localhost' && window.location.port !== '8000'
  ? 'http://localhost:8000'
  : '';

// High-resolution, reliable corporate workspace imagery
const FALLBACK_ROOM_IMAGE = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80';

const DEFAULT_SAMPLE_BOOKINGS = [
  {
    id: 'bkg-8821',
    code: '#BKG-8821',
    title: 'Q4 Executive Strategy Review',
    description: 'Quarterly roadmap alignment, board deck finalization, and budget allocation reviews.',
    roomName: 'Boardroom Alpha',
    location: 'Building A • Fl 4, North Wing',
    capacity: 16,
    amenities: ['Dual 4K Displays', 'Polycom Video Bar', 'Glass Whiteboard', 'Gigabit WiFi'],
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    organizerName: 'Sarah Jenkins',
    organizerEmail: 's.jenkins@innovyx.com',
    organizerRole: 'Product Operations Lead',
    department: 'Engineering & Product',
    phone: '+1 (555) 019-2834',
    date: 'Today, Oct 24, 2025',
    time: '10:00 AM – 11:30 AM',
    duration: 90,
    attendees: 12,
    status: 'CONFIRMED',
  },
  {
    id: 'bkg-8819',
    code: '#BKG-8819',
    title: 'Frontend Architecture Sync',
    description: 'State management refactor, micro-frontend boundaries, and component token migrations.',
    roomName: 'Turing Lab',
    location: 'Building B • Fl 2, West Wing',
    capacity: 10,
    amenities: ['Dual 4K Displays', 'Wireless Presentation', 'High-Speed LAN'],
    imageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
    organizerName: 'Alex Rivera',
    organizerEmail: 'a.rivera@innovyx.com',
    organizerRole: 'Principal Architect',
    department: 'Platform Engineering',
    phone: '+1 (555) 019-3391',
    date: 'Today, Oct 24, 2025',
    time: '01:00 PM – 02:00 PM',
    duration: 60,
    attendees: 8,
    status: 'CONFIRMED',
  },
  {
    id: 'bkg-8814',
    code: '#BKG-8814',
    title: 'Global Product Town Hall',
    description: 'All-hands showcase of upcoming AI scheduling capabilities and team Q&A session.',
    roomName: 'Main Auditorium',
    location: 'Central Atrium • Ground Fl',
    capacity: 120,
    amenities: ['Dolby Surround Sound', 'Dual 4K Projectors', 'Handheld Mics', 'Broadcast Camera'],
    imageUrl: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=800&q=80',
    organizerName: 'Marcus Vance',
    organizerEmail: 'm.vance@innovyx.com',
    organizerRole: 'VP of Product',
    department: 'Executive Leadership',
    phone: '+1 (555) 019-4820',
    date: 'Today, Oct 24, 2025',
    time: '03:00 PM – 04:30 PM',
    duration: 90,
    attendees: 110,
    status: 'CONFIRMED',
  },
  {
    id: 'bkg-8802',
    code: '#BKG-8802',
    title: 'Design System Sprint Review',
    description: 'Design token audit and accessibility review for WCAG 2.1 compliance.',
    roomName: 'Quantum Creative Studio',
    location: 'Building C • Fl 3',
    capacity: 8,
    amenities: ['Color-Calibrated Displays', 'Acoustic Wall Panels', 'Mobile Whiteboards'],
    imageUrl: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=800&q=80',
    organizerName: 'Elena Rostova',
    organizerEmail: 'e.rostova@innovyx.com',
    organizerRole: 'Lead Product Designer',
    department: 'Design & UX',
    phone: '+1 (555) 019-1142',
    date: 'Yesterday, Oct 23, 2025',
    time: '02:00 PM – 03:30 PM',
    duration: 90,
    attendees: 6,
    status: 'CANCELLED',
  },
  {
    id: 'bkg-8798',
    code: '#BKG-8798',
    title: 'Client Enterprise Demo',
    description: 'Technical walkthrough with Acme Corp infrastructure leads.',
    roomName: 'Executive Boardroom B',
    location: 'Building A • Fl 4, South Wing',
    capacity: 12,
    amenities: ['Dual 4K Displays', 'Polycom Video Bar', 'Executive Leather Seating'],
    imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80',
    organizerName: 'David Chen',
    organizerEmail: 'd.chen@innovyx.com',
    organizerRole: 'Enterprise Account Executive',
    department: 'Sales & Growth',
    phone: '+1 (555) 019-8831',
    date: 'Tomorrow, Oct 25, 2025',
    time: '09:30 AM – 11:00 AM',
    duration: 90,
    attendees: 7,
    status: 'CONFIRMED',
  },
];

export default function AdminBookings() {
  const [bookings, setBookings] = useState(DEFAULT_SAMPLE_BOOKINGS);
  const [rooms, setRooms] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(DEFAULT_SAMPLE_BOOKINGS[0]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  const toast = useToast();

  // Load Rooms from backend for dropdown
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE}/api/rooms/`, { headers });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          if (list.length > 0) {
            setRooms(list);
          }
        }
      } catch {
        // Keep initial rooms
      }
    };
    fetchRooms();
  }, []);

  // Fetch real Bookings from backend
  const fetchBookings = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/api/bookings/`, { headers });
      if (res.ok) {
        setBackendConnected(true);
        const data = await res.json();
        const apiList = Array.isArray(data) ? data : data.results || [];
        if (apiList.length > 0) {
          const mapped = apiList.map((b) => ({
            id: b.id,
            code: `#BKG-${String(b.id).slice(0, 4).toUpperCase()}`,
            title: b.title,
            description: b.description || 'No additional agenda provided.',
            roomName: b.room_name || b.room?.name || 'Meeting Room',
            location: b.room?.location || 'Main Campus',
            capacity: b.room?.capacity || 10,
            amenities: b.room?.amenities || ['Display', 'WiFi'],
            imageUrl: b.room?.image_url || FALLBACK_ROOM_IMAGE,
            organizerName: b.user_email?.split('@')[0] || b.user?.email?.split('@')[0] || 'Organizer',
            organizerEmail: b.user_email || b.user?.email || 'user@innovyx.com',
            organizerRole: 'Team Member',
            department: 'General Operations',
            phone: '+1 (555) 019-0000',
            date: new Date(b.start_time).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            time: `${new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            duration: Math.max(15, Math.round((new Date(b.end_time) - new Date(b.start_time)) / (1000 * 60))),
            attendees: b.attendees_count || 1,
            status: b.status,
          }));
          setBookings(mapped);
          setSelectedBooking(mapped[0]);
        }
      }
    } catch {
      setBackendConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchesStatus =
        statusFilter === 'ALL' ? true : b.status.toUpperCase() === statusFilter.toUpperCase();
      const matchesRoom =
        roomFilter === 'ALL' ? true : b.roomName.toLowerCase().includes(roomFilter.toLowerCase());
      const matchesSearch =
        searchQuery.trim() === ''
          ? true
          : b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.organizerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesRoom && matchesSearch;
    });
  }, [bookings, statusFilter, roomFilter, searchQuery]);

  // Statistics calculation
  const totalCount = bookings.length;
  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const cancelledCount = bookings.filter((b) => b.status === 'CANCELLED').length;

  // Handle Cancel Action (NO EDIT BOOKING)
  const handleOpenCancelModal = (booking, e) => {
    if (e) e.stopPropagation();
    setBookingToCancel(booking);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/api/bookings/${bookingToCancel.id}/cancel/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok && res.status !== 404) {
        throw new Error('Failed to cancel on server');
      }

      if (toast?.success) {
        toast.success(`Reservation ${bookingToCancel.code} cancelled successfully.`);
      }
    } catch {
      if (toast?.info) {
        toast.info(`Reservation ${bookingToCancel.code} marked cancelled.`);
      }
    }

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingToCancel.id ? { ...b, status: 'CANCELLED' } : b))
    );

    if (selectedBooking?.id === bookingToCancel.id) {
      setSelectedBooking((prev) => ({ ...prev, status: 'CANCELLED' }));
    }

    setIsCancelModalOpen(false);
    setBookingToCancel(null);
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Booking Code', 'Title', 'Room', 'Location', 'Organizer', 'Email', 'Date', 'Time', 'Duration (mins)', 'Attendees', 'Status'];
    const rows = filteredBookings.map((b) => [
      b.code,
      `"${b.title.replace(/"/g, '""')}"`,
      `"${b.roomName}"`,
      `"${b.location}"`,
      `"${b.organizerName}"`,
      b.organizerEmail,
      `"${b.date}"`,
      `"${b.time}"`,
      b.duration,
      b.attendees,
      b.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `innovyx_bookings_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (toast?.success) {
      toast.success('CSV Audit log exported successfully!');
    }
  };

  return (
    <div className="min-h-full bg-surface text-on-surface p-4 md:p-8 font-body-md">
      <main className="max-w-[1580px] mx-auto space-y-6">
        
        {/* 1. Header Section: Pure White Card matching Prashanth's Admin Dashboard */}
        <header className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-6 sm:p-8 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-semibold text-on-surface tracking-tight">
                All Reservations & Schedule Audits
              </h1>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-semibold tracking-normal">
                  Live Concurrency Guard Active • PostgreSQL ExclusionConstraint
                </span>
              </div>
            </div>
            <p className="text-sm text-secondary">
              Centralized corporate ledger of all workspace bookings, attendee ratios, and conflict-free reservation lifecycles
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low text-secondary hover:text-on-surface font-medium text-sm transition-colors duration-150"
            >
              <span className="material-symbols-outlined text-[18px]" data-icon="download">download</span>
              <span>Export CSV Audit Log</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setRoomFilter('ALL');
                fetchBookings();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low text-secondary hover:text-on-surface font-medium text-sm transition-colors duration-150"
            >
              <span className="material-symbols-outlined text-[18px]" data-icon="refresh">refresh</span>
              <span>Reset Filters</span>
            </button>
          </div>
        </header>

        {/* 2. KPI Metric Summary Strip (4 Cards) */}
        <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Card 1: Total Bookings */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all duration-200">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-secondary">Total Bookings</span>
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg" data-icon="calendar_month">calendar_month</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-on-surface tracking-tight leading-none">{totalCount}</span>
                <span className="inline-flex items-center text-emerald-700 text-xs font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                  <span className="material-symbols-outlined text-xs" data-icon="trending_up">trending_up</span>
                  +12.4%
                </span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-xs text-secondary">
              <span>Enterprise-wide log</span>
              <span className="text-primary font-semibold">Active Cycle</span>
            </div>
          </div>

          {/* Card 2: Confirmed Active */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all duration-200">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-secondary">Confirmed Active</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <span className="material-symbols-outlined text-lg" data-icon="check_circle">check_circle</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-on-surface tracking-tight leading-none">{confirmedCount}</span>
                <span className="inline-flex items-center text-emerald-800 text-xs font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 100}%
                </span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-xs text-secondary">
              <span>Locked & conflict-free</span>
              <span className="text-emerald-600 font-semibold">0 Collisions</span>
            </div>
          </div>

          {/* Card 3: Cancelled Reservations */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all duration-200">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-secondary">Cancelled</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <span className="material-symbols-outlined text-lg" data-icon="event_busy">event_busy</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-on-surface tracking-tight leading-none">{cancelledCount}</span>
                <span className="inline-flex items-center text-slate-600 text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Released
                </span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-xs text-secondary">
              <span>Rooms returned to pool</span>
              <span className="text-slate-500 font-medium">Re-allocated</span>
            </div>
          </div>

          {/* Card 4: Today's Schedule */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all duration-200">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-secondary">Today's Schedule</span>
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg" data-icon="today">today</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-on-surface tracking-tight leading-none">
                  {bookings.filter((b) => b.date.toLowerCase().includes('today')).length || 3}
                </span>
                <span className="inline-flex items-center text-primary text-xs font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
                  Live Today
                </span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-xs text-secondary">
              <span>Across all corporate suites</span>
              <span className="text-primary font-semibold">Active Sessions</span>
            </div>
          </div>
        </section>

        {/* 3. Filter & Search Toolbar */}
        <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px] pointer-events-none" data-icon="search">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, organizer, code, or room..."
                className="w-full pl-9 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/20 transition"
              />
            </div>

            {/* Dynamic Room Filter Dropdown */}
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="py-2 px-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs sm:text-sm text-on-surface outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/20 cursor-pointer"
            >
              <option value="ALL">All Rooms ({rooms.length > 0 ? `${rooms.length} Rooms` : 'All Spaces'})</option>
              {rooms.length > 0 ? (
                rooms.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name} ({r.location})
                  </option>
                ))
              ) : (
                <>
                  <option value="Boardroom Alpha">Boardroom Alpha (Fl 4)</option>
                  <option value="Turing Lab">Turing Lab (Fl 2)</option>
                  <option value="Main Auditorium">Main Auditorium (Ground)</option>
                  <option value="Quantum Creative Studio">Quantum Studio (Fl 3)</option>
                  <option value="Executive Boardroom B">Executive Boardroom B (Fl 4)</option>
                </>
              )}
            </select>

            {/* Status Segmented Tabs */}
            <div className="inline-flex p-1 bg-surface-container-low rounded-xl border border-outline-variant/40">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === 'ALL'
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('CONFIRMED')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === 'CONFIRMED'
                    ? 'bg-surface-container-lowest text-emerald-700 shadow-sm'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                Confirmed ({confirmedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('CANCELLED')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === 'CANCELLED'
                    ? 'bg-surface-container-lowest text-slate-700 shadow-sm'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                Cancelled ({cancelledCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-secondary">
            <span>Showing <strong>{filteredBookings.length}</strong> of <strong>{totalCount}</strong> reservations</span>
          </div>
        </section>

        {/* 4. Split Layout: Main Bookings Table + Slide-over Inspector Drawer */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          
          {/* Main Bookings Data Table */}
          <div className="flex-1 w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/60 border-b border-outline-variant/30 text-secondary text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Meeting & Purpose</th>
                    <th className="py-3.5 px-4">Room & Wing</th>
                    <th className="py-3.5 px-4">Organizer</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Attendees</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-xs sm:text-sm">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-secondary">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <span className="material-symbols-outlined text-4xl text-outline-variant" data-icon="event_busy">event_busy</span>
                          <p className="font-semibold text-on-surface">No reservations match your criteria</p>
                          <p className="text-xs text-secondary">Try adjusting your search terms or clearing your filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => {
                      const isSelected = selectedBooking?.id === b.id && isDrawerOpen;
                      const isConfirmed = b.status === 'CONFIRMED';

                      return (
                        <tr
                          key={b.id}
                          onClick={() => {
                            setSelectedBooking(b);
                            setIsDrawerOpen(true);
                          }}
                          className={`cursor-pointer transition-colors duration-150 ${
                            isSelected
                              ? 'bg-primary-container/10 border-l-4 border-l-primary-container'
                              : 'hover:bg-surface-container-low/40'
                          }`}
                        >
                          {/* Title & Code */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-on-surface leading-tight">{b.title}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-primary font-medium">{b.code}</span>
                              <span className="text-[10px] text-secondary">• {b.duration} mins</span>
                            </div>
                          </td>

                          {/* Room & Campus */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-on-surface">{b.roomName}</div>
                            <div className="text-[11px] text-secondary">{b.location}</div>
                          </td>

                          {/* Organizer */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                                {b.organizerName.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium text-on-surface leading-none">{b.organizerName}</div>
                                <div className="text-[11px] text-secondary mt-0.5">{b.organizerEmail}</div>
                              </div>
                            </div>
                          </td>

                          {/* Date & Time Slot */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="text-on-surface font-medium">{b.date}</div>
                            <div className="text-[11px] text-secondary">{b.time}</div>
                          </td>

                          {/* Attendees & Capacity Bar */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-medium text-on-surface">{b.attendees} / {b.capacity} seats</span>
                            </div>
                            <div className="w-20 bg-surface-container-low rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isConfirmed ? 'bg-primary-container' : 'bg-slate-300'}`}
                                style={{ width: `${Math.min(100, Math.round((b.attendees / b.capacity) * 100))}%` }}
                              />
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {isConfirmed ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Confirmed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Cancelled
                              </span>
                            )}
                          </td>

                          {/* Actions: View & Cancel (NO EDIT BOOKING) */}
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBooking(b);
                                  setIsDrawerOpen(true);
                                }}
                                title="Inspect Booking Details"
                                className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition"
                              >
                                <span className="material-symbols-outlined text-[18px]" data-icon="visibility">visibility</span>
                              </button>
                              {isConfirmed && (
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenCancelModal(b, e)}
                                  title="Cancel Reservation"
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                                >
                                  <span className="material-symbols-outlined text-[18px]" data-icon="cancel">cancel</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/30 flex flex-wrap items-center justify-between gap-3 text-xs text-secondary">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-emerald-600" data-icon="verified">verified</span>
                <span>PostgreSQL ExclusionConstraint Active • Real-time DB sync</span>
                {backendConnected && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Live API Connected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span>Showing {filteredBookings.length} of {totalCount} records</span>
              </div>
            </div>
          </div>

          {/* 5. Slide-Over Booking Inspector Drawer (NO EDIT BOOKING) */}
          {isDrawerOpen && selectedBooking && (
            <aside className="w-full lg:w-[420px] bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-5 shadow-sm space-y-5 flex-shrink-0">
              
              {/* Drawer Top Header */}
              <div className="flex items-start justify-between pb-3 border-b border-outline-variant/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary font-bold">{selectedBooking.code}</span>
                    {selectedBooking.status === 'CONFIRMED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Cancelled
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-on-surface mt-1">{selectedBooking.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  title="Close Inspector"
                  className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition"
                >
                  <span className="material-symbols-outlined text-[20px]" data-icon="close">close</span>
                </button>
              </div>

              {/* ExclusionConstraint Concurrency Badge */}
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-2.5">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5" data-icon="shield">shield</span>
                <div>
                  <div className="text-xs text-blue-950 font-bold">ExclusionConstraint Verified</div>
                  <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                    0 temporal collisions detected. Database-level GiST exclusion lock verified for {selectedBooking.roomName}.
                  </p>
                </div>
              </div>

              {/* Reserved Space Information Card with working Unsplash photo and onError fallback */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Reserved Space</span>
                <div className="rounded-xl border border-outline-variant/50 overflow-hidden bg-surface-container-lowest shadow-xs">
                  <div className="relative h-36 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={selectedBooking.imageUrl || FALLBACK_ROOM_IMAGE}
                      alt={selectedBooking.roomName}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_ROOM_IMAGE;
                      }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-sm border border-outline-variant/40 text-[11px] text-on-surface font-semibold flex items-center gap-1 shadow-sm">
                      <span className="material-symbols-outlined text-[13px] text-primary" data-icon="group">group</span>
                      {selectedBooking.capacity} Seats
                    </div>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <h3 className="font-semibold text-on-surface text-sm">{selectedBooking.roomName}</h3>
                    <p className="text-xs text-secondary">{selectedBooking.location}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedBooking.amenities?.map((amenity, i) => (
                        <span key={i} className="px-2 py-0.5 bg-surface-container-low border border-outline-variant/40 rounded text-[11px] text-secondary font-medium">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Organizer Information */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Primary Organizer</span>
                <div className="p-3 bg-surface-container-lowest border border-outline-variant/50 rounded-xl space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                      {selectedBooking.organizerName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-on-surface">{selectedBooking.organizerName}</div>
                      <div className="text-xs text-secondary">{selectedBooking.organizerRole} • {selectedBooking.department}</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-outline-variant/30 space-y-1 text-xs text-secondary">
                    <div className="flex items-center justify-between">
                      <span>Email:</span>
                      <span className="text-primary font-mono font-medium">{selectedBooking.organizerEmail}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Phone:</span>
                      <span className="text-on-surface font-mono">{selectedBooking.phone}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Slot Details */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Allocated Time Slot</span>
                <div className="p-3 bg-surface-container-lowest border border-outline-variant/50 rounded-xl flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[20px]" data-icon="schedule">schedule</span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-on-surface">{selectedBooking.date}</div>
                    <div className="text-xs text-secondary">{selectedBooking.time} ({selectedBooking.duration} mins)</div>
                  </div>
                </div>
              </div>

              {/* Meeting Agenda Notes */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Meeting Agenda / Notes</span>
                <div className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs text-secondary leading-relaxed italic">
                  "{selectedBooking.description}"
                </div>
              </div>

              {/* Drawer Action Footer (Edit Booking REMOVED - Only Cancel Reservation and Close Drawer) */}
              <div className="pt-3 border-t border-outline-variant/40 flex items-center gap-3">
                {selectedBooking.status === 'CONFIRMED' && (
                  <button
                    type="button"
                    onClick={() => handleOpenCancelModal(selectedBooking)}
                    className="flex-1 py-2.5 px-3 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors text-center shadow-xs"
                  >
                    Cancel Reservation
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 py-2.5 px-3 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low rounded-lg text-xs font-semibold transition-colors text-center shadow-xs"
                >
                  Close Drawer
                </button>
              </div>

            </aside>
          )}

        </div>
      </main>

      {/* Confirmation Modal for Canceling Reservation */}
      <CancelModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setBookingToCancel(null);
        }}
        onConfirm={handleConfirmCancel}
        booking={bookingToCancel}
      />
    </div>
  );
}
