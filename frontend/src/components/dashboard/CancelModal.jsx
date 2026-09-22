import React from 'react';

const CancelModal = ({ isOpen, onClose, onConfirm, booking }) => {
  if (!isOpen) return null;

  return (
    <div aria-labelledby="modal-title" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/35 backdrop-blur-[6px] transition-all duration-200" role="dialog">
      {/* Modal Container: Raised pure white surface, hairline border #e0e3e5, 8px radius, architectural shadow */}
      <div className="w-full max-w-[540px] bg-[#ffffff] rounded-[8px] border border-[#e0e3e5] shadow-[0_25px_50px_-12px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col transform transition-all">
        
        {/* Preview Image Banner with Overlaid Badges */}
        <div className="relative h-44 w-full overflow-hidden bg-slate-100 border-b border-[#e0e3e5]">
          <img alt={booking?.roomName || "Room"} className="w-full h-full object-cover object-center" src={booking?.imageUrl || "https://lh3.googleusercontent.com/aida/AEtjO1WGfyOGlT6EUSoIkdaOWcfz5Z2NthWdPgZPqEWHIen3UbNuFZtx7amAW2okbSpRhOU-XYJygQh3MNADrw6kpClS76Jzj8a_2ad6Ipjk6tJArHXDJ9jRTqCP7FoV01zS87GKtxeED_lbpxJp2npmXRrfJ1z8j05DlerKmca30EG4Mx2zny9Sz2AP8K0dI_Qkt_l9bThvnSrRClTQU7pZnCkdZI5bGOspbulLvA_VCqtTiTEamEvlnaUKnY4"} />
          {/* Soft top and bottom architectural vignettes for high-contrast tag readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/30"></div>
          
          {/* Top Corner Location & Tier Tag */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-white/90 backdrop-blur-md text-[11px] font-semibold text-slate-800 tracking-wide uppercase shadow-sm">
              <span className="material-symbols-outlined text-[13px] text-primary">apartment</span>
              {booking?.location?.split('•')[1]?.trim() || "Location"}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-slate-900/80 backdrop-blur-md text-[11px] font-semibold text-white tracking-wide shadow-sm">
              Tier 1
            </span>
          </div>
          
          {/* Bottom Room Specs Overlay Bar */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
            <div>
              <h3 className="text-white text-base font-bold tracking-tight drop-shadow-sm">{booking?.roomName || "Executive Boardroom"}</h3>
              <p className="text-slate-200 text-xs flex items-center gap-1 mt-0.5">
                <span>{booking?.location?.split('•')[0]?.trim() || "Wing"}</span>
                <span>•</span>
                <span>AV 4K Telepresence</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-[4px] text-slate-900 text-[11px] font-semibold shadow-sm">
              <span className="material-symbols-outlined text-[14px] text-slate-700">group</span>
              <span>Cap: {booking?.capacity || 8}</span>
            </div>
          </div>
        </div>
        
        {/* Modal Body Content */}
        <div className="p-6 space-y-4">
          {/* Header: Warning Icon + Title & Close Trigger */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0 text-[#ba1a1a]">
                <span className="material-symbols-outlined text-[22px]">warning</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-on-surface tracking-tight" id="modal-title">Cancel Reservation?</h2>
                <p className="text-sm text-secondary mt-0.5">This release action cannot be undone once confirmed.</p>
              </div>
            </div>
            <button aria-label="Close dialog" onClick={onClose} className="text-secondary hover:text-on-surface p-1 rounded hover:bg-slate-100 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/20">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          
          {/* Summary Information Card */}
          <div className="rounded-[6px] border border-[#e0e3e5] bg-[#f8f9ff] p-3 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-[#e0e3e5]">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-primary text-[18px]">event</span>
                <span className="text-sm font-semibold text-on-surface">{booking?.date || "Today"}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{booking?.duration || 60} mins</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[11px] text-secondary uppercase tracking-wider block">Time Slot</span>
                <span className="text-sm font-semibold text-on-surface flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">schedule</span>
                  {booking?.time || "10:00 AM – 11:30 AM"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-secondary uppercase tracking-wider block">Organizer</span>
                <span className="text-sm font-semibold text-on-surface flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">person</span>
                  You
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-[#e0e3e5] flex items-center justify-between text-sm text-secondary">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-slate-600">group</span>
                <span>Attendees notified</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="material-symbols-outlined text-[16px] text-[#047857]">check_circle</span>
                <span className="text-xs font-semibold">AV & Polycom Online</span>
              </div>
            </div>
          </div>
          
          {/* Policy Warning & Impact Notice */}
          <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-[6px] flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#ba1a1a] text-[18px] mt-0.5 flex-shrink-0">info</span>
            <p className="text-sm text-slate-700 leading-snug">
              Canceling immediately notifies all <strong className="text-slate-900 font-semibold">attendees</strong> via calendar invites, releases the hardware licenses, and returns the room to the corporate availability pool.
            </p>
          </div>
          
          {/* Reason for Cancellation Form */}
          <div className="space-y-2">
            <label className="block text-xs text-secondary font-medium" htmlFor="cancel-reason">
              Reason for cancellation <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <select className="w-full bg-[#ffffff] border border-[#e0e3e5] rounded-[4px] px-3 py-2 text-sm text-on-surface appearance-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors pr-8 cursor-pointer" id="cancel-reason">
                <option value="rescheduled">Meeting rescheduled to another date</option>
                <option value="host_unavailable">Host or key participants unavailable</option>
                <option value="moved_virtual">Moved to fully virtual call (no room needed)</option>
                <option value="not_needed">Project discussion completed / No longer needed</option>
              </select>
              <span className="material-symbols-outlined text-[18px] text-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
            </div>
          </div>
        </div>
        
        {/* Modal Footer Action Cluster */}
        <div className="px-6 py-4 bg-[#f8f9ff] border-t border-[#e0e3e5] flex items-center justify-end gap-3">
          {/* Secondary Action */}
          <button onClick={onClose} className="h-10 px-4 rounded-[4px] border border-[#e0e3e5] bg-[#ffffff] hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-slate-300 active:scale-[0.99]" type="button">
            Keep Booking
          </button>
          {/* Primary Destructive Action */}
          <button onClick={onConfirm} className="h-10 px-5 rounded-[4px] bg-[#ba1a1a] hover:bg-[#93000a] text-[#ffffff] text-sm font-semibold shadow-sm transition-all duration-150 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-rose-500/40 active:scale-[0.99]" type="button">
            <span className="material-symbols-outlined text-[18px]">event_busy</span>
            <span>Yes, Cancel Booking</span>
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default CancelModal;
