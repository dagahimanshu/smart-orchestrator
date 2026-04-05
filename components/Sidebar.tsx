"use client";

import { Dispatch, SetStateAction } from "react";
import { LayoutDashboard, ListTodo, CalendarDays, Settings, CalendarCog, CheckCircle2, Circle } from "lucide-react";
import { Tab } from "@/types";
import { getAuthUrl } from "@/lib/api";

interface Props {
    activeTab: Tab;
    setActiveTab: Dispatch<SetStateAction<Tab>>;
    authorized: boolean;
    setAuthorized: Dispatch<SetStateAction<boolean>>;
    setLoading: Dispatch<SetStateAction<boolean>>;
}

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "tasks",     label: "Tasks",     icon: ListTodo },
    { id: "calendar",  label: "Calendar",  icon: CalendarDays },
    { id: "settings",  label: "Settings",  icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab, authorized, setAuthorized, setLoading }: Props) {

    const handleAuth = async () => {
        if (authorized) return;
        setLoading(true);
        localStorage.removeItem("google_auth_status");

        try {
            const url = await getAuthUrl();
            window.open(url, "google-auth", "width=500,height=650,left=400,top=100");

            const onStorage = (e: StorageEvent) => {
                if (e.key !== "google_auth_status") return;
                window.removeEventListener("storage", onStorage);
                clearTimeout(fallbackTimer);

                if (e.newValue === "authorized") setAuthorized(true);
                setLoading(false);
                localStorage.removeItem("google_auth_status");
            };

            window.addEventListener("storage", onStorage);

            const fallbackTimer = setTimeout(() => {
                window.removeEventListener("storage", onStorage);
                setLoading(false);
            }, 120_000);

        } catch {
            setLoading(false);
        }
    }; // ← handleAuth ends here

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
                <button
                    className={`auth-btn ${authorized ? "connected" : ""}`}
                    onClick={handleAuth}
                >
                    {authorized ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    {authorized ? "Google Calendar linked" : "Connect Google Calendar"}
                </button>
            </div>
        </aside>
    );
} 
