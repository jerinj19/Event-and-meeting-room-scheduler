import React from 'react';

const AMENITY_ICONS = {
  '4K Screen': '📺',
  '4K Display': '📺',
  'Dual Display': '📺',
  '85" OLED': '📺',
  'Ultra-wide Screen': '📺',
  'Display Screen': '📺',
  'Polycom Video': '🎙️',
  'Video Conf': '🎙️',
  'Whiteboard': '🖊️',
  'Glass Whiteboard': '🖊️',
  'Glass Wall': '🖊️',
  'WiFi': '📶',
  'WiFi 6': '📶',
  'High-Speed WiFi': '📶',
  'Coffee Bar': '☕',
  'Acoustic Baffles': '🔇',
  'Audio Suite': '🔊',
  'Marble Table': '🏛️',
  'Standing Desk': '🪑',
  'Podcast Mic': '🎙️',
  'NRC 0.9 Felt': '🔇',
  'Ergonomic': '🪑',
};

export default function AmenityBadge({ label, icon, className = '' }) {
  const displayIcon = icon || AMENITY_ICONS[label] || '✓';

  return (
    <span
      className={`inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-medium border border-slate-200/60 ${className}`}
    >
      <span className="text-xs">{displayIcon}</span>
      <span>{label}</span>
    </span>
  );
}
