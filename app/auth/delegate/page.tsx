"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { validateDelegateToken } from "@/lib/api";

function DelegateConsentInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ requesterEmail: string; provider: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing token.");
      setLoading(false);
      return;
    }
    validateDelegateToken(token)
      .then((data) => setInfo({ requesterEmail: data.requesterEmail, provider: data.provider }))
      .catch(() => setError("Invalid or expired link."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="consent-page">
        <div className="consent-card">
          <p className="consent-desc">Validating link…</p>
        </div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="consent-page">
        <div className="consent-card">
          <div className="consent-title">Authorization Failed</div>
          <p className="consent-desc">{error ?? "Something went wrong."}</p>
          <p className="consent-note">This link may have expired. Ask the requester to send a new one.</p>
        </div>
      </div>
    );
  }

  const handleAuthorize = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9090";
    window.location.href = `${apiUrl}/delegates/authorize?token=${encodeURIComponent(token)}`;
  };

  return (
    <div className="consent-page">
      <div className="consent-card">
        <div className="consent-title">Calendar Access Request</div>
        <p className="consent-desc">
          <span className="consent-email">{info.requesterEmail}</span> wants to create events on your{" "}
          {info.provider === "microsoft" ? "Microsoft" : "Google"} calendar.
        </p>
        <button className="consent-btn" onClick={handleAuthorize}>
          Authorize Access
        </button>
        <p className="consent-note">
          You&apos;ll be redirected to {info.provider === "microsoft" ? "Microsoft" : "Google"} to grant permission.
        </p>
      </div>
    </div>
  );
}

export default function DelegateConsentPage() {
  return (
    <Suspense fallback={<div className="consent-page"><div className="consent-card"><p className="consent-desc">Loading…</p></div></div>}>
      <DelegateConsentInner />
    </Suspense>
  );
}
