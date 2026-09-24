import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AdminRoomTable from '../components/admin/AdminRoomTable';
import AdminRoomModal from '../components/admin/AdminRoomModal';
import DeleteConfirmModal from '../components/admin/DeleteConfirmModal';
import roomService from '../services/roomService';
import { useToast } from '../contexts/ToastContext';

export default function AdminRoomsPage() {
  const toast = useToast();

  // Rooms Data State
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filter & Search Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCapacity, setSelectedCapacity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Modal Dialog States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Delete Confirm Dialog State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  /**
   * Fetch all rooms from DRF backend
   */
  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await roomService.getRooms();
      if (Array.isArray(data)) {
        setRooms(data);
      } else {
        setRooms([]);
      }
    } catch {
      setRooms([]);
      toast.error('Unable to fetch rooms from backend database. Please ensure server is running.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  /**
   * Calculate dynamic KPI stats based on current room inventory
   */
  const kpiStats = useMemo(() => {
    const total = rooms.length;
    const active = rooms.filter((r) => r.is_active).length;
    const inactive = total - active;
    const activePercentage = total > 0 ? ((active / total) * 100).toFixed(1) : 0;

    return {
      total,
      active,
      inactive,
      activePercentage,
    };
  }, [rooms]);

  /**
   * Filter rooms by search keyword, capacity, and status
   */
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // 1. Multi-attribute Search filter (name, location, code, amenities)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = room.name?.toLowerCase().includes(query);
        const matchesLocation = room.location?.toLowerCase().includes(query);
        const matchesCode = room.code?.toLowerCase().includes(query);
        const matchesAmenities = Array.isArray(room.amenities) && room.amenities.some((a) =>
          typeof a === 'string' && a.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesLocation && !matchesCode && !matchesAmenities) return false;
      }

      // 2. Capacity filter
      if (selectedCapacity !== 'all') {
        const cap = Number(room.capacity);
        if (selectedCapacity === 'small' && (cap < 1 || cap > 4)) return false;
        if (selectedCapacity === 'medium' && (cap < 5 || cap > 10)) return false;
        if (selectedCapacity === 'large' && (cap < 11 || cap > 20)) return false;
        if (selectedCapacity === 'executive' && cap <= 20) return false;
      }

      // 3. Status filter
      if (selectedStatus === 'active' && !room.is_active) return false;
      if (selectedStatus === 'inactive' && room.is_active) return false;

      return true;
    });
  }, [rooms, searchTerm, selectedCapacity, selectedStatus]);

  /**
   * Open modal for creating a new room
   */
  const handleOpenCreateModal = () => {
    setEditingRoom(null);
    setIsModalOpen(true);
  };

  /**
   * Open modal for editing an existing room
   */
  const handleOpenEditModal = (room) => {
    setEditingRoom(room);
    setIsModalOpen(true);
  };

  /**
   * Save handler for Create and Edit operations
   */
  const handleSaveRoom = async (formData) => {
    setModalSubmitting(true);
    try {
      if (editingRoom) {
        // UPDATE (PATCH)
        const updated = await roomService.updateRoom(editingRoom.id, formData);
        setRooms((prev) =>
          prev.map((r) => (r.id === editingRoom.id ? { ...r, ...updated, ...formData } : r))
        );
        toast.success(`Room "${formData.name}" updated successfully!`);
      } else {
        // CREATE (POST)
        const created = await roomService.createRoom(formData);
        setRooms((prev) => [created, ...prev]);
        toast.success(`Room "${formData.name}" created and published!`);
      }

      setIsModalOpen(false);
      setEditingRoom(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save room to database.');
    } finally {
      setModalSubmitting(false);
    }
  };

  /**
   * Quick toggle room operational status
   */
  const handleToggleStatus = async (room) => {
    setActionLoadingId(room.id);
    const newStatus = !room.is_active;

    try {
      await roomService.toggleRoomStatus(room.id, room.is_active);
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, is_active: newStatus } : r))
      );

      toast.info(
        `Room "${room.name}" marked as ${newStatus ? 'Active' : 'Under Maintenance'}.`
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update room status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * Open Delete confirmation dialog
   */
  const handleOpenDeleteModal = (room) => {
    // If opened from inside edit modal, close the edit modal
    setIsModalOpen(false);
    setRoomToDelete(room);
    setIsDeleteModalOpen(true);
  };

  /**
   * Confirm Delete action
   */
  const handleConfirmDelete = async (roomId) => {
    setDeleteSubmitting(true);
    try {
      await roomService.deleteRoom(roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      toast.success('Room has been successfully deleted.');
      setIsDeleteModalOpen(false);
      setRoomToDelete(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete room.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  /**
   * Export rooms as CSV
   */
  const handleExportCSV = () => {
    if (filteredRooms.length === 0) {
      toast.error('No rooms to export.');
      return;
    }

    const headers = ['ID', 'Name', 'Location', 'Capacity', 'Status', 'Amenities', 'Hourly Rate'];
    const rows = filteredRooms.map((r) => [
      `"${r.id}"`,
      `"${r.name}"`,
      `"${r.location}"`,
      r.capacity,
      r.is_active ? 'Active' : 'Maintenance',
      `"${(r.amenities || []).join(', ')}"`,
      r.hourlyRate || 85,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `innovyx_rooms_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Rooms list exported to CSV.');
  };

  return (
    <div className="min-h-full bg-surface text-on-surface p-4 md:p-8 font-body-md">
      <main className="max-w-[1600px] mx-auto space-y-7">
        
        {/* Top Breadcrumb & Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-secondary font-medium">
              <span>Admin</span>
              <span>›</span>
              <span>Spaces</span>
              <span>›</span>
              <span className="text-on-surface font-semibold">Room Management</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                Room Management (Admin)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-container/10 text-primary border border-primary/20">
                Enterprise Grid
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low text-secondary hover:text-on-surface font-medium text-xs sm:text-sm transition"
            >
              <span className="material-symbols-outlined text-[18px]" data-icon="ios_share">ios_share</span>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white font-medium text-xs sm:text-sm hover:bg-primary/90 shadow-sm transition"
            >
              <span className="material-symbols-outlined text-[18px]" data-icon="add">add</span>
              <span>Create New Room</span>
            </button>
          </div>
        </div>

        {/* 1. KPI Metric Summary Cards (Top 3 Cards Grid) */}
        <section aria-label="Room Fleet Metrics" className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          
          {/* Card 1: Total Rooms */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-primary/40 transition">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Total Rooms</span>
                <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg" data-icon="meeting_room">meeting_room</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-4xl font-bold text-on-surface tracking-tight leading-none">{kpiStats.total}</span>
                <span className="inline-flex items-center text-primary text-[11px] font-semibold bg-primary-container/15 px-2 py-0.5 rounded">
                  {kpiStats.total} Registered
                </span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-outline-variant/30 text-xs text-secondary">
              Registered workspace units
            </div>
          </div>

          {/* Card 2: Active Rooms */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-emerald-400 transition">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Active Rooms</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
                  <span className="material-symbols-outlined text-lg" data-icon="check_circle">check_circle</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-4xl font-bold text-on-surface tracking-tight leading-none">{kpiStats.active}</span>
                <span className="inline-flex items-center text-emerald-700 text-[11px] font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  {kpiStats.activePercentage}% Live
                </span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-outline-variant/30 text-xs text-secondary">
              Ready for instant reservation
            </div>
          </div>

          {/* Card 3: In Maintenance */}
          <div className="bg-surface-container-lowest border border-amber-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-amber-400 transition">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">In Maintenance</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                  <span className="material-symbols-outlined text-lg" data-icon="engineering">engineering</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-4xl font-bold text-on-surface tracking-tight leading-none">{kpiStats.inactive}</span>
                <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  kpiStats.inactive > 0
                    ? 'text-amber-800 bg-amber-50 border-amber-200'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                }`}>
                  {kpiStats.inactive > 0 ? `${kpiStats.inactive} Offline` : 'All Operational'}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-outline-variant/30 text-xs text-secondary">
              Unavailable for public slotting
            </div>
          </div>

        </section>

        {/* 2. Action Toolbar (Search, Filter, View Switcher, Refresh) */}
        <section aria-label="Room Filter Controls" className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-sm" data-icon="search">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by room name, location, or equip..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Faceted Dropdowns & View Toggles */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Capacity Dropdown */}
            <select
              value={selectedCapacity}
              onChange={(e) => setSelectedCapacity(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none"
            >
              <option value="all">All Capacities</option>
              <option value="small">Small (1–4 Seats)</option>
              <option value="medium">Medium (5–10 Seats)</option>
              <option value="large">Large (11–20 Seats)</option>
              <option value="executive">Boardroom (20+ Seats)</option>
            </select>

            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Maintenance / Inactive</option>
            </select>

            {/* View Switcher Toggle (Table vs Cards) */}
            <div className="inline-flex p-0.5 bg-surface-container-low rounded-lg border border-outline-variant/40">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table View"
                className={`p-1.5 rounded transition ${
                  viewMode === 'table'
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]" data-icon="table_rows">table_rows</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Card Grid View"
                className={`p-1.5 rounded transition ${
                  viewMode === 'grid'
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]" data-icon="grid_view">grid_view</span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadRooms}
              title="Refresh Room List"
              className="p-2 rounded-lg border border-outline-variant hover:bg-surface-container-low text-secondary hover:text-on-surface transition"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`} data-icon="refresh">
                refresh
              </span>
            </button>

          </div>
        </section>

        {/* 3. Main Data Presentation: Table View or Card Grid View */}
        {viewMode === 'table' ? (
          <AdminRoomTable
            rooms={filteredRooms}
            loading={loading}
            onEdit={handleOpenEditModal}
            onToggleStatus={handleToggleStatus}
            onDelete={handleOpenDeleteModal}
            onCreateNew={handleOpenCreateModal}
            actionLoadingId={actionLoadingId}
          />
        ) : filteredRooms.length === 0 ? (
          /* Card Grid View Empty State */
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-secondary mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl" data-icon="meeting_room">meeting_room</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface">No meeting rooms found</h3>
            <p className="text-xs text-secondary max-w-sm mx-auto mt-1 mb-6">
              No rooms matched your search filters, or no rooms have been registered yet.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition"
            >
              <span className="material-symbols-outlined text-[16px]" data-icon="add">add</span>
              <span>Create New Room</span>
            </button>
          </div>
        ) : (
          /* Card Grid View representation */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => {
              const rawImage = room.image;
              const roomImage = typeof rawImage === 'string' && rawImage.startsWith('/media/')
                ? `http://localhost:8000${rawImage}`
                : rawImage;
              return (
                <div
                  key={room.id}
                  className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition"
                >
                  <div className="relative h-44 overflow-hidden bg-surface-container-low flex items-center justify-center border-b border-outline-variant/30">
                    {roomImage ? (
                      <img
                        src={roomImage}
                        alt={room.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-secondary">
                        <span className="material-symbols-outlined text-4xl text-primary/40 mb-1" data-icon="meeting_room">meeting_room</span>
                        <span className="text-xs text-secondary font-medium">No Image Uploaded</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      {room.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm backdrop-blur-sm">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-sm backdrop-blur-sm">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          Maintenance
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-bold text-base text-on-surface">{room.name}</h3>
                        <span className="font-semibold text-primary text-sm">₹{room.hourly_rate ?? room.hourlyRate ?? 0}/hr</span>
                      </div>
                      <p className="text-xs text-secondary flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-[13px]" data-icon="location_on">location_on</span>
                        <span>{room.location}</span>
                      </p>

                      <div className="mt-3 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-surface-container text-on-surface">
                          {room.capacity} Seats
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {(room.amenities || []).slice(0, 3).map((amenity, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-surface-container-low text-secondary border border-outline-variant/30">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(room)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                          room.is_active ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'
                        }`}
                      >
                        {room.is_active ? 'Set Maintenance' : 'Set Active'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(room)}
                          className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[18px]" data-icon="edit">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(room)}
                          className="p-1.5 rounded-lg text-secondary hover:text-error hover:bg-error-container/20 transition"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[18px]" data-icon="delete">delete</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Create & Edit Modal Dialog */}
      <AdminRoomModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRoom(null);
        }}
        onSave={handleSaveRoom}
        onDeleteRequest={(room) => handleOpenDeleteModal(room)}
        room={editingRoom}
        loading={modalSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setRoomToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        room={roomToDelete}
        loading={deleteSubmitting}
      />

    </div>
  );
}
