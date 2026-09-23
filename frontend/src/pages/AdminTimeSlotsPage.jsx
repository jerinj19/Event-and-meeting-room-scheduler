import React from 'react';
import AdminAppShell from '../components/admin/AdminAppShell';

export default function AdminTimeSlotsPage() {
  return (
    <AdminAppShell>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-on-surface mb-2">Manage Time Slots</h1>
        <p className="text-secondary text-sm">
          Time slots configuration module will be integrated here.
        </p>
      </div>
    </AdminAppShell>
  );
}
