"use client";
import { useEffect } from "react";

export default function AuthSuccess() {
  useEffect(() => {
    localStorage.setItem("google_auth_status", "authorized");
    window.close();
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 40, textAlign: "center" }}>
      <p>Authorization complete. Closing...</p>
    </div>
  );
}