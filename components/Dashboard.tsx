"use client";

import { Dispatch, SetStateAction, useEffect } from "react";
import { Plus, RefreshCw, ExternalLink, Calendar, Clock, AlertTriangle } from "lucide-react";
import { Event, ConnectionState } from "@/types";
import { getNextDayEvents } from "@/lib/api";

interface Props {
  events: Event[];
  setEvents: Dispatch<SetStateAction<Event[]>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  onAddTask: () => void;
  connection: ConnectionState;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 4) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function priorityClass(p?: string | null) {
  switch (p?.toUpperCase()) {
    case "URGENT": return "priority-urgent";
    case "HIGH":   return "priority-high";
    case "MEDIUM": return "priority-medium";
    default:       return "priority-low";
  }
}

function DateStrip() {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() + i); return d; });
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return (
    <div className="date-strip">
      {days.map((d, i) => (
        <div key={i} className={`date-pill ${i === 0 ? "today" : ""}`}>
          <span className="date-day">{DAYS[d.getDay()]}</span>
          <span className="date-num">{d.getDate()}</span>
          {i <= 2 && <span className="date-dot" />}
        </div>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton" style={{ width: 48, height: 36, flexShrink: 0 }} />
      <div style={{ width: 1, height: 40, background: "var(--border)", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="skeleton" style={{ height: 14, width: "55%" }} />
        <div className="skeleton" style={{ height: 12, width: "75%" }} />
      </div>
    </div>
  );
}

export default function Dashboard({ events, setEvents, loading, setLoading, onAddTask, connection }: Props) {
  const fetchEvents = async () => {
    if (!connection.connected || !connection.provider) return;
    setLoading(true);
    try { setEvents(await getNextDayEvents(connection.provider)); }
    catch { setEvents([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [connection.connected, connection.provider]); // eslint-disable-line

  const urgent = events.filter(e => e.priority === "URGENT").length;
  const high   = events.filter(e => e.priority === "HIGH").length;
  const today  = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const greeting = getGreeting();
  const providerLabel = connection.provider === "microsoft" ? "Microsoft" : "Google";

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">{greeting} ✦</h1>
          <p className="page-subtitle">{today} · Your schedule at a glance</p>
        </div>
        <button className="add-task-btn" onClick={onAddTask} disabled={!connection.connected}>
          <Plus size={15} /> Add Task
        </button>
      </div>

      {connection.connected && (
        <div className="provider-badge-row">
          <span className={`provider-badge ${connection.provider}`}>
            <span className={`provider-dot ${connection.provider}`} />
            {providerLabel} Calendar
          </span>
          <span className="provider-email">{connection.email}</span>
        </div>
      )}

      <DateStrip />

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Next 24 Hours</div>
          <div className="stat-value">{events.length}</div>
          <div className="stat-badge" style={{ background: "var(--blue-soft)", color: "var(--blue-accent)" }}>
            <Calendar size={10} /> events
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Urgent</div>
          <div className="stat-value" style={{ color: urgent > 0 ? "var(--urgent)" : undefined }}>{urgent}</div>
          <div className="stat-badge" style={{ background: "var(--urgent-soft)", color: "var(--urgent)" }}>
            <AlertTriangle size={10} /> needs attention
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">High Priority</div>
          <div className="stat-value" style={{ color: high > 0 ? "var(--rose)" : undefined }}>{high}</div>
          <div className="stat-badge" style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
            <Clock size={10} /> high
          </div>
        </div>
      </div>

      <div className="section-header">
        <h2 className="section-title">Upcoming Events</h2>
        <button className="refresh-btn" onClick={fetchEvents} disabled={loading || !connection.connected}>
          <RefreshCw size={12} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
          Refresh
        </button>
      </div>

      <div className="events-list">
        {!connection.connected ? (
          <div className="empty-state">
            <span className="empty-icon">🔗</span>
            <div className="empty-title">No calendar connected</div>
            <p className="empty-text">Enter your email in the sidebar to connect your Google or Microsoft calendar.</p>
          </div>
        ) : loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🗓</span>
            <div className="empty-title">No events in the next 24 hours</div>
            <p className="empty-text">Add a task to get started and it will show up here.</p>
          </div>
        ) : events.map((ev, i) => (
          <a key={ev.id ?? i} href={ev.htmlLink ?? "#"} target="_blank" rel="noopener noreferrer" className="event-card">
            <div className="event-time-col">
              <div className="event-time">{formatTime(ev.start)}</div>
              <div className="event-date">{formatDate(ev.start)}</div>
            </div>
            <div className="event-divider" />
            <div className="event-body">
              <div className="event-title">{ev.summary}</div>
              {ev.description && <div className="event-desc">{ev.description}</div>}
              <div className="event-meta">
                {ev.priority && <span className={`priority-badge ${priorityClass(ev.priority)}`}>{ev.priority}</span>}
                {ev.status === "confirmed" && <span style={{ fontSize: 11, color: "var(--green-accent)", fontFamily: "var(--mono)" }}>● confirmed</span>}
              </div>
            </div>
            <ExternalLink size={14} className="event-link-icon" />
          </a>
        ))}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
