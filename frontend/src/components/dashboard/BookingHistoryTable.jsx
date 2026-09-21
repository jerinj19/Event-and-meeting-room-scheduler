import React, { useState } from 'react';
import StatusBadge from './StatusBadge';
import CancelModal from './CancelModal';
import { useToast } from '../../contexts/ToastContext';
import './BookingHistoryTable.css';

const BookingHistoryTable = ({ bookings = [] }) => {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const toast = useToast();

  const handleCancelClick = (booking) => {
    setSelectedBooking(booking);
  };

  const confirmCancel = () => {
    // In a real app: PATCH /api/bookings/{id}/cancel/
    toast.success(`Successfully cancelled booking for ${selectedBooking.roomName}`);
    
    // Optimistic UI Update (Mock)
    selectedBooking.status = 'CANCELLED';
    setSelectedBooking(null);
  };

  return (
    <div className="table-container">
      <table className="booking-table">
        <thead>
          <tr>
            <th>Room Details</th>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            <th className="action-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td className="room-cell">
                <div className="room-preview" style={{ backgroundImage: `url(${booking.imageUrl})` }}></div>
                <div className="room-info">
                  <span className="room-name">{booking.roomName}</span>
                  <span className="room-location">{booking.location}</span>
                </div>
              </td>
              <td className="tabular-data">{booking.date}</td>
              <td className="tabular-data">{booking.time}</td>
              <td><StatusBadge status={booking.status} /></td>
              <td className="action-col">
                {booking.status === 'CONFIRMED' && (
                  <button className="btn-cancel" onClick={() => handleCancelClick(booking)}>
                    Cancel Booking
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
