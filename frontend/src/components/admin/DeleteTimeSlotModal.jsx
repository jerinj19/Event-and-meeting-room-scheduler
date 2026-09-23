import React from 'react';

export default function DeleteTimeSlotModal({ isOpen, onClose, onConfirm, slot, loading }) {
  if (!isOpen || !slot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-timeslot-title"
      >
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-error-container/20 text-error flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl" data-icon="warning">warning</span>
            </div>
            <div>
              <h3 id="delete-timeslot-title" className="text-lg font-bold text-on-surface">
                Delete Time Slot?
              </h3>
              <p className="text-xs text-secondary mt-0.5">
                This will remove the slot from the dynamic scheduling picker.
              </p>
            </div>
          </div>

          <div className="mt-4 p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-1">
            <div className="font-semibold text-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary" data-icon="schedule">schedule</span>
              <span>{slot.label || slot.formatted_label}</span>
            </div>
            <div className="text-xs text-secondary flex items-center gap-1.5">
              <span>{slot.start} – {slot.end}</span>
              <span>•</span>
              <span className="capitalize">{slot.period}</span>
              <span>•</span>
              <span>{slot.room_name || 'Global (All Rooms)'}</span>
            </div>
          </div>

          <p className="mt-4 text-xs text-secondary leading-relaxed">
            Deleting this slot will permanently remove it from booking choices. You can also toggle the slot to <strong>Inactive</strong> if you only want to temporarily disable it.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 bg-surface-container-low/60 border-t border-outline-variant/30">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-secondary hover:text-on-surface hover:bg-surface-container rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(slot.id)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-error hover:bg-error/90 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]" data-icon="delete">delete</span>
                <span>Delete Slot</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
