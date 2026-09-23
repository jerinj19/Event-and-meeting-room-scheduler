import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Header({ onToggleSidebar }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search state — strictly realtime data fetched from database, zero dummy data
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const searchContainerRef = useRef(null);

  // User profile state fetched from DB
  const [profile, setProfile] = useState(user);

  // 1. Fetch live user profile from database via /api/auth/me/
  useEffect(() => {
    if (user) setProfile(user);
    const token = localStorage.getItem('access_token');
    if (token) {
      fetch('http://localhost:8000/api/auth/me/', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setProfile(data);
            try {
              localStorage.setItem('user', JSON.stringify(data));
            } catch {
              // Ignore storage errors
            }
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // 2. Fetch live rooms from DRF backend to keep search suggestions strictly realtime
  const fetchLiveRooms = () => {
    const token = localStorage.getItem('access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch('http://127.0.0.1:8000/api/rooms/', { headers })
      .then((res) => {
        if (res.ok) return res.json();
        return fetch('http://localhost:8000/api/rooms/', { headers }).then((r) =>
          r.ok ? r.json() : null
        );
      })
      .then((data) => {
        if (data) {
          const list = Array.isArray(data) ? data : (data.results || []);
          const formatted = list.map((r) => ({
            id: r.id,
            name: r.name,
            location: r.location || '',
            hourlyRate: Number(r.hourly_rate ?? r.hourlyRate ?? 0),
            status: r.is_active ? 'Available' : 'In-Maintenance',
            amenities: Array.isArray(r.amenities)
              ? r.amenities.map((a) => (typeof a === 'string' ? a : a.name || ''))
              : [],
          }));
          setRooms(formatted);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchLiveRooms();
  }, []);

  // 3. Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 4. Compute matching rooms across Location, Amenities, and Room Name
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const matchingRooms = trimmedQuery
    ? rooms.filter((r) => {
        const matchName = r.name && r.name.toLowerCase().includes(trimmedQuery);
        const matchLocation = r.location && r.location.toLowerCase().includes(trimmedQuery);
        const matchAmenity =
          Array.isArray(r.amenities) &&
          r.amenities.some((a) => typeof a === 'string' && a.toLowerCase().includes(trimmedQuery));
        return matchName || matchLocation || matchAmenity;
      })
    : [];

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setIsDropdownOpen(false);
      navigate(`/rooms?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectRoom = (roomName) => {
    setIsDropdownOpen(false);
    navigate(`/rooms?search=${encodeURIComponent(roomName)}`);
  };

  // Derive real display name and initial from fetched profile
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
  const displayName = fullName || profile?.name || profile?.email?.split('@')[0] || 'User';
  const userEmail = profile?.email || 'user@innovyx.com';
  const initial = (
    displayName && displayName !== 'User' ? displayName.charAt(0) : userEmail.charAt(0) || 'U'
  ).toUpperCase();

  return (
    <header className="fixed top-0 inset-x-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Brandmark */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-slate-900 tracking-tight">Innovyx Rooms</span>
            <span className="hidden sm:inline-block text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium border border-slate-200">
              Workspace v2.4
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Global Search Bar across Name, Location & Amenities */}
      <div ref={searchContainerRef} className="hidden md:block relative w-80 lg:w-[420px]">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => {
              fetchLiveRooms();
              if (searchQuery.trim()) setIsDropdownOpen(true);
            }}
            placeholder="Search by location, amenities, room name..."
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsDropdownOpen(false);
              }}
              className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              aria-label="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>

        {/* Live Search Floating Results Dropdown */}
        {isDropdownOpen && trimmedQuery && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 animate-fade-in">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Matching Rooms, Locations &amp; Amenities
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {matchingRooms.length} {matchingRooms.length === 1 ? 'result' : 'results'}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {matchingRooms.length > 0 ? (
                matchingRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleSelectRoom(room.name)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50/70 transition flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition">
                          {room.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            room.status === 'Available'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{room.location || 'Bangalore'}</span>
                      </p>
                      {room.amenities && room.amenities.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          {room.amenities.slice(0, 3).map((amenity, idx) => (
                            <span
                              key={idx}
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                amenity.toLowerCase().includes(trimmedQuery)
                                  ? 'bg-blue-100 text-blue-700 font-semibold'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {amenity}
                            </span>
                          ))}
                          {room.amenities.length > 3 && (
                            <span className="text-[10px] text-slate-400">
                              +{room.amenities.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-xs font-bold text-slate-900">₹{room.hourlyRate}</span>
                      <span className="text-[10px] text-slate-500">/hr</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  No rooms matching "{searchQuery}" in location, amenities, or name.
                </div>
              )}
            </div>

            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>View all in Room Catalog</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          to="/book"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl transition shadow-xs shadow-blue-500/20"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Book Slot</span>
        </Link>

        <button
          type="button"
          aria-label="View notifications"
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        </button>

        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        {/* User Badge showing username fetched from the database */}
        <div className="flex items-center gap-2.5 pl-1" title={profile?.email || 'Logged In User'}>
          <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs sm:text-sm ring-2 ring-blue-500/30 shrink-0">
            {initial}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-sm font-semibold leading-tight text-slate-900">{displayName}</p>
            <p className="text-[11px] text-slate-500 truncate max-w-[150px]">{userEmail}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
