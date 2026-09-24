import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BookingHistoryTable from '../components/dashboard/BookingHistoryTable';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { fetchWithAuth } from '../services/apiClient';

const API_BASE = window.location.hostname === 'localhost' && window.location.port !== '8000'
  ? 'http://localhost:8000'
  : '';

const MyBookingsView = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const toast = useToast();

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`${API_BASE}/api/my-bookings/`);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const resData = await response.json();
      const data = resData.results ? resData.results : resData;
      
      const formatted = data.map(b => {
        const startDate = new Date(b.start_time);
        const endDate = new Date(b.end_time);
        
        // Ensure accurate past check based on current time
        const isPast = endDate < new Date();
        
        return {
          id: b.id,
          roomName: b.room_name || b.room?.name || 'Meeting Room',
          location: b.room_location || b.room?.location || 'Bangalore Campus',
          date: startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
          time: `${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
          duration: Math.max(15, Math.round((endDate - startDate) / 60000)),
          status: b.status, // e.g. "CONFIRMED" or "CANCELLED"
          capacity: b.room_capacity || b.room?.capacity || 8,
          imageUrl: b.room_image || b.room?.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=300',
          isPast: isPast
        }
      });
      setBookings(formatted);
    } catch (err) {
      toast.error('Could not load your bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user?.id, user?.email]);

  const upcomingBookings = bookings.filter(b => !b.isPast && b.status !== 'CANCELLED');
  const pastBookings = bookings.filter(b => b.isPast || b.status === 'CANCELLED');
  const displayedBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const handleExportCSV = () => {
    if (displayedBookings.length === 0) {
      toast.error('No reservations to export in this tab.');
      return;
    }

    const headers = ['Booking ID', 'Room Name', 'Location', 'Date', 'Time Slot', 'Duration (mins)', 'Status', 'Capacity'];
    const rows = displayedBookings.map(b => [
      `#${b.id}`,
      `"${(b.roomName || '').replace(/"/g, '""')}"`,
      `"${(b.location || '').replace(/"/g, '""')}"`,
      `"${b.date}"`,
      `"${b.time}"`,
      b.duration,
      b.status,
      b.capacity
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `my_bookings_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Bookings exported to CSV successfully!');
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
      {/* Header Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage your upcoming and past room reservations.</p>
        </div>
        <Link
          to="/rooms"
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0051d5] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Book a Room</span>
        </Link>
      </div>

      {/* Tab Navigation and Filter Controls */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-outline-variant/40 pb-2">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto w-full sm:w-auto">
            <button 
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 border-b-2 font-title-sm text-xs sm:text-sm transition-colors shrink-0 cursor-pointer ${activeTab === 'upcoming' ? 'border-primary-container text-primary font-semibold' : 'border-transparent text-secondary hover:text-on-surface font-medium'}`}>
              <span>Upcoming Bookings</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'upcoming' ? 'bg-primary-fixed text-primary font-bold' : 'bg-surface-container-high text-secondary font-medium'}`}>{upcomingBookings.length}</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('past')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 border-b-2 font-title-sm text-xs sm:text-sm transition-colors shrink-0 cursor-pointer ${activeTab === 'past' ? 'border-primary-container text-primary font-semibold' : 'border-transparent text-secondary hover:text-on-surface font-medium'}`}>
              <span>Past Bookings</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'past' ? 'bg-primary-fixed text-primary font-bold' : 'bg-surface-container-high text-secondary font-medium'}`}>{pastBookings.length}</span>
            </button>
          </div>
          <div className="flex items-center flex-wrap gap-2.5 self-start sm:self-auto">
            <button 
              type="button"
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant/50 hover:bg-surface-container-low text-secondary hover:text-on-surface text-xs font-medium rounded-lg shadow-sm transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[16px]" data-icon="download">download</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Bookings Data Table */}
        {loading ? (
          <div className="py-12 text-center text-secondary">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-medium">Loading your reservations...</p>
          </div>
        ) : displayedBookings.length === 0 ? (
          <div className="py-12 px-4 text-center text-secondary bg-surface-container-lowest rounded-2xl border border-outline-variant/40 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-low text-secondary flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl" data-icon="event_busy">event_busy</span>
            </div>
            <p className="text-sm font-semibold text-slate-700">No {activeTab} bookings found.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeTab === 'upcoming'
                ? "You don't have any upcoming reservations. Browse available spaces and reserve one for your team."
                : "You don't have any past reservations."}
            </p>
            {activeTab === 'upcoming' && (
              <div className="pt-2">
                <Link
                  to="/rooms"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0051d5] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">meeting_room</span>
                  <span>Browse Rooms & Book Now</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <BookingHistoryTable bookings={displayedBookings} onCancelSuccess={fetchBookings} />
        )}
      </section>
    </div>
  );
};

export default MyBookingsView;
