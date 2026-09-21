import React from 'react';
import BookingHistoryTable from '../components/dashboard/BookingHistoryTable';
import { useAuth } from '../contexts/AuthContext';
import './MyBookingsView.css';

// Mock Data representing API response
const MOCK_BOOKINGS = [
  {
    id: 1,
    roomName: 'Quantum Briefing Room 402',
    location: 'Building A, Floor 4',
    date: 'Oct 24, 2026',
    time: '09:00 - 11:30',
    status: 'CONFIRMED',
    imageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 2,
    roomName: 'Boardroom Alpha',
    location: 'Executive Wing',
    date: 'Oct 26, 2026',
    time: '14:00 - 15:00',
    status: 'CANCELLED',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=300&auto=format&fit=crop'
  }
];

const MyBookingsView = () => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-layout">
      {/* Mock Sidebar to represent Jerin's App Shell */}
      <aside className="dashboard-sidebar">
        <div className="brand">Innovyx Spaces</div>
        <nav>
          <a href="#" className="nav-item">Room Catalog</a>
          <a href="#" className="nav-item active">My Bookings</a>
        </nav>
        <div className="user-profile">
          <div className="avatar">
            {user?.name?.charAt(0) || 'P'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'Prashanth'}</span>
            <span className="logout-btn" onClick={logout}>Log out</span>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1 className="welcome-text">Welcome back, {user?.name?.split(' ')[0] || 'Prashanth'}</h1>
            <p className="welcome-subtext">Manage your upcoming reservations and past history.</p>
          </div>
        </header>

        <section className="dashboard-content">
          <div className="tabs">
            <button className="tab active">Upcoming Bookings</button>
            <button className="tab">Past Bookings</button>
          </div>
          
          <BookingHistoryTable bookings={MOCK_BOOKINGS} />
        </section>
      </main>
    </div>
  );
};

export default MyBookingsView;
