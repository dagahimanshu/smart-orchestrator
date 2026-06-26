"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCog, Mail, Lock, User, ArrowRight, Loader2, Zap, Brain, Calendar, Shield } from "lucide-react";
import { signup, loginWithPassword, loginWithOAuth, getAuthUrl, AuthResponse } from "@/lib/api";
import { Provider } from "@/types";

type AuthTab = "login" | "signup";

export default function LandingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAuthSuccess = (data: AuthResponse) => {
    const connection = {
      connected: data.calendarConnected,
      provider: data.calendarProvider as Provider | null,
      email: data.email,
      name: data.name,
      loginMethod: data.loginMethod,
    };
    localStorage.setItem("calendar_connection", JSON.stringify(connection));
    router.push("/dashboard");
  };

  const handleLogin = async () => {
    if (!email || !email.includes("@")) { setError("Enter a valid email address"); return; }
    if (!password) { setError("Enter your password"); return; }
    setError(null);
    setLoading(true);
    try {
      const data = await loginWithPassword(email, password);
      handleAuthSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name.trim()) { setError("Enter your name"); return; }
    if (!email || !email.includes("@")) { setError("Enter a valid email address"); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError(null);
    setLoading(true);
    try {
      const data = await signup(email, password, name);
      handleAuthSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: Provider) => {
    setError(null);
    setSocialLoading(provider);
    try {
      const url = await getAuthUrl(provider);
      localStorage.removeItem("calendar_auth_status");
      const popup = window.open(url, `${provider}-auth`, "width=500,height=650,left=400,top=100");

      if (!popup) {
        setError("Popup was blocked by your browser. Please allow popups and try again.");
        setSocialLoading(null);
        return;
      }

      const onStorage = (e: StorageEvent) => {
        if (e.key !== "calendar_auth_status") return;
        window.removeEventListener("storage", onStorage);
        clearTimeout(fallbackTimer);

        try {
          const callbackData = JSON.parse(e.newValue ?? "{}");
          if (callbackData.status === "authorized" && callbackData.provider === provider) {
            const oauthEmail = callbackData.email;
            if (!oauthEmail) {
              setError("Could not retrieve email from OAuth. Try again.");
              setSocialLoading(null);
              return;
            }
            loginWithOAuth(oauthEmail, provider)
              .then(handleAuthSuccess)
              .catch(() => {
                setError("Failed to complete login after OAuth");
                setSocialLoading(null);
              });
          } else {
            setSocialLoading(null);
          }
        } catch {
          setSocialLoading(null);
        }

        localStorage.removeItem("calendar_auth_status");
      };

      window.addEventListener("storage", onStorage);
      const fallbackTimer = setTimeout(() => {
        window.removeEventListener("storage", onStorage);
        setSocialLoading(null);
      }, 120_000);
    } catch {
      setError("Failed to start OAuth flow. Is the backend running?");
      setSocialLoading(null);
    }
  };

  const isLoading = loading || !!socialLoading;

  return (
    <div className="auth-page">
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="logo-icon"><CalendarCog size={16} /></div>
          <span className="landing-nav-title">Smart Life Orchestrator</span>
        </div>
      </nav>

      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Welcome</h1>
          <p className="auth-subtitle">
            {tab === "login" ? "Sign in to your account" : "Create a new account"}
          </p>

          <div className="auth-tabs">
            <button
              className={`auth-tab ${tab === "login" ? "active" : ""}`}
              onClick={() => { setTab("login"); setError(null); }}
            >
              Login
            </button>
            <button
              className={`auth-tab ${tab === "signup" ? "active" : ""}`}
              onClick={() => { setTab("signup"); setError(null); }}
            >
              Sign Up
            </button>
          </div>

          {tab === "login" ? (
            <>
              <div className="form-group">
                <div className="hero-input-wrapper">
                  <Mail size={16} className="hero-input-icon" />
                  <input
                    className="hero-input"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null); }}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="form-group">
                <div className="hero-input-wrapper">
                  <Lock size={16} className="hero-input-icon" />
                  <input
                    className="hero-input"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    onKeyDown={e => e.key === "Enter" && !isLoading && handleLogin()}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <button className="hero-btn" onClick={handleLogin} disabled={isLoading}>
                {loading ? (
                  <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Logging in…</>
                ) : (
                  <>Log In <ArrowRight size={16} /></>
                )}
              </button>

              <div className="auth-divider">
                <div className="auth-divider-line" />
                <span className="auth-divider-text">or sign in with</span>
                <div className="auth-divider-line" />
              </div>

              <button
                className="social-btn"
                onClick={() => handleSocialLogin("google")}
                disabled={isLoading}
              >
                {socialLoading === "google" ? (
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Calendar size={16} />
                )}
                Continue with Google
              </button>
              <button
                className="social-btn"
                onClick={() => handleSocialLogin("microsoft")}
                disabled={isLoading}
              >
                {socialLoading === "microsoft" ? (
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Shield size={16} />
                )}
                Continue with Microsoft
              </button>
            </>
          ) : (
            <>
              <div className="form-group">
                <div className="hero-input-wrapper">
                  <User size={16} className="hero-input-icon" />
                  <input
                    className="hero-input"
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={e => { setName(e.target.value); setError(null); }}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="form-group">
                <div className="hero-input-wrapper">
                  <Mail size={16} className="hero-input-icon" />
                  <input
                    className="hero-input"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null); }}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="form-group">
                <div className="hero-input-wrapper">
                  <Lock size={16} className="hero-input-icon" />
                  <input
                    className="hero-input"
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    onKeyDown={e => e.key === "Enter" && !isLoading && handleSignup()}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <button className="hero-btn" onClick={handleSignup} disabled={isLoading}>
                {loading ? (
                  <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Creating account…</>
                ) : (
                  <>Create Account <ArrowRight size={16} /></>
                )}
              </button>
            </>
          )}

          {error && <div className="auth-error">{error}</div>}
        </div>
      </div>

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
