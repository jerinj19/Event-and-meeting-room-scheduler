import React from 'react';
import RoomCard from './RoomCard';

export default function RoomGrid({ rooms, onViewSpecs, onBook, onResetFilters }) {
  if (!rooms || rooms.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-4">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900">No matching rooms found</h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">
          Try clearing some filters or changing capacity criteria to see available workspaces.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition shadow-xs"
        >
          Reset All Filters
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          onViewSpecs={onViewSpecs}
          onBook={onBook}
        />
      ))}
    </div>
  );
}
