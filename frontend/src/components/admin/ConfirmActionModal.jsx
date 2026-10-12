import React from 'react';

export default function ConfirmActionModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title,
  subtitle = "Session Management",
  icon = "warning",
  iconColor = "text-primary",
  iconBg = "bg-slate-100",
  confirmText = "Confirm",
  confirmColorClass = "bg-primary hover:bg-primary/90 text-white",
  noticeText,
  targetUser = null,
  isDemote = false,
  isBlock = false
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200">
      <div className="relative w-full max-w-[500px] bg-white rounded-xl shadow-[0_20px_25px_-5px_rgba(15,23,42,0.1),0_8px_10px_-6px_rgba(15,23,42,0.04)] overflow-hidden transition-all transform scale-100 flex flex-col">
        {/* Top Subtle Security Accent Bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${
          confirmColorClass.includes('red') 
            ? 'from-red-600 via-red-500 to-rose-500' 
            : confirmColorClass.includes('amber')
              ? 'from-amber-600 via-amber-500 to-orange-500'
              : 'from-primary via-blue-500 to-cyan-500'
        }`}></div>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          aria-label="Dismiss Modal" 
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" 
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="p-6 sm:p-7 flex flex-col text-left">
          {/* Icon & Heading Header */}
          <div className="flex items-start gap-4 mb-5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${iconBg} ${iconColor}`}>
              <span className="material-symbols-outlined text-[26px]">{icon}</span>
            </div>
            <div className="flex-1 pr-6">
              <span className="text-[11px] tracking-wider uppercase text-slate-500 font-semibold">{subtitle}</span>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight mt-0.5">{title}</h1>
            </div>
          </div>

          {/* Target User Profile Card */}
          {targetUser && (
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3.5 mb-4 shadow-sm">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shadow-sm">
                  {targetUser.first_name ? targetUser.first_name[0] : (targetUser.email ? targetUser.email[0].toUpperCase() : 'U')}
                </div>
                {targetUser.is_active && !isBlock && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" title="Active on network"></span>
                )}
                {(!targetUser.is_active || isBlock) && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-red-500 ring-2 ring-white" title="Blocked or about to be blocked"></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 truncate">{targetUser.first_name || 'User'} {targetUser.last_name || ''}</h2>
                  <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold capitalize">
                    {targetUser.role || (targetUser.is_staff ? 'Admin' : 'Member')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{targetUser.department || 'General Department'}</p>
                <p className="text-[11px] text-slate-400 truncate font-mono mt-0.5">{targetUser.email}</p>
              </div>
            </div>
          )}

          {/* Session Notice */}
          {noticeText && (
            <div className={`p-4 rounded-lg mb-6 flex gap-3 text-start ${
              confirmColorClass.includes('red') ? 'bg-red-50 border border-red-100' : 
              confirmColorClass.includes('amber') ? 'bg-amber-50 border border-amber-100' : 
              'bg-slate-50 border border-slate-100'
            }`}>
              <span className={`material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5 ${
                confirmColorClass.includes('red') ? 'text-red-600' : 
                confirmColorClass.includes('amber') ? 'text-amber-600' : 
                'text-primary'
              }`}>
                info
              </span>
              <div className={`flex-1 text-xs leading-relaxed ${
                confirmColorClass.includes('red') ? 'text-red-800' : 
                confirmColorClass.includes('amber') ? 'text-amber-800' : 
                'text-slate-600'
              }`}>
                {noticeText}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center gap-3">
            <button 
              onClick={onClose}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors duration-150 shadow-sm flex items-center justify-center" 
              type="button"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className={`w-full sm:w-1/2 py-2.5 px-4 rounded-lg text-sm font-medium shadow-sm active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 ${confirmColorClass}`} 
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
        
        {/* Modal Footer Security Badge */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
            <span className="text-[10px] font-medium uppercase tracking-wider">Protected by SOC2 Type II</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Action logged securely</span>
        </div>
      </div>
    </div>
  );
}
