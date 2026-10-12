import React from 'react';

const StatusBadge = ({ status }) => {
  const isConfirmed = status.toUpperCase() === 'CONFIRMED';
  
  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    backgroundColor: isConfirmed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)',
    color: isConfirmed ? '#10b981' : '#64748b',
    border: `1px solid ${isConfirmed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
  };

  const dotStyle = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: isConfirmed ? '#10b981' : '#64748b',
    marginRight: '6px',
  };

  return (
    <div style={badgeStyle}>
      <span style={dotStyle}></span>
      {status}
    </div>
  );
};

export default StatusBadge;
