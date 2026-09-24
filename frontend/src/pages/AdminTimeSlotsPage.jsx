import React, { useState, useEffect, useMemo, useCallback } from 'react';
import timeSlotService from '../services/timeSlotService';
import roomService from '../services/roomService';
import AdminTimeSlotModal from '../components/admin/AdminTimeSlotModal';
import DeleteTimeSlotModal from '../components/admin/DeleteTimeSlotModal';
import BulkTimeSlotModal from '../components/admin/BulkTimeSlotModal';
import { useToast } from '../contexts/ToastContext';

export default function AdminTimeSlotsPage() {
  const toast = useToast();

  const [slots, setSlots] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filters & Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all'); // 'all' | 'morning' | 'afternoon' | 'evening'
  const [roomFilter, setRoomFilter] = useState('all'); // 'all' | 'global' | roomId
  const [periodFilter, setPeriodFilter] = useState('all'); // 'all' | 'recurring' | 'dated' | 'this_week' | 'this_month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Bulk Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Reset Defaults Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  /**
   * Load rooms for room scoping dropdown
   */
  const loadRooms = useCallback(async () => {
    try {
      const data = await roomService.getRooms();
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      setRooms([]);
    }
  }, []);

  /**
   * Load time slots with backend filtering and pagination
   */
  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (sessionFilter !== 'all') params.session = sessionFilter;
      if (statusFilter === 'active') params.is_active = true;
      if (statusFilter === 'inactive') params.is_active = false;

      if (roomFilter === 'global') {
        params.room = 'global';
      } else if (roomFilter !== 'all') {
        params.room = roomFilter;
        params.exact_room = true;
      }

      if (periodFilter === 'this_month' || periodFilter === 'this_week') {
        params.period = periodFilter;
      } else if (periodFilter === 'custom') {
        params.period = 'custom';
        if (customStartDate) params.start_date = customStartDate;
        if (customEndDate) params.end_date = customEndDate;
      } else if (periodFilter === 'recurring') {
        params.date_type = 'recurring';
      } else if (periodFilter === 'dated') {
        params.date_type = 'dated';
      }

      const res = await timeSlotService.getTimeSlots(params);

      if (Array.isArray(res)) {
        setSlots(res);
        setTotalCount(res.length);
        setTotalPages(1);
      } else if (res && Array.isArray(res.results)) {
        setSlots(res.results);
        setTotalCount(res.count ?? res.results.length);
        setTotalPages(res.total_pages ?? 1);
      } else {
        setSlots([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch {
      setSlots([]);
      setTotalCount(0);
      setTotalPages(1);
      toast.error('Unable to fetch time slots from the database.');
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    debouncedSearch,
    sessionFilter,
    statusFilter,
    roomFilter,
    periodFilter,
    customStartDate,
    customEndDate,
    toast,
  ]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  /**
   * KPI counts computed from current visible slots and total
   */
  const kpiStats = useMemo(() => {
    const total = totalCount;
    const active = slots.filter((s) => s.is_active).length;
    const morning = slots.filter((s) => s.period === 'morning').length;
    const afternoon = slots.filter((s) => s.period === 'afternoon').length;
    const evening = slots.filter((s) => s.period === 'evening').length;
    const dated = slots.filter((s) => Boolean(s.date)).length;

    return {
      total,
      active,
      morning,
      afternoon,
      evening,
      dated,
    };
  }, [slots, totalCount]);

  const hasActiveFilters = Boolean(
    searchTerm ||
    sessionFilter !== 'all' ||
    statusFilter !== 'all' ||
    roomFilter !== 'all' ||
    periodFilter !== 'all' ||
    customStartDate ||
    customEndDate
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSessionFilter('all');
    setStatusFilter('all');
    setRoomFilter('all');
    setPeriodFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setCurrentPage(1);
  };

  // Handlers for Add / Edit
  const handleOpenCreateModal = () => {
    setEditingSlot(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (slot) => {
    setEditingSlot(slot);
    setIsModalOpen(true);
  };

  const handleSaveSlot = async (formData) => {
    setModalSubmitting(true);
    try {
      if (editingSlot) {
        const updated = await timeSlotService.updateTimeSlot(editingSlot.id, formData);
        setSlots((prev) =>
          prev.map((s) => (s.id === editingSlot.id ? { ...s, ...updated } : s))
        );
        toast.success('Time slot updated successfully!');
      } else {
        const targetRooms =
          formData.room_ids && formData.room_ids.length > 0
            ? formData.room_ids
            : [formData.room || null];
        const targetDates =
          formData.dates && formData.dates.length > 0
            ? formData.dates
            : [formData.date || null];

        if (targetRooms.length > 1 || targetDates.length > 1) {
          // Multi-room or Multi-date bulk creation
          const bulkPayload = [];
          let sort = Number(formData.sort_order) || 0;
          for (const d of targetDates) {
            for (const r of targetRooms) {
              bulkPayload.push({
                start_time: formData.start_time,
                end_time: formData.end_time,
                label: formData.label || '',
                period: formData.period,
                room: r,
                date: d,
                is_active: formData.is_active !== undefined ? formData.is_active : true,
                sort_order: sort++,
              });
            }
          }
          const res = await timeSlotService.bulkCreateTimeSlots(bulkPayload);
          toast.success(res.message || `Successfully created ${bulkPayload.length} time slots!`);
        } else {
          // Single slot creation
          const payload = {
            ...formData,
            room: targetRooms[0],
            date: targetDates[0],
          };
          delete payload.room_ids;
          delete payload.dates;
          await timeSlotService.createTimeSlot(payload);
          toast.success('Time slot created successfully!');
        }
        await loadSlots();
      }
      setIsModalOpen(false);
      setEditingSlot(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save time slot.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleSaveBulkSlots = async (slotsPayload) => {
    setBulkSubmitting(true);
    try {
      const res = await timeSlotService.bulkCreateTimeSlots(slotsPayload);
      toast.success(res.message || `Successfully created ${slotsPayload.length} time slots!`);
      setIsBulkModalOpen(false);
      await loadSlots();
    } catch (err) {
      toast.error(err.message || 'Failed to create time slots in bulk.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Quick toggle active status
  const handleToggleStatus = async (slot) => {
    setActionLoadingId(slot.id);
    const newStatus = !slot.is_active;

    try {
      await timeSlotService.toggleTimeSlotStatus(slot.id, slot.is_active);
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, is_active: newStatus } : s))
      );
      toast.info(`Slot marked as ${newStatus ? 'Active' : 'Disabled'}.`);
    } catch (err) {
      toast.error(err.message || 'Failed to update slot status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete modal handlers
  const handleOpenDeleteModal = (slot) => {
    setSlotToDelete(slot);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (slotId) => {
    setDeleteSubmitting(true);
    try {
      await timeSlotService.deleteTimeSlot(slotId);
      toast.success('Time slot successfully deleted.');
      setIsDeleteModalOpen(false);
      setSlotToDelete(null);
      await loadSlots();
    } catch (err) {
      toast.error(err.message || 'Failed to delete slot.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Reset default slots handlers
  const handleConfirmResetDefaults = async () => {
    setResetSubmitting(true);
    try {
      await timeSlotService.resetDefaultSlots();
      toast.success('Standard default time slots restored successfully.');
      setIsResetModalOpen(false);
      await loadSlots();
    } catch (err) {
      toast.error(err.message || 'Failed to reset default time slots.');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Helper for Period Pill color
  const getPeriodBadge = (period) => {
    switch (period) {
      case 'morning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="material-symbols-outlined text-xs" data-icon="wb_sunny">wb_sunny</span>
            Morning
          </span>
        );
      case 'afternoon':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="material-symbols-outlined text-xs" data-icon="light_mode">light_mode</span>
            Afternoon
          </span>
        );
      case 'evening':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="material-symbols-outlined text-xs" data-icon="nights_stay">nights_stay</span>
            Evening
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {period}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface flex items-center gap-2.5">
            <span className="material-symbols-outlined text-3xl text-primary" data-icon="schedule">schedule</span>
            Time Slots Management
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Configure dynamic recurring intervals and calendar-specific slots with granular room applicability.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 transition shadow-xs cursor-pointer"
            title="Restore standard corporate default time slots"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="restart_alt">restart_alt</span>
            <span>Reset to Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 transition shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="more_time">more_time</span>
            <span>Add Multiple Slots</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary/90 active:bg-primary/95 shadow-sm transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="add">add</span>
            <span>Add New Slot</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-secondary">Total Slots</span>
          <div className="text-2xl font-bold text-on-surface mt-1">{kpiStats.total}</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700">Active (Page)</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{kpiStats.active}</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-amber-700">Morning (Page)</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{kpiStats.morning}</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-sky-700">Afternoon (Page)</span>
          <div className="text-2xl font-bold text-sky-600 mt-1">{kpiStats.afternoon}</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-indigo-700">Evening (Page)</span>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{kpiStats.evening}</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-violet-700">Dated Slots (Page)</span>
          <div className="text-2xl font-bold text-violet-600 mt-1">{kpiStats.dated}</div>
        </div>
      </div>

      {/* 3. Toolbar: Search, Filters & View Toggle */}
      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-4 shadow-xs space-y-3.5">
        {/* Row 1: Search and View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary text-[18px]" data-icon="search">
              search
            </span>
            <input
              type="text"
              placeholder="Search by label, start time, room, or period..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder:text-secondary/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-secondary hover:text-on-surface text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Switcher */}
          <div className="flex items-center border border-outline-variant/60 rounded-lg p-0.5 bg-surface-container-low self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded text-xs ${viewMode === 'grid' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-secondary'}`}
              title="Grid View"
            >
              <span className="material-symbols-outlined text-[18px]" data-icon="grid_view">grid_view</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1 rounded text-xs ${viewMode === 'table' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-secondary'}`}
              title="Table View"
            >
              <span className="material-symbols-outlined text-[18px]" data-icon="table_rows">table_rows</span>
            </button>
          </div>
        </div>

        {/* Row 2: Room Dropdown, Period Filter, Session Dropdown, Status Filter & Reset */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-outline-variant/30">
          {/* Room Dropdown Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
              Room:
            </label>
            <select
              value={roomFilter}
              onChange={(e) => {
                setRoomFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs bg-surface-container-low border border-outline-variant/60 rounded-lg text-on-surface focus:outline-none focus:border-primary cursor-pointer font-medium"
            >
              <option value="all">🏢 All Scopes (Global + All Rooms)</option>
              <option value="global">🌐 Global Only (All Rooms)</option>
              {rooms.length > 0 && (
                <optgroup label="Specific Rooms">
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      📍 {r.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Session Dropdown Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
              Session:
            </label>
            <select
              value={sessionFilter}
              onChange={(e) => {
                setSessionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs bg-surface-container-low border border-outline-variant/60 rounded-lg text-on-surface focus:outline-none focus:border-primary cursor-pointer font-medium"
            >
              <option value="all">All Status (Morning, Afternoon, Evening)</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>

          {/* Period Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
              Period / Date:
            </label>
            <select
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs bg-surface-container-low border border-outline-variant/60 rounded-lg text-on-surface focus:outline-none focus:border-primary cursor-pointer font-medium"
            >
              <option value="all">📅 All Periods / Dates</option>
              <option value="recurring">🔁 Daily Recurring Templates Only</option>
              <option value="dated">📅 Specific Calendar Dates Only</option>
              <option value="this_week">📆 This Week</option>
              <option value="this_month">🗓️ This Month</option>
              <option value="custom">⚙️ Custom Date Range...</option>
            </select>
          </div>

          {/* Custom Date Range Inputs */}
          {periodFilter === 'custom' && (
            <div className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1 rounded-lg border border-outline-variant/60">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs bg-surface-container-lowest border border-outline-variant/40 rounded px-1.5 py-0.5 text-on-surface outline-none"
                title="Start Date"
              />
              <span className="text-secondary text-xs">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs bg-surface-container-lowest border border-outline-variant/40 rounded px-1.5 py-0.5 text-on-surface outline-none"
                title="End Date"
              />
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
              Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs bg-surface-container-low border border-outline-variant/60 rounded-lg text-on-surface focus:outline-none focus:border-primary cursor-pointer font-medium"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Disabled Only</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-2.5 py-1 text-xs font-semibold text-error hover:bg-error-container/20 rounded-lg transition ml-auto flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Slot Content: Grid or Table */}
      {loading ? (
        <div className="p-12 text-center bg-surface-container-lowest border border-outline-variant/40 rounded-2xl">
          <span className="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
          <p className="text-xs text-secondary mt-3">Loading dynamic time slots from database...</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-lowest border border-outline-variant/40 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-container-low text-secondary flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-2xl" data-icon="schedule">schedule</span>
          </div>
          <h3 className="text-base font-bold text-on-surface">No Time Slots Found</h3>
          <p className="text-xs text-secondary max-w-sm mx-auto">
            {hasActiveFilters
              ? 'No time slots matched your current filter criteria. Try resetting filters.'
              : 'No time slots are currently configured. Click "Reset to Defaults" to restore corporate slots or create custom slots.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 rounded-xl transition cursor-pointer"
              >
                Clear All Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmResetDefaults}
                className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl transition cursor-pointer"
              >
                Restore Standard Default Slots
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {slots.map((slot) => {
              const isToggling = actionLoadingId === slot.id;
              return (
                <div
                  key={slot.id}
                  className={`bg-surface-container-lowest border rounded-2xl p-4.5 shadow-xs transition hover:shadow-md flex flex-col justify-between gap-3 ${
                    slot.is_active ? 'border-outline-variant/40' : 'border-slate-200 opacity-70 bg-slate-50/50'
                  }`}
                >
                  {/* Top: Category Badge, Date Badge & Room Scope */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getPeriodBadge(slot.period)}
                      {slot.date ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                          <span className="material-symbols-outlined text-xs">calendar_today</span>
                          {slot.date}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                          <span className="material-symbols-outlined text-xs">all_inclusive</span>
                          Daily
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-secondary truncate max-w-[120px]" title={slot.room_name || 'Global'}>
                      {slot.room_name ? `📍 ${slot.room_name}` : '🌐 Global'}
                    </span>
                  </div>

                  {/* Middle: Slot Time & Label */}
                  <div className="space-y-1">
                    <div className="text-base font-bold text-on-surface tracking-tight">
                      {slot.label || slot.formatted_label}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <span className="font-semibold text-primary">{slot.start} – {slot.end}</span>
                      <span>•</span>
                      <span>{slot.duration || `${slot.duration_minutes || 60} mins`}</span>
                    </div>
                  </div>

                  {/* Bottom: Active Toggle & Actions */}
                  <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={slot.is_active}
                        onChange={() => handleToggleStatus(slot)}
                        disabled={isToggling}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                      <span className="ml-2 text-[11px] font-semibold text-secondary">
                        {isToggling ? 'Updating...' : slot.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </label>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(slot)}
                        className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-container transition cursor-pointer"
                        title="Edit slot"
                      >
                        <span className="material-symbols-outlined text-[18px]" data-icon="edit">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(slot)}
                        className="p-1.5 rounded-lg text-secondary hover:text-error hover:bg-error-container/20 transition cursor-pointer"
                        title="Delete slot"
                      >
                        <span className="material-symbols-outlined text-[18px]" data-icon="delete">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface-container-low/40 text-secondary font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Display Label</th>
                  <th className="py-3 px-4">Date Scope</th>
                  <th className="py-3 px-4">Start Time</th>
                  <th className="py-3 px-4">End Time</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Applicability</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-on-surface">
                {slots.map((slot) => {
                  const isToggling = actionLoadingId === slot.id;
                  return (
                    <tr key={slot.id} className="hover:bg-surface-container-low/30 transition">
                      <td className="py-3 px-4 font-bold text-sm">
                        {slot.label || slot.formatted_label}
                      </td>
                      <td className="py-3 px-4">
                        {slot.date ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                            <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                            {slot.date}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                            <span className="material-symbols-outlined text-[13px]">all_inclusive</span>
                            Daily Recurring
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-primary">{slot.start}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-primary">{slot.end}</td>
                      <td className="py-3 px-4 text-secondary">{slot.duration || `${slot.duration_minutes || 60} mins`}</td>
                      <td className="py-3 px-4">{getPeriodBadge(slot.period)}</td>
                      <td className="py-3 px-4 text-secondary">
                        {slot.room_name ? (
                          <span className="font-medium text-slate-800">📍 {slot.room_name}</span>
                        ) : (
                          <span className="text-slate-500">🌐 Global</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={slot.is_active}
                            onChange={() => handleToggleStatus(slot)}
                            disabled={isToggling}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(slot)}
                            className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-surface-container transition cursor-pointer"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[18px]" data-icon="edit">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(slot)}
                            className="p-1 rounded-lg text-secondary hover:text-error hover:bg-error-container/20 transition cursor-pointer"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[18px]" data-icon="delete">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Pagination Controls */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xs text-xs text-secondary">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-on-surface">{(currentPage - 1) * pageSize + 1}</strong> –{' '}
              <strong className="text-on-surface">{Math.min(currentPage * pageSize, totalCount)}</strong> of{' '}
              <strong className="text-on-surface">{totalCount}</strong> time slots
            </span>
            <div className="h-4 w-px bg-outline-variant/40 mx-2"></div>
            <div className="flex items-center gap-1.5">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-surface-container-low border border-outline-variant/60 rounded text-xs text-on-surface outline-none"
              >
                <option value={12}>12 / page</option>
                <option value={24}>24 / page</option>
                <option value={48}>48 / page</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              className="px-2.5 py-1.5 rounded-lg border border-outline-variant/50 hover:bg-surface-container-low disabled:opacity-40 transition cursor-pointer"
              title="First Page"
            >
              «
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-lg border border-outline-variant/50 hover:bg-surface-container-low disabled:opacity-40 transition cursor-pointer font-medium"
            >
              ‹ Previous
            </button>

            <span className="px-3 py-1.5 text-xs font-semibold text-on-surface">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-outline-variant/50 hover:bg-surface-container-low disabled:opacity-40 transition cursor-pointer font-medium"
            >
              Next ›
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-outline-variant/50 hover:bg-surface-container-low disabled:opacity-40 transition cursor-pointer"
              title="Last Page"
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* 6. Modals */}
      <AdminTimeSlotModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSlot}
        slot={editingSlot}
        rooms={rooms}
        loading={modalSubmitting}
      />

      <BulkTimeSlotModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSaveBulk={handleSaveBulkSlots}
        rooms={rooms}
        loading={bulkSubmitting}
      />

      <DeleteTimeSlotModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        slot={slotToDelete}
        loading={deleteSubmitting}
      />

      {/* Reset Defaults Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold flex-shrink-0">
                <span className="material-symbols-outlined text-2xl" data-icon="restart_alt">restart_alt</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">Restore Standard Default Slots?</h3>
                <p className="text-xs text-secondary">Re-seeds all 11 standard corporate time slots.</p>
              </div>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              This will ensure that all standard time slots (09:00 AM to 10:00 PM) across Morning, Afternoon, and Evening are present and active. Any custom slots you created will be preserved.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={resetSubmitting}
                className="px-4 py-2 text-xs font-semibold text-secondary hover:text-on-surface hover:bg-surface-container rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetDefaults}
                disabled={resetSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {resetSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Restoring...</span>
                  </>
                ) : (
                  <span>Confirm Restore</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
