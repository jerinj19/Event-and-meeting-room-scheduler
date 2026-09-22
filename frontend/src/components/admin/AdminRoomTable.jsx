import React, { useState } from 'react';


export default function AdminRoomTable({
  rooms = [],
  loading = false,
  onEdit,
  onToggleStatus,
  onDelete,
  onCreateNew,
  actionLoadingId = null,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(rooms.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Pagination calculation
  const totalRooms = rooms.length;
  const totalPages = Math.ceil(totalRooms / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRooms);
  const paginatedRooms = rooms.slice(startIndex, endIndex);

  if (loading && rooms.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-8 shadow-sm">
        <div className="space-y-4 animate-pulse">
          <div className="h-10 bg-surface-container-low rounded-lg w-full"></div>
          <div className="h-16 bg-surface-container-low/60 rounded-lg w-full"></div>
          <div className="h-16 bg-surface-container-low/60 rounded-lg w-full"></div>
          <div className="h-16 bg-surface-container-low/60 rounded-lg w-full"></div>
          <div className="h-16 bg-surface-container-low/60 rounded-lg w-full"></div>
        </div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-12 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-secondary mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl" data-icon="meeting_room">meeting_room</span>
        </div>
        <h3 className="text-lg font-bold text-on-surface">No meeting rooms found</h3>
        <p className="text-xs text-secondary max-w-sm mx-auto mt-1 mb-6">
          No rooms matched your search filters, or no rooms have been registered yet.
        </p>
        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition"
        >
          <span className="material-symbols-outlined text-[16px]" data-icon="add">add</span>
          <span>Create New Room</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-sm overflow-hidden flex flex-col font-body-md">
      
      {/* Table responsive container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-surface-container-low/60 border-b border-outline-variant/40 text-xs font-semibold text-secondary select-none">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={rooms.length > 0 && selectedIds.length === rooms.length}
                  onChange={handleSelectAll}
                  className="rounded border-outline-variant text-primary focus:ring-primary/20"
                />
              </th>
              <th className="py-3 px-4" scope="col">Room Name & ID</th>
              <th className="py-3 px-4" scope="col">Location / Wing</th>
              <th className="py-3 px-4" scope="col">Capacity</th>
              <th className="py-3 px-4" scope="col">Amenities & Hardware</th>
              <th className="py-3 px-4" scope="col">Status</th>
              <th className="py-3 px-4" scope="col">Billing Rate</th>
              <th className="py-3 px-4" scope="col">Last Updated</th>
              <th className="py-3 px-4 text-right" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30 text-sm text-on-surface">
            {paginatedRooms.map((room) => {
              const isSelected = selectedIds.includes(room.id);
              const rawImage = room.image;
              const roomImage = typeof rawImage === 'string' && rawImage.startsWith('/media/')
                ? `http://localhost:8000${rawImage}`
                : rawImage;
              const roomCode = room.code || `RM-${(room.name || '01').toUpperCase().replace(/\s+/g, '-').slice(0, 10)}`;
              const isActionLoading = actionLoadingId === room.id;

              return (
                <tr
                  key={room.id}
                  className={`hover:bg-surface-container-low/40 transition-colors ${
                    isSelected ? 'bg-primary-container/5' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <td className="py-3.5 px-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectRow(room.id)}
                      className="rounded border-outline-variant text-primary focus:ring-primary/20"
                    />
                  </td>

                  {/* Room Name & Thumbnail */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3.5">
                      {roomImage ? (
                        <img
                          src={roomImage}
                          alt={room.name}
                          className="w-12 h-12 rounded-lg object-cover border border-outline-variant/50 shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-surface-container-low border border-outline-variant/50 flex items-center justify-center text-secondary flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-2xl text-primary/60" data-icon="meeting_room">meeting_room</span>
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-on-surface flex items-center gap-1.5">
                          <span>{room.name}</span>
                          <span className="material-symbols-outlined text-[14px] text-primary/70 cursor-pointer" title="Room details" data-icon="open_in_new">open_in_new</span>
                        </div>
                        <div className="text-[11px] font-mono text-secondary tracking-tight mt-0.5">
                          {roomCode}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Location / Wing */}
                  <td className="py-3.5 px-4">
                    <div className="text-xs text-secondary flex items-start gap-1 max-w-[220px]">
                      <span className="material-symbols-outlined text-[14px] text-secondary flex-shrink-0 mt-0.5" data-icon="location_on">location_on</span>
                      <span className="line-clamp-2">{room.location}</span>
                    </div>
                  </td>

                  {/* Capacity */}
                  <td className="py-3.5 px-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-semibold text-on-surface">
                      <span className="material-symbols-outlined text-[14px] text-secondary" data-icon="group">group</span>
                      <span>{room.capacity} Seats</span>
                    </div>
                  </td>

                  {/* Amenities */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-[280px]">
                      {Array.isArray(room.amenities) && room.amenities.length > 0 ? (
                        <>
                          {room.amenities.slice(0, 3).map((amenity, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface-container text-secondary border border-outline-variant/30"
                            >
                              {amenity}
                            </span>
                          ))}
                          {room.amenities.length > 3 && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-container-high text-secondary"
                              title={room.amenities.slice(3).join(', ')}
                            >
                              +{room.amenities.length - 3}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-outline italic">Standard setup</span>
                      )}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    {room.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Maintenance
                      </span>
                    )}
                  </td>

                  {/* Billing Rate */}
                  <td className="py-3.5 px-4">
                    <div className="text-xs font-medium text-on-surface">
                      <strong className="text-sm font-semibold">₹{room.hourly_rate ?? room.hourlyRate ?? '500'}</strong>
                      <span className="text-secondary text-[11px]"> / hr</span>
                    </div>
                  </td>

                  {/* Last Updated / Created By */}
                  <td className="py-3.5 px-4">
                    <div className="text-xs text-secondary">
                      <div className="font-medium text-on-surface truncate max-w-[120px]">
                        {room.created_by_email ? room.created_by_email.split('@')[0] : 'Admin'}
                      </div>
                      <div className="text-[10px] text-secondary/80">
                        {room.updated_at 
                          ? new Date(room.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          : 'Recently'}
                      </div>
                    </div>
                  </td>

                  {/* Inline Action Controls */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      
                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => onEdit(room)}
                        title="Edit Room Details"
                        disabled={isActionLoading}
                        className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition"
                      >
                        <span className="material-symbols-outlined text-[18px]" data-icon="edit">edit</span>
                      </button>

                      {/* Quick Toggle Status Switch */}
                      <button
                        type="button"
                        onClick={() => onToggleStatus(room)}
                        title={room.is_active ? 'Set to Maintenance' : 'Set to Active'}
                        disabled={isActionLoading}
                        className={`p-1.5 rounded-lg transition ${
                          room.is_active 
                            ? 'text-emerald-700 hover:bg-emerald-50' 
                            : 'text-amber-700 hover:bg-amber-50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]" data-icon={room.is_active ? 'toggle_on' : 'toggle_off'}>
                          {room.is_active ? 'toggle_on' : 'toggle_off'}
                        </span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => onDelete(room)}
                        title="Delete Room"
                        disabled={isActionLoading}
                        className="p-1.5 rounded-lg text-secondary hover:text-error hover:bg-error-container/20 transition"
                      >
                        <span className="material-symbols-outlined text-[18px]" data-icon="delete">delete</span>
                      </button>

                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-outline-variant/30 bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-secondary">
        <div className="flex items-center gap-4">
          <span>
            Showing <strong className="text-on-surface">{totalRooms > 0 ? startIndex + 1 : 0}</strong>–<strong className="text-on-surface">{endIndex}</strong> of <strong className="text-on-surface">{totalRooms}</strong> rooms
          </span>

          <div className="flex items-center gap-1.5">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded border border-outline-variant bg-surface-container-lowest text-on-surface text-xs focus:outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Pagination Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-low disabled:opacity-40 text-xs font-semibold transition"
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((page, idx, arr) => {
              const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
              return (
                <React.Fragment key={page}>
                  {showEllipsis && <span className="px-1 text-secondary">...</span>}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                      currentPage === page
                        ? 'bg-primary text-white shadow-sm'
                        : 'border border-outline-variant text-secondary hover:text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-low disabled:opacity-40 text-xs font-semibold transition"
          >
            Next
          </button>
        </div>
      </div>

    </div>
  );
}
