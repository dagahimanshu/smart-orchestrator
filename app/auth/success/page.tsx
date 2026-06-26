"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthSuccessInner() {
  const params = useSearchParams();
  const provider = params.get("provider") ?? "google";
  const email = params.get("email") ?? "";

  useEffect(() => {
    localStorage.setItem("calendar_auth_status", JSON.stringify({ provider, status: "authorized", email }));
    window.close();
  }, [provider, email]);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 40, textAlign: "center" }}>
      <p>{provider === "microsoft" ? "Microsoft" : "Google"} Calendar authorized. Closing...</p>
    </div>
  );
}

export default function AuthSuccess() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading...</div>}>
      <AuthSuccessInner />
    </Suspense>
  );
}
