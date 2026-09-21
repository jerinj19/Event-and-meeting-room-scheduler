import React from 'react';
import './CancelModal.css';

const CancelModal = ({ isOpen, onClose, onConfirm, booking }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {booking?.imageUrl && (
          <div className="modal-image-header" style={{ backgroundImage: `url(${booking.imageUrl})` }}></div>
        )}
        
        <div className="modal-content">
          <h2 className="modal-title">Cancel Reservation</h2>
          <p className="modal-description">
            Are you sure you want to cancel your booking for <strong>{booking?.roomName}</strong> on {booking?.date} at {booking?.time}? This action cannot be undone.
          </p>
          
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>
              Keep Booking
            </button>
            <button className="btn-destructive" onClick={onConfirm}>
              Yes, Cancel Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelModal;
