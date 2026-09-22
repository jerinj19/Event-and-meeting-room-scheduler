import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminHeader({ onToggleSidebar }) {
  const { user } = useAuth();
  
  return (
    <header className="fixed top-0 inset-x-0 h-16 bg-surface-container-lowest border-b border-outline-variant/40 z-40 flex items-center justify-between px-4 sm:px-6 shadow-sm">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 rounded-xl text-secondary hover:text-on-surface hover:bg-surface-container-low transition focus:outline-none"
        >
          <span className="material-symbols-outlined" data-icon="menu">menu</span>
        </button>

        {/* Brandmark */}
        <Link to="/admin" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-on-primary font-bold shadow-sm shadow-primary/20 group-hover:bg-primary transition">
            <span className="material-symbols-outlined text-[20px]" data-icon="admin_panel_settings">admin_panel_settings</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-on-surface tracking-tight">Innovyx Admin</span>
            <span className="hidden sm:inline-block text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
              Operations Center
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden md:flex items-center relative w-72 lg:w-96">
        <span className="material-symbols-outlined absolute left-3 text-secondary text-sm pointer-events-none" data-icon="search">search</span>
        <input
          type="text"
          placeholder="Search bookings, users, rooms..."
          className="w-full pl-9 pr-14 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs sm:text-sm focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/20 transition"
        />
        <span className="absolute right-2.5 text-[10px] text-secondary bg-surface-container-low px-1.5 py-0.5 border border-outline-variant/40 rounded-md font-mono">
          Ctrl+K
        </span>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          aria-label="View alerts"
          className="relative p-2 rounded-xl text-secondary hover:text-on-surface hover:bg-surface-container-low transition"
        >
          <span className="material-symbols-outlined text-[20px]" data-icon="notifications">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full ring-2 ring-surface-container-lowest"></span>
        </button>

        <div className="h-6 w-px bg-outline-variant/40 hidden sm:block"></div>

        {/* User Badge */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-9 h-9 rounded-full bg-inverse-surface text-inverse-on-surface font-semibold flex items-center justify-center text-xs sm:text-sm">
            {(user?.first_name || user?.name || user?.email || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-sm font-semibold leading-tight text-on-surface">
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.name || 'Administrator')}
            </p>
            <p className="text-[11px] text-secondary">{user?.email || 'admin@innovyx.com'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
