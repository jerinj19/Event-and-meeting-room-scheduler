import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AccessDenied.css";

const ShieldLockIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <circle cx="12" cy="11" r="1" />
    <path d="M12 12v3" />
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

export default function AccessDenied() {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const state = location.state || {};
  const email = state.email || searchParams.get("email") || "Unknown Account";
  const code = state.code || searchParams.get("code") || "USER_NOT_REGISTERED";
  const message = state.message || searchParams.get("message") || "Your Microsoft account is not registered in this system. Please contact your system administrator to gain access.";
  const adminContact = state.adminContact || searchParams.get("adminContact") || "admin@innovyx.com";

  const isDomainRestricted = code === "DOMAIN_NOT_ALLOWED";
  const statusTagText = isDomainRestricted ? "Domain Unauthorized" : "Account Unregistered";

  const mailtoSubject = encodeURIComponent("Access Request: Event & Meeting Room Scheduler");
  const mailtoBody = encodeURIComponent(
    `Hello Administrator,\n\nI attempted to sign in to the Event & Meeting Room Scheduler using my Microsoft 365 account, but received an access restriction notice.\n\nAccount Email: ${email}\nReason: ${statusTagText}\n\nPlease grant my account access or provision a user profile for me.\n\nThank you,\n${email}`
  );

  return (
    <div className="access-denied-layout">
      <div className="access-denied-card">
        <div className="access-denied-icon-wrap">
          <ShieldLockIcon />
        </div>

        <div className="access-badge">
          <span className="dot"></span> Access Restricted
        </div>

        <h1>Authorization Required</h1>
        <p className="access-denied-subtitle">
          Your Microsoft 365 identity was authenticated, but access to this workspace is restricted.
        </p>

        <div className="account-info-box">
          <span className="account-info-label">Attempted Microsoft 365 Account</span>
          <div className="account-info-value-row">
            <span className="account-info-email">{email}</span>
            <span className="account-status-tag">{statusTagText}</span>
          </div>
        </div>

        <div className="access-message-card">
          <p>{message}</p>
        </div>

        <div className="access-actions">
          <a
            href={`mailto:${adminContact}?subject=${mailtoSubject}&body=${mailtoBody}`}
            className="btn-contact-admin"
          >
            <MailIcon /> Contact Administrator ({adminContact})
          </a>

          <button
            type="button"
            className="btn-return-login"
            onClick={() => navigate("/")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <ArrowLeftIcon /> Return to Sign In
            </span>
          </button>
        </div>

        <div className="access-footer">
          Event & Meeting Room Scheduler · Protected by Enterprise Security
        </div>
      </div>
    </div>
  );
}
