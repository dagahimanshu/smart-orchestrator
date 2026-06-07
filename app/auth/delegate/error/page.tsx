"use client";

export default function DelegateError() {
  return (
    <div className="consent-page">
      <div className="consent-card">
        <div className="consent-title">Authorization Failed</div>
        <p className="consent-desc">
          Authorization failed or the link has expired. Please request a new link.
        </p>
      </div>
    </div>
  );
}
