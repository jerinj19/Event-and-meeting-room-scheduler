import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Header({ onToggleSidebar }) {
  const { user } = useAuth();
  
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

      {/* Center: Global Search Bar */}
      <div className="hidden md:flex items-center relative w-72 lg:w-96">
        <svg className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search rooms, floor, equipment..."
          className="w-full pl-9 pr-14 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
        />
        <span className="absolute right-2.5 text-[11px] text-slate-400 bg-white px-1.5 py-0.5 border border-slate-200 rounded-md font-mono">
          Ctrl+K
        </span>
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

        {/* User Badge */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-semibold flex items-center justify-center text-xs sm:text-sm ring-2 ring-blue-500/30">
            {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-sm font-semibold leading-tight text-slate-900">{user?.name || user?.full_name || 'User'}</p>
            <p className="text-[11px] text-slate-500">{user?.email || 'user@example.com'}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user');
              window.location.href = '/';
            }}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
