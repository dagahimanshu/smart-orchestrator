"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthErrorInner() {
  const params = useSearchParams();
  const provider = params.get("provider") ?? "google";

  useEffect(() => {
    localStorage.setItem("calendar_auth_status", JSON.stringify({ provider, status: "error" }));
    window.close();
  }, [provider]);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 40, textAlign: "center" }}>
      <p>{provider === "microsoft" ? "Microsoft" : "Google"} Calendar authorization failed. Closing...</p>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading...</div>}>
      <AuthErrorInner />
    </Suspense>
  );
}
