import React, { useState, useEffect } from 'react';
import BookingHistoryTable from '../components/dashboard/BookingHistoryTable';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const MyBookingsView = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const toast = useToast();

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/my-bookings/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
          roomName: b.room?.name || 'Unknown Room',
          location: b.room?.location || 'Unknown Location',
          date: startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
          time: `${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
          duration: Math.round((endDate - startDate) / 60000),
          status: b.status, // e.g. "CONFIRMED" or "CANCELLED"
          capacity: b.room?.capacity || 8,
          imageUrl: b.room?.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=300',
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
  }, []);

  const upcomingBookings = bookings.filter(b => !b.isPast && b.status !== 'CANCELLED');
  const pastBookings = bookings.filter(b => b.isPast || b.status === 'CANCELLED');
  const displayedBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Context */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your upcoming and past room reservations.</p>
      </div>

      {/* Tab Navigation and Filter Controls */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/40 pb-2">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-title-sm text-title-sm transition-colors ${activeTab === 'upcoming' ? 'border-primary-container text-primary font-semibold' : 'border-transparent text-secondary hover:text-on-surface font-medium'}`}>
              <span>Upcoming Bookings</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'upcoming' ? 'bg-primary-fixed text-primary font-bold' : 'bg-surface-container-high text-secondary font-medium'}`}>{upcomingBookings.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab('past')}
              className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-title-sm text-title-sm transition-colors ${activeTab === 'past' ? 'border-primary-container text-primary font-semibold' : 'border-transparent text-secondary hover:text-on-surface font-medium'}`}>
              <span>Past Bookings</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'past' ? 'bg-primary-fixed text-primary font-bold' : 'bg-surface-container-high text-secondary font-medium'}`}>{pastBookings.length}</span>
            </button>
          </div>
          <div className="flex items-center flex-wrap gap-2.5">
            <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant/50 hover:bg-surface-container-low text-secondary hover:text-on-surface text-body-sm font-body-sm rounded-lg shadow-sm transition-colors">
              <span className="material-symbols-outlined text-[16px]" data-icon="download">download</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Bookings Data Table */}
        {loading ? (
          <div className="py-8 text-center text-secondary">Loading your reservations...</div>
        ) : displayedBookings.length === 0 ? (
          <div className="py-8 text-center text-secondary bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            No {activeTab} bookings found.
          </div>
        ) : (
          <BookingHistoryTable bookings={displayedBookings} onCancelSuccess={fetchBookings} />
        )}
      </section>
    </div>
  );
};

export default MyBookingsView;
