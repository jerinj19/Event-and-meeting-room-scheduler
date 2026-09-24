import React from 'react';

/**
 * ConflictBanner Component
 * Handles and displays HTTP 409 Conflict error states with concurrency details.
 */
export default function ConflictBanner({ error, onRefresh }) {
  if (!error) return null;

  const conflictList = error.details?.conflicts || [];
  const primaryConflict = conflictList[0];

  return (
    <div
      role="alert"
      className="bg-[#ffdad6] border border-[#ffb4ab] text-[#410002] rounded-2xl p-4 sm:p-5 shadow-sm transition-all animate-fadeIn"
    >
      <div className="flex items-start gap-3.5">
        {/* Warning Icon Shield */}
        <div className="w-9 h-9 rounded-xl bg-[#ba1a1a] text-white flex-shrink-0 flex items-center justify-center shadow-xs">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Banner Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#410002] tracking-tight">
                Slot Conflict Detected (HTTP 409)
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-red-200/70 text-[#410002] font-semibold tracking-wider">
                Concurrency Lock
              </span>
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#93000a] hover:text-[#410002] bg-white/80 hover:bg-white px-2.5 py-1 rounded-lg border border-[#ffb4ab] transition shadow-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Availability
              </button>
            )}
          </div>

          <p className="text-xs text-[#680006] mt-1 leading-relaxed">
            {error.message || 'The selected room is already booked for the requested time slot.'}
          </p>

          {primaryConflict && (
            <div className="mt-2.5 pt-2.5 border-t border-red-200/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#410002]">
              <span>
                <strong>Conflicting Booking:</strong> {primaryConflict.title}
              </span>
              {primaryConflict.booked_by && (
                <span>
                  <strong>Booked By:</strong> {primaryConflict.booked_by}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
