"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import CalendarView, { TimeSlot } from "@/components/CalendarView";
import TasksView from "@/components/TasksView";
import SettingsView from "@/components/SettingsView";
import AddTaskModal, { ModalPreset } from "@/components/AddTaskModal";
import { clearToken, getMe, getAuthUrl, connectCalendar } from "@/lib/api";
import { Event, Tab, ConnectionState, Provider } from "@/types";
import { CalendarCog, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [modalPreset, setModalPreset] = useState<ModalPreset | undefined>();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>({
    connected: false,
    provider: null,
    email: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      const me = await getMe();
      if (cancelled) return;

      if (me) {
        const conn: ConnectionState = {
          connected: me.calendarConnected,
          provider: (me.calendarProvider as Provider) ?? null,
          email: me.email,
        };
        setConnection(conn);
        localStorage.setItem("calendar_connection", JSON.stringify({
          ...conn,
          name: me.name,
          loginMethod: me.loginMethod,
        }));
        setReady(true);
        return;
      }

      const saved = localStorage.getItem("calendar_connection");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.email) {
            setConnection({
              connected: parsed.connected ?? false,
              provider: parsed.provider ?? null,
              email: parsed.email,
            });
            setReady(true);
            return;
          }
        } catch { /* ignore */ }
      }

      router.push("/");
    }
    restoreSession();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    if (connection.email) {
      const saved = localStorage.getItem("calendar_connection");
      const existing = saved ? JSON.parse(saved) : {};
      localStorage.setItem("calendar_connection", JSON.stringify({
        ...existing,
        connected: connection.connected,
        provider: connection.provider,
        email: connection.email,
      }));
    } else {
      localStorage.removeItem("calendar_connection");
      clearToken();
      router.push("/");
    }
  }, [connection, ready, router]);

  const handleConnectCalendar = async (provider: Provider) => {
    setConnectingCalendar(true);
    try {
      const url = await getAuthUrl(provider);
      localStorage.removeItem("calendar_auth_status");
      const popup = window.open(url, `${provider}-auth`, "width=500,height=650,left=400,top=100");

      if (!popup) {
        setConnectingCalendar(false);
        return;
      }

      const onStorage = (e: StorageEvent) => {
        if (e.key !== "calendar_auth_status") return;
        window.removeEventListener("storage", onStorage);
        clearTimeout(fallbackTimer);

        try {
          const data = JSON.parse(e.newValue ?? "{}");
          if (data.status === "authorized" && data.provider === provider) {
            connectCalendar(provider)
              .then((authData) => {
                setConnection({
                  connected: true,
                  provider,
                  email: authData.email,
                });
              })
              .catch(() => {})
              .finally(() => setConnectingCalendar(false));
          } else {
            setConnectingCalendar(false);
          }
        } catch {
          setConnectingCalendar(false);
        }

        localStorage.removeItem("calendar_auth_status");
      };

      window.addEventListener("storage", onStorage);
      const fallbackTimer = setTimeout(() => {
        window.removeEventListener("storage", onStorage);
        setConnectingCalendar(false);
      }, 120_000);
    } catch {
      setConnectingCalendar(false);
    }
  };

  const openModal = (preset?: ModalPreset) => {
    setModalPreset(preset);
    setShowModal(true);
  };

  const provider = connection.provider;
  if (!ready) return null;

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        connection={connection}
        setConnection={setConnection}
      />
      <main className="main-content">
        {!connection.connected && (
          <div className="connect-banner">
            <div>
              <div className="connect-banner-text" style={{ fontWeight: 600, marginBottom: 2 }}>
                <CalendarCog size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
                Calendar not connected
              </div>
              <div className="connect-banner-text">
                Connect your Google calendar to start scheduling.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="connect-banner-btn"
                onClick={() => handleConnectCalendar("google")}
                disabled={connectingCalendar}
              >
                {connectingCalendar ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Connect Google"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "dashboard" && (
          <Dashboard
            events={events}
            setEvents={setEvents}
            loading={loading}
            setLoading={setLoading}
            onAddTask={() => openModal()}
            connection={connection}
          />
        )}
        {activeTab === "calendar" && provider && (
          <CalendarView
            provider={provider}
            onCreateAtSlot={(slot: TimeSlot) => openModal(slot)}
          />
        )}
        {activeTab === "tasks" && provider && (
          <TasksView provider={provider} onAddTask={() => openModal()} />
        )}
        {activeTab === "settings" && (
          <SettingsView connection={connection} setConnection={setConnection} />
        )}

        {activeTab !== "dashboard" && activeTab !== "settings" && !provider && (
          <div className="empty-state">
            <span className="empty-icon">📅</span>
            <p className="empty-title">Connect a calendar first</p>
            <p className="empty-text">Use the banner above to connect Google calendar.</p>
          </div>
        )}
      </main>
      {showModal && (
        <AddTaskModal
          onClose={() => { setShowModal(false); setModalPreset(undefined); }}
          onAdd={(e) => setEvents((prev) => [...prev, e])}
          setLoading={setLoading}
          connection={connection}
          preset={modalPreset}
        />
      )}
    </div>
  );
}
