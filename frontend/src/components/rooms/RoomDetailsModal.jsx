import React, { useEffect, useState, useMemo } from 'react';

export default function RoomDetailsModal({ room, onClose, onBook }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Compute normalized amenities for the room
  const roomAmenities = useMemo(() => {
    if (!room?.amenities) return [];
    let list = [];
    if (Array.isArray(room.amenities)) {
      list = room.amenities;
    } else if (typeof room.amenities === 'string') {
      try {
        const parsed = JSON.parse(room.amenities);
        list = Array.isArray(parsed) ? parsed : [room.amenities];
      } catch {
        list = [room.amenities];
      }
    }
    return list.map((a) => (typeof a === 'string' ? a.trim() : String(a))).filter(Boolean);
  }, [room?.amenities]);

  // Compute normalized Audio/Visual equipment for the room
  const avEquipmentList = useMemo(() => {
    if (!room?.av_equipment) return [];
    let list = [];
    if (Array.isArray(room.av_equipment)) {
      list = room.av_equipment;
    } else if (typeof room.av_equipment === 'string') {
      try {
        const parsed = JSON.parse(room.av_equipment);
        list = Array.isArray(parsed) ? parsed : [room.av_equipment];
      } catch {
        list = [room.av_equipment];
      }
    }
    return list.map((item) => (typeof item === 'string' ? item.trim() : String(item))).filter(Boolean);
  }, [room?.av_equipment]);

  // Extract all real photos for the room (from room.images and room.image; no mock data)
  const galleryImages = useMemo(() => {
    if (!room) return [];
    const images = [];

    const formatUrl = (url) => {
      if (!url) return null;
      if (typeof url === 'string') {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        const host = window.location.hostname === '127.0.0.1' ? '127.0.0.1:8000' : 'localhost:8000';
        const clean = url.startsWith('/') ? url : `/${url}`;
        return `http://${host}${clean}`;
      }
      return null;
    };

    // If related RoomImage objects exist
    if (Array.isArray(room.images) && room.images.length > 0) {
      room.images.forEach((imgObj) => {
        const url = formatUrl(imgObj.image_url || imgObj.image || imgObj.url);
        if (url && !images.includes(url)) {
          // Put primary image first if applicable
          if (imgObj.is_primary) {
            images.unshift(url);
          } else {
            images.push(url);
          }
        }
      });
    }

    // Check room.image cover
    if (room.image) {
      const coverUrl = formatUrl(room.image);
      if (coverUrl && !images.includes(coverUrl)) {
        images.unshift(coverUrl);
      }
    }

    return images;
  }, [room]);

  // Reset selected photo when room changes
  useEffect(() => {
    setSelectedPhoto(galleryImages[0] || null);
  }, [galleryImages]);

  // Support closing with Escape key and navigating images with Arrow keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (galleryImages.length > 1) {
          setSelectedPhoto((prev) => {
            const curIdx = prev ? galleryImages.indexOf(prev) : 0;
            const nextIdx = (curIdx - 1 + galleryImages.length) % galleryImages.length;
            return galleryImages[nextIdx];
          });
        }
      } else if (e.key === 'ArrowRight') {
        if (galleryImages.length > 1) {
          setSelectedPhoto((prev) => {
            const curIdx = prev ? galleryImages.indexOf(prev) : 0;
            const nextIdx = (curIdx + 1) % galleryImages.length;
            return galleryImages[nextIdx];
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, galleryImages]);

  if (!room) return null;

  const activePhoto = selectedPhoto || galleryImages[0] || null;
  const activeIndex = activePhoto ? galleryImages.indexOf(activePhoto) : -1;
  const currentPhotoIndex = activeIndex >= 0 ? activeIndex : 0;

  const handlePrevPhoto = (e) => {
    if (e) e.stopPropagation();
    if (galleryImages.length <= 1) return;
    const nextIdx = (currentPhotoIndex - 1 + galleryImages.length) % galleryImages.length;
    setSelectedPhoto(galleryImages[nextIdx]);
  };

  const handleNextPhoto = (e) => {
    if (e) e.stopPropagation();
    if (galleryImages.length <= 1) return;
    const nextIdx = (currentPhotoIndex + 1) % galleryImages.length;
    setSelectedPhoto(galleryImages[nextIdx]);
  };

  const isAvailable = room.status === 'Available' || (room.is_active !== false && room.status !== 'In-Maintenance');

  const hasAcoustics = Boolean(room.acoustics && room.acoustics.trim());
  const hasConnectivity = Boolean(room.connectivity && room.connectivity.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-8 animate-fade-in">
      {/* Dimmed Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Box */}
      <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-y-auto z-10 animate-scale-up flex flex-col justify-between">
        {/* Sticky Modal Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between z-20">
          <div>
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-xl font-bold text-slate-900 leading-tight">
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
              <span>{room.location}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Photo Gallery */}
          <div className="space-y-2">
            <div className="h-52 sm:h-72 w-full rounded-2xl overflow-hidden bg-slate-100 relative border border-slate-200/60 group">
              {activePhoto ? (
                <>
                  <img
                    src={activePhoto}
                    alt={room.name}
                    className="w-full h-full object-cover transition duration-300 select-none"
                  />

                  {/* Left & Right Slide Arrow Buttons (Shown when multiple photos exist) */}
                  {galleryImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevPhoto}
                        aria-label="Previous photo"
                        className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/65 hover:bg-slate-900/90 text-white flex items-center justify-center backdrop-blur-xs shadow-md hover:scale-105 active:scale-95 transition cursor-pointer z-10"
                      >
                        <svg className="w-5 h-5 sm:w-5 sm:h-5 -ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={handleNextPhoto}
                        aria-label="Next photo"
                        className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/65 hover:bg-slate-900/90 text-white flex items-center justify-center backdrop-blur-xs shadow-md hover:scale-105 active:scale-95 transition cursor-pointer z-10"
                      >
                        <svg className="w-5 h-5 sm:w-5 sm:h-5 -mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Bottom Perspective Label & Photo Counter */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none">
                    <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[11px] sm:text-xs px-2.5 py-1 rounded-lg pointer-events-auto shadow-xs">
                      {currentPhotoIndex === 0 ? 'Primary Perspective' : `Perspective ${currentPhotoIndex + 1}`}
                    </span>
                    {galleryImages.length > 1 && (
                      <span className="bg-slate-900/80 backdrop-blur-xs text-white font-medium text-[11px] sm:text-xs px-2.5 py-1 rounded-lg pointer-events-auto shadow-xs">
                        {currentPhotoIndex + 1} / {galleryImages.length}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                  <svg className="w-12 h-12 mb-2 stroke-current opacity-40" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs font-semibold text-slate-500">No photos uploaded for this room yet</p>
                  <p className="text-[11px] text-slate-400">Admin can upload room perspectives from the manage dashboard</p>
                </div>
              )}
            </div>

            {/* Thumbnail Row (Only shown if multiple photos exist) */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5">
                {galleryImages.map((imgUrl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedPhoto(imgUrl)}
                    className={`h-16 sm:h-20 w-24 sm:w-28 shrink-0 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                      activePhoto === imgUrl
                        ? 'border-blue-600 scale-[0.98] ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} className="w-full h-full object-cover" alt={`Perspective ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4-Card Quick Specs Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 1. Capacity */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
              <p className="text-[11px] text-slate-400 font-medium">Capacity</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">👥 {room.capacity} People</p>
              <p className="text-[11px] text-slate-500">Seating Capacity</p>
            </div>

            {/* 2. Floor Area (Rendered in sq ft as requested) */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
              <p className="text-[11px] text-slate-400 font-medium">Floor Area</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                📐 {room.floor_area ? `${room.floor_area} sq ft` : (room.area || 'Flexible Space')}
              </p>
              <p className="text-[11px] text-slate-500">Usable Footprint</p>
            </div>

            {/* 3. Acoustics (Active color if selected by admin, Dim mode if unselected) */}
            {hasAcoustics ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 transition">
                <p className="text-[11px] text-slate-400 font-medium">Acoustics</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  🔇 {room.acoustics.includes('-') ? room.acoustics.split('-')[0].trim() : (room.acoustics || 'NRC 0.88')}
                </p>
                <p className="text-[11px] text-slate-500">
                  {room.acoustics.includes('-') ? room.acoustics.split('-').slice(1).join('-').trim() : 'Soundproofed Glazing'}
                </p>
              </div>
            ) : (
              <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-3.5 opacity-60">
                <p className="text-[11px] text-slate-400 font-medium">Acoustics</p>
                <p className="text-sm font-medium text-slate-400 mt-0.5">🔇 Not Specified</p>
                <p className="text-[11px] text-slate-400">Standard Sound Insulation</p>
              </div>
            )}

            {/* 4. Connectivity (Active color if selected by admin, Dim mode if unselected) */}
            {hasConnectivity ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 transition">
                <p className="text-[11px] text-slate-400 font-medium">Connectivity</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  📶 {room.connectivity.includes('-') ? room.connectivity.split('-')[0].trim() : (room.connectivity || 'Wi-Fi 6E')}
                </p>
                <p className="text-[11px] text-slate-500">
                  {room.connectivity.includes('-') ? room.connectivity.split('-').slice(1).join('-').trim() : 'Dedicated Network'}
                </p>
              </div>
            ) : (
              <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-3.5 opacity-60">
                <p className="text-[11px] text-slate-400 font-medium">Connectivity</p>
                <p className="text-sm font-medium text-slate-400 mt-0.5">📶 Not Specified</p>
                <p className="text-[11px] text-slate-400">Standard Office Network</p>
              </div>
            )}
          </div>

          {/* Equipment & Specs Breakdown (2 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Audio / Visual & Conferencing (Displays only admin-selected items with green checkmarks) */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-blue-600">📺</span>
                  Audio/Visual & Conferencing
                </h4>
                {avEquipmentList.length > 0 && (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                    {avEquipmentList.length} Configured
                  </span>
                )}
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                {avEquipmentList.length > 0 ? (
                  avEquipmentList.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold shrink-0">✓</span>
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="flex items-center gap-2 text-slate-400 italic">
                    <span className="text-slate-400">ℹ</span>
                    <span>Standard AV setup available upon request.</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Workplace Amenities & Hospitality */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-blue-600">☕</span>
                  Workplace Amenities & Hospitality
                </h4>
                {roomAmenities.length > 0 && (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                    {roomAmenities.length} Included
                  </span>
                )}
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                {roomAmenities.length > 0 ? (
                  roomAmenities.map((amenity, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold shrink-0">✓</span>
                      <span className="text-slate-700">{amenity}</span>
                    </li>
                  ))
                ) : (
                  <li className="flex items-center gap-2 text-slate-400 italic">
                    <span className="text-slate-400">ℹ</span>
                    <span>Standard room amenities provided upon request.</span>
                  </li>
                )}
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
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3.5 sm:py-4 rounded-b-2xl sm:rounded-b-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-20">
          <p className="text-xs text-slate-500 font-medium">
            Hourly Rate: <strong className="text-slate-800">₹{room.hourlyRate ?? room.hourly_rate ?? '500'}/hr</strong> • Complimentary for Internal Teams
          </p>
          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
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
