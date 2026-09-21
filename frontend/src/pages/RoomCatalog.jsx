import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomFilters from '../components/rooms/RoomFilters';
import RoomGrid from '../components/rooms/RoomGrid';
import RoomDetailsModal from '../components/rooms/RoomDetailsModal';

// Initial room data matching the Google Stitch design
const INITIAL_ROOMS = [
  {
    id: 'room-1',
    name: 'Boardroom Alpha',
    location: 'Building A • 4th Floor (West Wing)',
    capacity: 14,
    area: '1,200 sq ft',
    hourlyRate: 85,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    amenities: ['4K Screen', 'Polycom Video', 'Whiteboard', 'WiFi 6', 'Coffee Bar'],
  },
  {
    id: 'room-2',
    name: 'Innovation Hub',
    location: 'Building B • 2nd Floor',
    capacity: 8,
    area: '750 sq ft',
    hourlyRate: 55,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
    amenities: ['Dual Display', 'Video Conf', 'Acoustic Baffles', 'Whiteboard', 'Coffee Bar'],
  },
  {
    id: 'room-3',
    name: 'Executive Suite 301',
    location: 'Building A • 3rd Floor',
    capacity: 18,
    area: '1,450 sq ft',
    hourlyRate: 110,
    status: 'In-Maintenance',
    image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80',
    amenities: ['85" OLED', 'Audio Suite', 'Marble Table', 'WiFi 6'],
  },
  {
    id: 'room-4',
    name: 'Focus Pod Gamma',
    location: 'Building B • 1st Floor',
    capacity: 4,
    area: '280 sq ft',
    hourlyRate: 30,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=800&q=80',
    amenities: ['Display Screen', 'WiFi 6', 'Standing Desk'],
  },
  {
    id: 'room-5',
    name: 'Creative Studio Delta',
    location: 'Building A • 2nd Floor East',
    capacity: 10,
    area: '900 sq ft',
    hourlyRate: 65,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80',
    amenities: ['Ultra-wide Screen', 'Glass Wall', 'Podcast Mic', 'WiFi 6'],
  },
  {
    id: 'room-6',
    name: 'Acoustic Sprint Pod 102',
    location: 'Building B • 1st Floor West',
    capacity: 2,
    area: '160 sq ft',
    hourlyRate: 25,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80',
    amenities: ['NRC 0.9 Felt', 'WiFi 6', 'Ergonomic'],
  },
];

export default function RoomCatalog() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [selectedModalRoom, setSelectedModalRoom] = useState(null);

  // Filter States
  const [selectedCapacity, setSelectedCapacity] = useState('all');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [locationFilter, setLocationFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Optional fetch from DRF backend
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/rooms/')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Backend not active');
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Merge API data with default imagery if needed
          const formatted = data.map((r, i) => ({
            ...r,
            image: r.image || INITIAL_ROOMS[i % INITIAL_ROOMS.length].image,
            area: r.area || '950 sq ft',
            hourlyRate: r.hourlyRate || 75,
            status: r.is_active ? 'Available' : 'In-Maintenance',
            amenities: r.amenities || ['4K Screen', 'WiFi 6'],
          }));
          setRooms(formatted);
        }
      })
      .catch(() => {
        // Fallback silently to initial mock rooms
      });
  }, []);

  const handleToggleAmenity = (amenityId) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId) ? prev.filter((a) => a !== amenityId) : [...prev, amenityId]
    );
  };

  const handleResetFilters = () => {
    setSelectedCapacity('all');
    setSelectedAmenities([]);
    setAvailableOnly(false);
    setLocationFilter('all');
  };

  // Filter Calculation
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // 1. Capacity filter
      if (selectedCapacity === 'small' && (room.capacity < 2 || room.capacity > 4)) return false;
      if (selectedCapacity === 'medium' && (room.capacity < 6 || room.capacity > 10)) return false;
      if (selectedCapacity === 'large' && (room.capacity < 12 || room.capacity > 20)) return false;
      if (selectedCapacity === 'boardroom' && room.capacity < 25) return false;

      // 2. Available Only filter
      if (availableOnly && room.status !== 'Available') return false;

      // 3. Location filter
      if (locationFilter !== 'all' && !room.location.includes(locationFilter)) return false;

      // 4. Amenities filter
      if (selectedAmenities.length > 0) {
        const hasAll = selectedAmenities.every((selected) =>
          room.amenities.some((a) => a.toLowerCase().includes(selected.toLowerCase()))
        );
        if (!hasAll) return false;
      }

      return true;
    });
  }, [rooms, selectedCapacity, availableOnly, locationFilter, selectedAmenities]);

  // Telemetry Counts
  const availableCount = rooms.filter((r) => r.status === 'Available').length;
  const maintenanceCount = rooms.filter((r) => r.status === 'In-Maintenance').length;

  const handleBook = (room) => {
    // Passes room state into Srilaxmi's flow
    navigate(`/book?roomId=${room.id}&roomName=${encodeURIComponent(room.name)}`);
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">

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
                Meeting Rooms & Spaces
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Explore and reserve high-tech conference rooms, boardrooms, and collaborative spaces.
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
                <span className="text-slate-500">Total:</span>
                <span className="font-bold text-slate-800">{rooms.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Filters */}
        <RoomFilters
          selectedCapacity={selectedCapacity}
          onSelectCapacity={setSelectedCapacity}
          selectedAmenities={selectedAmenities}
          onToggleAmenity={handleToggleAmenity}
          availableOnly={availableOnly}
          onToggleAvailableOnly={setAvailableOnly}
          locationFilter={locationFilter}
          onChangeLocation={setLocationFilter}
        />

        {/* Room Grid */}
        <RoomGrid
          rooms={filteredRooms}
          onViewSpecs={(room) => setSelectedModalRoom(room)}
          onBook={handleBook}
          onResetFilters={handleResetFilters}
        />

        {/* Pagination Footer */}
        {filteredRooms.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-200 pt-6 pb-12">
            <p className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-800">{filteredRooms.length}</span> of{' '}
              <span className="font-semibold text-slate-800">{rooms.length}</span> meeting rooms
            </p>
            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-400 bg-slate-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-2xs"
              >
                1
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
              >
                2
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
              >
                3
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Interactive Room Details Modal */}
      {selectedModalRoom && (
        <RoomDetailsModal
          room={selectedModalRoom}
          onClose={() => setSelectedModalRoom(null)}
          onBook={handleBook}
        />
      )}
    </main>
  );
}
