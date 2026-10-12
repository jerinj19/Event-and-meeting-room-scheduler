import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchCommandBar from '../components/rooms/SearchCommandBar';
import RoomFilters from '../components/rooms/RoomFilters';
import RoomGrid from '../components/rooms/RoomGrid';
import RoomDetailsModal from '../components/rooms/RoomDetailsModal';
import { getTodayDateString, formatDisplayDate } from '../utils/dateUtils';

export default function RoomCatalog() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [selectedModalRoom, setSelectedModalRoom] = useState(null);

  // Filter States
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [bookedRoomIdsOnDate, setBookedRoomIdsOnDate] = useState(new Set());
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [locationFilter, setLocationFilter] = useState('all');
  const [maxHourlyRate, setMaxHourlyRate] = useState(null);
  const [sortBy, setSortBy] = useState('recommended');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchParams] = useSearchParams();

  // Synchronize search query from navbar URL param
  const urlSearch = searchParams.get('search');
  useEffect(() => {
    if (urlSearch !== null && urlSearch !== undefined) {
      setLocationQuery(urlSearch);
    }
  }, [urlSearch]);

  // 1. Fetch Rooms from DRF Backend API
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const host = window.location.hostname === '127.0.0.1' ? '127.0.0.1:8000' : 'localhost:8000';

    fetch(`http://${host}/api/rooms/`, { headers })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Backend rooms endpoint not active');
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
        if (list.length > 0) {
          const formatted = list.map((r) => {
            const rawRate = Number(r.hourly_rate ?? r.hourlyRate ?? 500);

            const formatMediaUrl = (url) => {
              if (!url) return null;
              if (typeof url === 'string' && url.startsWith('http')) return url;
              const clean = typeof url === 'string' && url.startsWith('/') ? url : `/${url}`;
              return `http://${host}${clean}`;
            };

            const coverImg = formatMediaUrl(r.image);
            const formattedImages = Array.isArray(r.images)
              ? r.images.map((im) => ({
                  ...im,
                  image_url: formatMediaUrl(im.image_url || im.image),
                  url: formatMediaUrl(im.image_url || im.image),
                }))
              : [];

            return {
              ...r,
              id: r.id,
              name: r.name,
              location: r.location || 'Bangalore Workspace',
              capacity: r.capacity || 4,
              floor_area: r.floor_area !== undefined && r.floor_area !== null ? Number(r.floor_area) : null,
              area: r.floor_area ? `${r.floor_area} sq ft` : (r.area || `${Math.round((r.capacity || 4) * 60 + 100)} sq ft`),
              av_equipment: Array.isArray(r.av_equipment) ? r.av_equipment : [],
              acoustics: r.acoustics || '',
              connectivity: r.connectivity || '',
              images: formattedImages,
              hourlyRate: rawRate,
              hourly_rate: rawRate,
              status: r.is_active ? 'Available' : 'In-Maintenance',
              image: coverImg || (formattedImages[0]?.url) || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
              amenities: Array.isArray(r.amenities) ? r.amenities : [],
              is_active: r.is_active !== undefined ? r.is_active : true,
            };
          });
          setRooms(formatted);
        } else {
          setRooms([]);
        }
      })
      .catch(() => {
        setRooms([]);
      });
  }, []);

  // 2. Query Confirmed Bookings for Selected Date (Option B: Zero bookings on that date)
  useEffect(() => {
    if (!selectedDate) {
      setBookedRoomIdsOnDate(new Set());
      return;
    }

    const token = localStorage.getItem('access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`http://127.0.0.1:8000/api/bookings/?date=${selectedDate}&status=CONFIRMED`, { headers })
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
        // Option B: Collect any room that has a confirmed booking on this date
        const bookedIds = new Set();
        list.forEach((b) => {
          const rId = b.room || b.room_id;
          if (rId) bookedIds.add(String(rId));
        });
        setBookedRoomIdsOnDate(bookedIds);
      })
      .catch(() => {
        setBookedRoomIdsOnDate(new Set());
      });
  }, [selectedDate]);

  // 3. Dynamic Amenities Extraction with Real Counts from System Rooms
  const availableAmenities = useMemo(() => {
    const counts = {};
    rooms.forEach((r) => {
      if (Array.isArray(r.amenities)) {
        r.amenities.forEach((a) => {
          if (a && typeof a === 'string') {
            const clean = a.trim();
            counts[clean] = (counts[clean] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(counts).map(([amenity, count]) => ({
      id: amenity,
      label: amenity,
      count,
    }));
  }, [rooms]);

  // 4. Dynamic Locations Extraction with Real Counts from System Rooms
  const availableLocations = useMemo(() => {
    const counts = {};
    rooms.forEach((r) => {
      if (r.location) {
        const loc = r.location.trim();
        counts[loc] = (counts[loc] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([loc, count]) => ({
      id: loc,
      label: loc,
      count,
    }));
  }, [rooms]);

  // 5. Dynamic Max Rate from System Rooms (Auto-expands when admin adds high-value property)
  const maxPropertyRate = useMemo(() => {
    if (!rooms.length) return 1000;
    const max = Math.max(...rooms.map((r) => Number(r.hourlyRate || 0)));
    return max > 0 ? max : 1000;
  }, [rooms]);

  // 6. Real-time Count of Rooms within Current Hourly Budget
  const roomsWithinBudgetCount = useMemo(() => {
    const activeLimit = maxHourlyRate !== null && maxHourlyRate !== undefined ? maxHourlyRate : maxPropertyRate;
    return rooms.filter((r) => Number(r.hourlyRate ?? r.hourly_rate ?? 0) <= activeLimit).length;
  }, [rooms, maxHourlyRate, maxPropertyRate]);

  // Handlers
  const handleToggleAmenity = (amenityId) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId) ? prev.filter((a) => a !== amenityId) : [...prev, amenityId]
    );
  };

  const handleResetFilters = () => {
    setLocationQuery('');
    setSelectedDate(getTodayDateString());
    setSelectedAmenities([]);
    setAvailableOnly(false);
    setLocationFilter('all');
    setMaxHourlyRate(null);
    setSortBy('recommended');
  };

  // Filter Calculation
  const effectiveMaxRate = maxHourlyRate !== null && maxHourlyRate !== undefined ? maxHourlyRate : maxPropertyRate;

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Keyword Search (Location, Room Name, Amenities)
      if (locationQuery.trim()) {
        const q = locationQuery.trim().toLowerCase();
        const matchLoc = room.location && room.location.toLowerCase().includes(q);
        const matchName = room.name && room.name.toLowerCase().includes(q);
        const matchAmenity =
          Array.isArray(room.amenities) &&
          room.amenities.some((a) => typeof a === 'string' && a.toLowerCase().includes(q));
        if (!matchLoc && !matchName && !matchAmenity) return false;
      }

      // Sidebar Location Filter
      if (locationFilter !== 'all' && room.location) {
        if (!room.location.toLowerCase().includes(locationFilter.toLowerCase())) {
          return false;
        }
      }

      // Date Availability Check (Option B: Must have 0 bookings on that date)
      if (selectedDate && bookedRoomIdsOnDate.has(String(room.id))) {
        return false;
      }

      // Available Only status filter
      if (availableOnly && room.status !== 'Available') return false;

      // Budget Rate filter
      if (room.hourlyRate > effectiveMaxRate) return false;

      // Amenities filter (must match all selected amenities)
      if (selectedAmenities.length > 0) {
        const roomAmenitiesLower = (room.amenities || []).map((a) => a.toLowerCase());
        const hasAll = selectedAmenities.every((selected) =>
          roomAmenitiesLower.some((a) => a.includes(selected.toLowerCase()))
        );
        if (!hasAll) return false;
      }

      return true;
    });
  }, [
    rooms,
    locationQuery,
    locationFilter,
    selectedDate,
    bookedRoomIdsOnDate,
    availableOnly,
    effectiveMaxRate,
    selectedAmenities,
  ]);

  // Sorting Calculation
  const sortedRooms = useMemo(() => {
    const list = [...filteredRooms];
    if (sortBy === 'rateAsc') {
      return list.sort((a, b) => a.hourlyRate - b.hourlyRate);
    }
    if (sortBy === 'rateDesc') {
      return list.sort((a, b) => b.hourlyRate - a.hourlyRate);
    }
    if (sortBy === 'capacityDesc') {
      return list.sort((a, b) => b.capacity - a.capacity);
    }
    return list;
  }, [filteredRooms, sortBy]);

  // Telemetry Counts
  const availableCount = rooms.filter((r) => r.status === 'Available').length;
  const maintenanceCount = rooms.filter((r) => r.status === 'In-Maintenance').length;

  const handleBook = (room) => {
    navigate(`/book?roomId=${room.id}&roomName=${encodeURIComponent(room.name)}`, {
      state: { room, selectedDate },
    });
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50">
      <div className="max-w-[1520px] mx-auto space-y-6">

        {/* Breadcrumbs & Page Header */}
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Home</span>
            <span>/</span>
            <span>Workspaces</span>
            <span>/</span>
            <span className="text-blue-600 font-medium">Catalog</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Meeting Rooms &amp; Workspaces
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Search, filter, and reserve high-tech meeting rooms and collaborative spaces in real-time.
              </p>
            </div>

            {/* Telemetry Counters Strip */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-medium shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-500">Available:</span>
                <span className="font-bold text-slate-800">{availableCount}</span>
              </div>
              <div className="h-4 w-px bg-slate-200"></div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-slate-500">Maintenance:</span>
                <span className="font-bold text-slate-800">{maintenanceCount}</span>
              </div>
              <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-slate-500">Total Properties:</span>
                <span className="font-bold text-slate-800">{rooms.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Universal Search Command Bar with Location Keyword Input & Date Picker */}
        <SearchCommandBar
          locationQuery={locationQuery}
          onChangeLocationQuery={setLocationQuery}
          selectedDate={selectedDate}
          onChangeDate={setSelectedDate}
          onSearch={() => {}}
        />

        {/* 2-Column Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Faceted Filter Sidebar (3 cols, top-aligned) */}
          <div className="lg:col-span-3">
            <RoomFilters
              minRate={0}
              maxRateLimit={maxPropertyRate}
              currentMaxRate={effectiveMaxRate}
              onChangeMaxRate={setMaxHourlyRate}
              matchingRoomsCount={roomsWithinBudgetCount}
              totalRoomsCount={rooms.length}
              availableAmenities={availableAmenities}
              selectedAmenities={selectedAmenities}
              onToggleAmenity={handleToggleAmenity}
              availableOnly={availableOnly}
              onToggleAvailableOnly={setAvailableOnly}
              availableLocations={availableLocations}
              locationFilter={locationFilter}
              onChangeLocation={setLocationFilter}
              onResetFilters={handleResetFilters}
            />
          </div>

          {/* Right Column: Results Stream (9 cols) */}
          <section className="lg:col-span-9 space-y-4">
            
            {/* Results Header Bar with Telemetry & Sorter */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Results:</span>
                  <span className="text-blue-600 font-extrabold">{sortedRooms.length} Spaces Found</span>
                  {selectedDate && (
                    <span className="text-xs font-normal text-slate-500">
                      (Available on {selectedDate})
                    </span>
                  )}
                </h2>
                
                {/* Active Filter Removable Tags */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {locationQuery && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                      <span>Search: "{locationQuery}"</span>
                      <button
                        type="button"
                        onClick={() => setLocationQuery('')}
                        className="text-blue-400 hover:text-blue-800 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {locationFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                      <span>Location: {locationFilter}</span>
                      <button
                        type="button"
                        onClick={() => setLocationFilter('all')}
                        className="text-blue-400 hover:text-blue-800 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {selectedDate && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
                      <span>Date: {formatDisplayDate(selectedDate)}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDate('')}
                        className="text-indigo-400 hover:text-indigo-800 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {maxHourlyRate !== null && maxHourlyRate < maxPropertyRate && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                      <span>Up to ₹{maxHourlyRate}/hr</span>
                      <button
                        type="button"
                        onClick={() => setMaxHourlyRate(null)}
                        className="text-blue-400 hover:text-blue-800 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {availableOnly && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100">
                      <span>Available Now</span>
                      <button
                        type="button"
                        onClick={() => setAvailableOnly(false)}
                        className="text-emerald-400 hover:text-emerald-800 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {selectedAmenities.length > 0 && selectedAmenities.map((amenity) => (
                    <span key={amenity} className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                      <span className="capitalize">{amenity}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAmenity(amenity)}
                        className="text-slate-400 hover:text-slate-800 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Sorter Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-slate-500">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="recommended">Recommended (Top picks)</option>
                  <option value="rateAsc">Hourly Rate: Low to High</option>
                  <option value="rateDesc">Hourly Rate: High to Low</option>
                  <option value="capacityDesc">Capacity: High to Low</option>
                </select>
              </div>
            </div>

            {/* Room Grid */}
            <RoomGrid
              rooms={sortedRooms}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onViewSpecs={(room) => setSelectedModalRoom(room)}
              onBook={handleBook}
            />

          </section>

        </div>

        {/* Room Specifications Modal */}
        {selectedModalRoom && (
          <RoomDetailsModal
            room={selectedModalRoom}
            onClose={() => setSelectedModalRoom(null)}
            onBook={handleBook}
          />
        )}

      </div>
    </main>
  );
}
