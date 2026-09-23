import React from 'react';
import AmenityBadge from './AmenityBadge';

export default function RoomCard({ room, onViewSpecs, onBook }) {
  const isAvailable = room.status === 'Available' || room.is_active !== false && room.status !== 'In-Maintenance';
  const isMaintenance = room.status === 'In-Maintenance';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between group">
      <div>
        {/* Room Image Container */}
        <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-100">
          <img
            src={room.image || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'}
            alt={room.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition duration-300 ${
              isMaintenance ? 'grayscale-[20%]' : ''
            }`}
            loading="lazy"
          />

          {/* Status Badge Overlay */}
          <span
            className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs ${
              isAvailable
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isMaintenance
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isAvailable ? 'bg-emerald-500 animate-pulse' : isMaintenance ? 'bg-amber-500' : 'bg-rose-500'
              }`}
            ></span>
            {room.status || (room.is_active ? 'Available' : 'Reserved')}
          </span>

          {/* Capacity and Area Pill */}
          <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-lg flex items-center gap-2">
            <span>👥 {room.capacity} People</span>
            {room.area && (
              <>
                <span className="text-slate-400">•</span>
                <span>{room.area}</span>
              </>
            )}
          </div>
        </div>

        {/* Card Content Details */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-blue-600 transition leading-snug">
                {room.name}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{room.location}</span>
              </p>
            </div>
            {(room.hourlyRate !== undefined || room.hourly_rate !== undefined) && (
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded shrink-0">
                ₹{room.hourlyRate ?? room.hourly_rate}
                <span className="text-slate-400 font-normal">/hr</span>
              </span>
            )}
          </div>

          {/* Amenity Badges */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {room.amenities &&
              room.amenities.slice(0, 3).map((amenity, idx) => (
                <AmenityBadge key={idx} label={amenity} />
              ))}
            {room.amenities && room.amenities.length > 3 && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium border border-slate-200/50">
                +{room.amenities.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 sm:p-5 pt-0 grid grid-cols-2 gap-2 border-t border-slate-50 mt-2">
        <button
          type="button"
          onClick={() => onViewSpecs(room)}
          className="w-full py-2 px-3 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View Specs
        </button>

        {isMaintenance ? (
          <button
            type="button"
            disabled
            className="w-full py-2 px-3 bg-slate-100 text-slate-400 text-xs font-semibold rounded-xl cursor-not-allowed flex items-center justify-center gap-1"
          >
            Unavailable
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onBook(room)}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1 shadow-xs shadow-blue-500/20"
          >
            Book Slot ➔
          </button>
        )}
      </div>
    </div>
  );
}
