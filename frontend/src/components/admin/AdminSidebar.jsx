import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full p-4 bg-surface-container-lowest">
      {/* Top Section */}
      <div className="space-y-6">
        {/* Mobile Header in Drawer */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30 lg:hidden">
          <span className="font-bold text-on-surface text-sm">Admin Navigation</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition"
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="close">close</span>
          </button>
        </div>

        {/* Primary Links */}
        <div className="space-y-1.5">
          <NavLink
            to="/admin"
            end
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition ${
                isActive
                  ? 'text-primary bg-primary-container/10 border-l-4 border-primary shadow-sm'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container-low'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="dashboard">dashboard</span>
            <span>Admin Dashboard</span>
          </NavLink>

          <NavLink
            to="/admin/bookings"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition ${
                isActive
                  ? 'text-primary bg-primary-container/10 border-l-4 border-primary shadow-sm font-semibold'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container-low'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="list_alt">list_alt</span>
            <span>All Bookings</span>
          </NavLink>

          <NavLink
            to="/admin/rooms"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition ${
                isActive
                  ? 'text-primary bg-primary-container/10 border-l-4 border-primary shadow-sm font-semibold'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container-low'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px]" data-icon="meeting_room">meeting_room</span>
              <span>Manage Rooms</span>
            </div>
          </NavLink>
          
          <button
            type="button"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-secondary hover:text-on-surface hover:bg-surface-container-low font-medium text-xs sm:text-sm text-left transition"
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="analytics">analytics</span>
            <span>System Reports</span>
          </button>
        </div>
      </div>

      {/* Bottom Footer Section */}
      <div className="border-t border-outline-variant/30 pt-4 space-y-1">
        <button
          type="button"
          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container-low transition text-left"
        >
          <span className="material-symbols-outlined text-[18px]" data-icon="settings">settings</span>
          <span>Admin Settings</span>
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-error hover:text-error rounded-lg hover:bg-error-container/20 transition text-left"
        >
          <span className="material-symbols-outlined text-[18px]" data-icon="logout">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block fixed top-16 left-0 bottom-0 w-60 bg-surface-container-lowest border-r border-outline-variant/40 z-30">
        {navContent}
      </aside>

      {/* Mobile / Tablet Off-Canvas Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          {/* Drawer Viewport */}
          <aside className="fixed top-0 left-0 bottom-0 w-64 max-w-[80vw] bg-surface-container-lowest border-r border-outline-variant/40 z-50 shadow-2xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
