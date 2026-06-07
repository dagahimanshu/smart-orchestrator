"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { LayoutDashboard, ListTodo, CalendarDays, Settings, CalendarCog, CheckCircle2, Loader2, LogOut, Mail } from "lucide-react";
import { Tab, ConnectionState, Provider } from "@/types";
import { detectProvider, getAuthUrl, disconnectProvider } from "@/lib/api";

interface Props {
    activeTab: Tab;
    setActiveTab: Dispatch<SetStateAction<Tab>>;
    connection: ConnectionState;
    setConnection: Dispatch<SetStateAction<ConnectionState>>;
}

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "tasks",     label: "Tasks",     icon: ListTodo },
    { id: "calendar",  label: "Calendar",  icon: CalendarDays },
    { id: "settings",  label: "Settings",  icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab, connection, setConnection }: Props) {
    const [email, setEmail] = useState("");
    const [detecting, setDetecting] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConnect = async () => {
        if (!email || !email.includes("@")) { setError("Enter a valid email address"); return; }
        setError(null);
        setDetecting(true);

        try {
            const result = await detectProvider(email);

            if (result.provider === "unknown") {
                setError("Could not identify a Google or Microsoft calendar for this email.");
                setDetecting(false);
                return;
            }

            const provider = result.provider as Provider;

            if (result.authorized) {
                setConnection({ connected: true, provider, email });
                setDetecting(false);
                return;
            }

            setDetecting(false);
            setConnecting(true);

            const url = await getAuthUrl(provider);
            localStorage.removeItem("calendar_auth_status");
            window.open(url, `${provider}-auth`, "width=500,height=650,left=400,top=100");

            const onStorage = (e: StorageEvent) => {
                if (e.key !== "calendar_auth_status") return;
                window.removeEventListener("storage", onStorage);
                clearTimeout(fallbackTimer);

                try {
                    const data = JSON.parse(e.newValue ?? "{}");
                    if (data.status === "authorized" && data.provider === provider) {
                        setConnection({ connected: true, provider, email });
                    }
                } catch { /* ignore */ }

                setConnecting(false);
                localStorage.removeItem("calendar_auth_status");
            };

            window.addEventListener("storage", onStorage);

            const fallbackTimer = setTimeout(() => {
                window.removeEventListener("storage", onStorage);
                setConnecting(false);
            }, 120_000);

        } catch {
            setError("Failed to connect. Is the backend running?");
            setDetecting(false);
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (connection.provider) {
            console.log("[Sidebar] Disconnecting", connection.provider);
            await disconnectProvider(connection.provider);
        }
        setConnection({ connected: false, provider: null, email: null });
        setEmail("");
        setError(null);
    };

    const providerLabel = connection.provider === "microsoft" ? "Microsoft" : "Google";
    const isLoading = detecting || connecting;

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-mark">
                    <div className="logo-icon"><CalendarCog size={16} /></div>
                    <div>
                        <div className="logo-title">Smart Life</div>
                        <div className="logo-title">Orchestrator</div>
                    </div>
                </div>
                <div className="logo-sub">Calendar · Automation</div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section-label">Navigation</div>
                {NAV.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        className={`nav-item ${activeTab === id ? "active" : ""}`}
                        onClick={() => setActiveTab(id)}
                    >
                        <Icon size={15} />
                        {label}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="nav-section-label" style={{ padding: "0 0 8px" }}>Calendar</div>

                {connection.connected ? (
                    <div className="connected-card">
                        <div className="connected-info">
                            <CheckCircle2 size={14} className="connected-icon" />
                            <div>
                                <div className="connected-label">{providerLabel} Calendar</div>
                                <div className="connected-email">{connection.email}</div>
                            </div>
                        </div>
                        <button className="disconnect-btn" onClick={handleDisconnect} title="Disconnect">
                            <LogOut size={12} />
                        </button>
                    </div>
                ) : (
                    <div className="connect-form">
                        <div className="email-input-wrapper">
                            <Mail size={13} className="email-icon" />
                            <input
                                className="email-input"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setError(null); }}
                                onKeyDown={e => e.key === "Enter" && !isLoading && handleConnect()}
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            className="connect-btn"
                            onClick={handleConnect}
                            disabled={isLoading || !email}
                        >
                            {isLoading ? (
                                <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> {detecting ? "Detecting…" : "Connecting…"}</>
                            ) : (
                                "Connect Calendar"
                            )}
                        </button>
                        {error && <div className="connect-error">{error}</div>}
                    </div>
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </aside>
    );
}
