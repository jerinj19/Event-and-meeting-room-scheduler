import React, { useState } from 'react';
import CancelModal from './CancelModal';
import { useToast } from '../../contexts/ToastContext';
import { fetchWithAuth } from '../../services/apiClient';

const BookingHistoryTable = ({ bookings = [], onCancelSuccess }) => {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const toast = useToast();

  const handleCancelClick = (booking) => {
    setSelectedBooking(booking);
  };

  const confirmCancel = async () => {
    try {
      const response = await fetchWithAuth(`http://localhost:8000/api/bookings/${selectedBooking.id}/cancel/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to cancel booking');
      
      toast.success(`Successfully cancelled booking for ${selectedBooking.roomName}`);
      setSelectedBooking(null);
      if (onCancelSuccess) {
        onCancelSuccess();
      }
    } catch (err) {
      toast.error('Could not cancel booking.');
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low/60 border-b border-outline-variant/40 text-label-xs font-label-xs text-secondary uppercase tracking-wider">
              <th className="py-3.5 px-5 font-semibold" scope="col">Room Details</th>
              <th className="py-3.5 px-4 font-semibold" scope="col">Date</th>
              <th className="py-3.5 px-4 font-semibold" scope="col">Time Interval</th>
              <th className="py-3.5 px-4 font-semibold" scope="col">Status</th>
              <th className="py-3.5 px-5 text-right font-semibold" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30 text-body-sm font-body-sm">
            {bookings.map((booking) => {
              const isCancelled = booking.status === 'CANCELLED';
              const isConfirmed = booking.status === 'CONFIRMED';
              
              return (
                <tr key={booking.id} className={`hover:bg-surface-container-low/30 transition-colors group ${isCancelled ? 'bg-surface-container-low/10 opacity-90' : ''}`}>
                  <td className="py-4 px-5">
                    <div className="flex items-center space-x-4">
                      <div className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border border-outline-variant/30 shadow-sm ${isCancelled ? 'grayscale-[30%]' : ''}`}>
                        <img alt={booking.roomName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={booking.imageUrl} />
                        <span className="absolute bottom-1 right-1 bg-on-surface/80 text-white text-[9px] px-1 py-0.2 rounded font-medium">RM</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-title-sm text-title-sm font-semibold text-on-surface">{booking.roomName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-container-high text-primary">Cap: {booking.capacity}</span>
                        </div>
                        <div className="text-body-sm text-secondary flex items-center space-x-1.5 mt-0.5">
                          <span className="material-symbols-outlined text-[14px]" data-icon="location_on">location_on</span>
                          <span>{booking.location}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1.5 text-label-xs text-outline">
                          <span className="flex items-center"><span className="material-symbols-outlined text-[13px] mr-1" data-icon="videocam">videocam</span>4K Telepresence</span>
                          <span>•</span>
                          <span className="flex items-center"><span className="material-symbols-outlined text-[13px] mr-1" data-icon="speaker">speaker</span>Polycom Studio</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="font-medium text-on-surface">{booking.date}</div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="font-medium text-on-surface">{booking.time}</div>
                    <div className="text-label-xs text-outline">{booking.duration} mins duration</div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    {isCancelled ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-label-xs font-semibold bg-error-container text-on-error-container border border-error/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-error mr-1.5"></span>
                        CANCELLED
                      </span>
                    ) : isConfirmed ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-label-xs font-semibold bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#047857] mr-1.5"></span>
                        CONFIRMED
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-label-xs font-semibold bg-surface-container-high text-secondary border border-outline-variant/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-outline mr-1.5"></span>
                        {booking.status}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2">
                      {!booking.isPast && isConfirmed && (
                        <button 
                          onClick={() => handleCancelClick(booking)}
                          className="px-3 py-1.5 border border-error/30 text-error hover:bg-error/5 text-label-sm font-label-sm rounded-lg transition-colors">
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="px-5 py-3.5 bg-surface-container-low/40 border-t border-outline-variant/30 flex items-center justify-between text-body-sm text-secondary">
        <div className="text-label-sm font-label-sm">
          Showing <span className="font-semibold text-on-surface">{bookings.length}</span> reservations
        </div>
        <div className="flex items-center space-x-1">
          <button className="px-2.5 py-1 rounded border border-outline-variant/40 text-outline hover:bg-surface-container-lowest disabled:opacity-40" disabled>
            <span className="material-symbols-outlined text-[16px]" data-icon="chevron_left">chevron_left</span>
          </button>
          <span className="px-3 py-1 text-label-sm font-semibold bg-primary-container text-on-primary rounded">1</span>
          <button className="px-2.5 py-1 rounded border border-outline-variant/40 text-outline hover:bg-surface-container-lowest disabled:opacity-40" disabled>
            <span className="material-symbols-outlined text-[16px]" data-icon="chevron_right">chevron_right</span>
          </button>
        </div>
      </div>

      <CancelModal 
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onConfirm={confirmCancel}
        booking={selectedBooking}
      />
    </div>
  );
};

export default BookingHistoryTable;
