"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCog, Mail, ArrowRight, Loader2, Zap, Brain, Calendar, Shield } from "lucide-react";
import { detectProvider, getAuthUrl } from "@/lib/api";
import { Provider } from "@/types";

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetStarted = async () => {
    console.log("[Landing] Get Started clicked, email:", email);
    if (!email || !email.includes("@")) { setError("Enter a valid email address"); return; }
    setError(null);
    setLoading(true);

    try {
      console.log("[Landing] Detecting provider for:", email);
      const result = await detectProvider(email);
      console.log("[Landing] Provider detection result:", result);

      if (result.provider === "unknown") {
        console.log("[Landing] Provider unknown, showing error");
        setError("Could not identify a Google or Microsoft calendar for this email.");
        setLoading(false);
        return;
      }

      const provider = result.provider as Provider;

      if (result.authorized) {
        console.log("[Landing] Already authorized for", provider, "— redirecting to dashboard");
        localStorage.setItem("calendar_connection", JSON.stringify({ connected: true, provider, email }));
        router.push("/dashboard");
        return;
      }

      console.log("[Landing] Not authorized, getting auth URL for", provider);
      const url = await getAuthUrl(provider);
      console.log("[Landing] Opening OAuth popup:", url.substring(0, 80) + "...");
      localStorage.removeItem("calendar_auth_status");
      const popup = window.open(url, `${provider}-auth`, "width=500,height=650,left=400,top=100");
      console.log("[Landing] Popup opened:", popup ? "success" : "BLOCKED by browser");

      if (!popup) {
        setError("Popup was blocked by your browser. Please allow popups and try again.");
        setLoading(false);
        return;
      }

      const onStorage = (e: StorageEvent) => {
        console.log("[Landing] Storage event:", e.key, e.newValue);
        if (e.key !== "calendar_auth_status") return;
        window.removeEventListener("storage", onStorage);
        clearTimeout(fallbackTimer);

        try {
          const data = JSON.parse(e.newValue ?? "{}");
          console.log("[Landing] Auth callback data:", data);
          if (data.status === "authorized" && data.provider === provider) {
            console.log("[Landing] Auth success! Redirecting to dashboard");
            localStorage.setItem("calendar_connection", JSON.stringify({ connected: true, provider, email }));
            router.push("/dashboard");
          }
        } catch (err) { console.error("[Landing] Failed to parse auth callback:", err); }

        setLoading(false);
        localStorage.removeItem("calendar_auth_status");
      };

      window.addEventListener("storage", onStorage);
      const fallbackTimer = setTimeout(() => {
        console.log("[Landing] Auth timeout (120s) — cleaning up");
        window.removeEventListener("storage", onStorage);
        setLoading(false);
      }, 120_000);

    } catch (err) {
      console.error("[Landing] handleGetStarted FAILED:", err);
      setError("Failed to connect. Is the backend running?");
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="logo-icon"><CalendarCog size={16} /></div>
          <span className="landing-nav-title">Smart Life Orchestrator</span>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-badge">AI-Powered Calendar Scheduling</div>
        <h1 className="hero-title">Your calendar,<br />intelligently managed</h1>
        <p className="hero-subtitle">
          Connect your Google or Microsoft calendar. Smart Orchestrator auto-detects your provider,
          infers task priority with AI, and keeps your schedule organized.
        </p>

        <div className="hero-form">
          <div className="hero-input-wrapper">
            <Mail size={16} className="hero-input-icon" />
            <input
              className="hero-input"
              type="email"
              placeholder="Enter your work or personal email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              onKeyDown={e => e.key === "Enter" && !loading && handleGetStarted()}
              disabled={loading}
            />
          </div>
          <button className="hero-btn" onClick={handleGetStarted} disabled={loading || !email}>
            {loading ? (
              <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Connecting…</>
            ) : (
              <>Get Started <ArrowRight size={16} /></>
            )}
          </button>
          {error && <div className="hero-error">{error}</div>}
          <p className="hero-hint">We'll auto-detect if it's Google or Microsoft</p>
        </div>
      </section>

      <section className="features">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrap"><Brain size={20} /></div>
            <h3 className="feature-title">AI Priority</h3>
            <p className="feature-desc">Automatically infers task priority using AI when you don't specify one.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><Calendar size={20} /></div>
            <h3 className="feature-title">Unified Calendar</h3>
            <p className="feature-desc">Works with both Google Calendar and Microsoft Outlook seamlessly.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><Zap size={20} /></div>
            <h3 className="feature-title">Smart Scheduling</h3>
            <p className="feature-desc">Create events with Meet or Teams links, attachments, and color-coded priorities.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><Shield size={20} /></div>
            <h3 className="feature-title">Secure by Design</h3>
            <p className="feature-desc">OAuth-based auth. Your credentials stay with Google and Microsoft, never with us.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>Smart Life Orchestrator · Calendar + AI Automation</p>
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
