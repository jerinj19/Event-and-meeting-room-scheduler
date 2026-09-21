import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DashboardWelcome = () => {
  const { user } = useAuth();
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [nextMeeting, setNextMeeting] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/my-bookings/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const resData = await response.json();
          const data = resData.results ? resData.results : resData;
          
          setTotalCount(resData.count !== undefined ? resData.count : data.length);
          
          const now = new Date();
          const upcoming = data.filter(b => {
            const endDate = new Date(b.end_time);
            return endDate > now && b.status !== 'CANCELLED';
          });
          
          setUpcomingCount(upcoming.length);
          if (upcoming.length > 0) {
            setNextMeeting(upcoming[0].room?.name || 'Unknown Room');
          }
        }
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    
    fetchBookings();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Welcome Hero Section */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/40 shadow-[0_1px_3px_rgba(15,23,42,0.04)] relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary-container/5 to-transparent pointer-events-none"></div>
        <div className="space-y-1 z-10">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-label-xs font-label-xs bg-primary-fixed text-on-primary-fixed-variant font-medium">Enterprise HQ Sync</span>
            <span className="text-label-sm font-label-sm text-secondary">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <h1 className="text-headline-md font-headline-md text-on-surface font-bold tracking-tight">Welcome back, {user?.name?.split(' ')[0] || 'User'}</h1>
          <p className="text-body-md font-body-md text-secondary max-w-2xl">
            You have <strong className="text-on-surface font-semibold">{upcomingCount} upcoming reservations</strong>. Automated badge access is synchronized.
          </p>
        </div>
        <div className="flex items-center space-x-3 z-10 shrink-0">
          <button className="px-4 py-2 border border-outline-variant/60 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low text-title-sm font-title-sm transition-colors duration-150 flex items-center space-x-1.5">
            <span className="material-symbols-outlined text-[18px]" data-icon="tune">tune</span>
            <span>Room Filters</span>
          </button>
        </div>
      </section>

      {/* KPI Summary Bento Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-label-md font-label-md text-secondary font-medium">Upcoming</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]" data-icon="schedule">schedule</span>
            </div>
          </div>
          <div>
            <div className="text-headline-md font-headline-md font-bold text-on-surface">{upcomingCount} Meetings</div>
            <div className="text-body-sm font-body-sm text-primary font-medium mt-1 truncate">
              {nextMeeting ? `Next: ${nextMeeting}` : 'No upcoming meetings'}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-outline-variant/30 flex items-center text-label-xs font-label-xs text-outline">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
            Synced with schedule
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-label-md font-label-md text-secondary font-medium">Total History</span>
            <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-fixed">
              <span className="material-symbols-outlined text-[20px]" data-icon="event_available">event_available</span>
            </div>
          </div>
          <div>
            <div className="text-headline-md font-headline-md font-bold text-on-surface">{totalCount} Bookings</div>
            <div className="text-body-sm font-body-sm text-secondary mt-1">
              Recorded in your account
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-outline-variant/30 flex items-center text-label-xs font-label-xs text-secondary">
            <span className="material-symbols-outlined text-[14px] text-primary mr-1" data-icon="check_circle">check_circle</span>
            All data logged
          </div>
        </div>
        
        {/* Card 3 & 4 (Static for now to match UI) */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-label-md font-label-md text-secondary font-medium">Hours Reserved</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[20px]" data-icon="timelapse">timelapse</span>
            </div>
          </div>
          <div>
            <div className="text-headline-md font-headline-md font-bold text-on-surface">8.5 hrs</div>
            <div className="text-body-sm font-body-sm text-secondary mt-1">Logged this work week</div>
          </div>
          <div className="mt-3 pt-3 border-t border-outline-variant/30 flex items-center text-label-xs font-label-xs text-secondary">
            <span className="text-primary font-semibold mr-1">32%</span> of team allocation
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-label-md font-label-md text-secondary font-medium">Attendance Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <span className="material-symbols-outlined text-[20px]" data-icon="verified">verified</span>
            </div>
          </div>
          <div>
            <div className="text-headline-md font-headline-md font-bold text-on-surface">94%</div>
            <div className="text-body-sm font-body-sm text-emerald-700 font-medium mt-1">Verified check-in score</div>
          </div>
          <div className="mt-3 pt-3 border-t border-outline-variant/30 flex items-center text-label-xs font-label-xs text-outline">
            <span className="material-symbols-outlined text-[14px] text-emerald-600 mr-1" data-icon="thumb_up">thumb_up</span>
            Excellent space utilization
          </div>
        </div>
      </section>

      {/* Automated check-in notice banner */}
      <section className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-center text-primary shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[24px]" data-icon="contactless">contactless</span>
          </div>
          <div>
            <h4 className="font-title-sm text-title-sm font-semibold text-on-surface">Automated Presence Verification & Room Sync</h4>
            <p className="text-body-sm text-secondary">Rooms are automatically released back into the company pool if attendees do not tap badges or trigger motion sensors within 15 minutes of scheduled start time.</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button className="px-3.5 py-1.5 bg-surface-container-lowest hover:bg-surface-container-high border border-outline-variant/40 rounded-lg text-title-sm font-title-sm text-on-surface shadow-sm transition-colors">
            Configure Alerts
          </button>
        </div>
      </section>
    </div>
  );
};

export default DashboardWelcome;
