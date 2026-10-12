import React, { useState } from 'react';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

export default function AdminAppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-body-md">
      {/* Top Fixed Header */}
      <AdminHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      {/* Responsive Navigation Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Routed Content Area */}
      <div className="flex-1 lg:ml-60 pt-16 flex flex-col">
        {children}
      </div>
    </div>
  );
}
