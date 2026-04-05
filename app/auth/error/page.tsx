"use client";
import { useEffect } from "react";

export default function AuthError() {
  useEffect(() => {
    localStorage.setItem("google_auth_status", "error");
    window.close();
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 40, textAlign: "center" }}>
      <p>Authorization failed. Closing...</p>
    </div>
  );
}