import React, { useEffect, useState } from 'react';

export default function RoomDetailsModal({ room, onClose, onBook }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Support closing with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!room) return null;

  const galleryImages = [
    room.image || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=400&q=80',
  ];

  const activePhoto = selectedPhoto || room.image || galleryImages[0];
  const isAvailable = room.status === 'Available' || (room.is_active !== false && room.status !== 'In-Maintenance');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-10 animate-fade-in">
      {/* Dimmed Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Box */}
      <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto z-10 animate-scale-up flex flex-col justify-between">
        
        {/* Sticky Modal Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                {room.name}
              </h2>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  isAvailable
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                {isAvailable ? 'Available Now' : 'In-Maintenance'}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{room.location} (Near Executive Elevators)</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6">
          
          {/* Photo Gallery */}
          <div className="space-y-2">
            <div className="h-56 sm:h-72 w-full rounded-2xl overflow-hidden bg-slate-100 relative">
              <img
                src={activePhoto}
                alt={room.name}
                className="w-full h-full object-cover transition duration-300"
              />
              <span className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-lg">
                Primary Perspective (East Panorama)
              </span>
            </div>

            {/* Thumbnail Row */}
            <div className="grid grid-cols-4 gap-2">
              {galleryImages.map((imgUrl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedPhoto(imgUrl)}
                  className={`h-16 sm:h-20 rounded-xl overflow-hidden border-2 transition ${
                    activePhoto === imgUrl ? 'border-blue-600 scale-[0.98]' : 'border-slate-200 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} className="w-full h-full object-cover" alt={`Perspective ${i + 1}`} />
                </button>
              ))}
            </div>
          </div>

          {/* 4-Card Quick Specs Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
              <p className="text-[11px] text-slate-400 font-medium">Capacity</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">👥 {room.capacity} People</p>
              <p className="text-[11px] text-slate-500">Executive Seating</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
              <p className="text-[11px] text-slate-400 font-medium">Floor Area</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">📐 {room.area || '1,200 sq ft'}</p>
              <p className="text-[11px] text-slate-500">112 m² Space</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
              <p className="text-[11px] text-slate-400 font-medium">Acoustics</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">🔇 NRC 0.88</p>
              <p className="text-[11px] text-slate-500">Soundproofed Glazing</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
              <p className="text-[11px] text-slate-400 font-medium">Connectivity</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">📶 Wi-Fi 6E</p>
              <p className="text-[11px] text-slate-500">1.2 Gbps Dedicated</p>
            </div>
          </div>

          {/* Equipment & Specs Breakdown (2 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Audio / Visual */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="text-blue-600">📺</span>
                Audio/Visual & Conferencing
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Dual 65" 4K Sony Bravia Commercial Displays
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Polycom Studio 4K Auto-Tracking PTZ Camera
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Biamp Beamforming Ceiling Array Microphones
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Wireless Screen Sharing (AirPlay, Miracast, HDMI/USB-C)
                </li>
              </ul>
            </div>

            {/* Amenities & Hospitality */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="text-blue-600">☕</span>
                Workplace Amenities & Hospitality
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  8ft Magnetic Ultra-Clear Glass Whiteboard
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Dedicated Wall-Mounted Touchscreen Thermostat
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Motorized Automated Blackout & Solar Blinds
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Nespresso Vertuo Coffee Bar & Chilled Water
                </li>
              </ul>
            </div>
          </div>

          {/* Notice Bar */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-blue-900">
            <span>🛡️ <strong>Free Cancellation:</strong> Up to 1 hour before scheduled start time.</span>
            <span>👨‍💻 <strong>IT Concierge:</strong> On-site setup assistance available.</span>
          </div>

        </div>

        {/* Modal Sticky Footer Action Bar */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-4 rounded-b-2xl sm:rounded-b-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500 font-medium">
            Hourly Rate: <strong className="text-slate-800">${room.hourlyRate || '85'}/hr</strong> • Complimentary for Internal Teams
          </p>
          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              Back to Catalog
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onBook(room);
              }}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl transition shadow-xs shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              Proceed to Booking ➔
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
