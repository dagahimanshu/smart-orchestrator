"use client";

import { Dispatch, SetStateAction, useState, useEffect } from "react";
import { LogOut, Trash2, Send } from "lucide-react";
import { ConnectionState, Provider } from "@/types";
import { disconnectProvider, requestDelegateAccess, listDelegates, removeDelegate, clearToken, DelegateInfo } from "@/lib/api";

interface Props {
  connection: ConnectionState;
  setConnection: Dispatch<SetStateAction<ConnectionState>>;
}

function detectProvider(email: string, fallback: Provider | null): Provider {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain.includes("gmail") || domain.includes("googlemail")) return "google";
  if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live.com") || domain.includes("microsoft")) return "microsoft";
  return fallback ?? "google";
}

export default function SettingsView({ connection, setConnection }: Props) {
  const providerLabel = connection.provider === "microsoft" ? "Microsoft" : "Google";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [delegates, setDelegates] = useState<DelegateInfo[]>([]);
  const [requestEmail, setRequestEmail] = useState("");
  const [requestStatus, setRequestStatus] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    listDelegates().then(setDelegates);
  }, []);

  const handleDisconnect = async () => {
    if (connection.provider) {
      await disconnectProvider(connection.provider);
    }
    clearToken();
    setConnection({ connected: false, provider: null, email: null });
  };

  const handleRequestAccess = async () => {
    if (!requestEmail) return;
    setRequesting(true);
    setRequestStatus(null);
    try {
      const provider = detectProvider(requestEmail, connection.provider);
      await requestDelegateAccess(requestEmail, provider);
      setRequestStatus({ msg: `Request sent! Magic link emailed to ${requestEmail}`, type: "success" });
      setRequestEmail("");
    } catch {
      setRequestStatus({ msg: "Failed to send request. Check the email and try again.", type: "error" });
    } finally {
      setRequesting(false);
    }
  };

  const handleRemoveDelegate = async (email: string) => {
    await removeDelegate(email);
    setDelegates(prev => prev.filter(d => d.email !== email));
  };

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 32 }}>Settings</h1>

      <div className="settings-section">
        <div className="settings-title">Connected Account</div>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-label">Provider</span>
            <span className="settings-value">{providerLabel} Calendar</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Email</span>
            <span className="settings-value">{connection.email ?? "—"}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Status</span>
            <span className="settings-value" style={{ color: "var(--green-accent)" }}>Connected</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Delegates</div>
        <div className="settings-card">
          <div className="delegate-list">
            {delegates.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>No delegates authorized yet.</p>
            )}
            {delegates.map(d => (
              <div key={d.email} className="delegate-item">
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span className="delegate-email">{d.email}</span>
                  <span className={`delegate-provider ${d.provider}`}>{d.provider}</span>
                </div>
                <button className="delegate-remove-btn" onClick={() => handleRemoveDelegate(d.email)}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="delegate-request-form">
            <input
              className="form-input"
              type="email"
              placeholder="senior@example.com"
              value={requestEmail}
              onChange={e => setRequestEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleRequestAccess()}
            />
            <button className="delegate-request-btn" onClick={handleRequestAccess} disabled={requesting || !requestEmail}>
              <Send size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              {requesting ? "Sending…" : "Request Access"}
            </button>
          </div>
          {requestStatus && (
            <div className={`delegate-status ${requestStatus.type}`}>{requestStatus.msg}</div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Timezone</div>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-label">Current Timezone</span>
            <span className="settings-value">{timezone}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">UTC Offset</span>
            <span className="settings-value">UTC{new Date().getTimezoneOffset() <= 0 ? "+" : "-"}{String(Math.floor(Math.abs(new Date().getTimezoneOffset()) / 60)).padStart(2, "0")}:{String(Math.abs(new Date().getTimezoneOffset()) % 60).padStart(2, "0")}</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Danger Zone</div>
        <button className="disconnect-full-btn" onClick={handleDisconnect}>
          <LogOut size={14} />
          Disconnect Calendar
        </button>
      </div>
    </div>
  );
}
