"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, ExternalLink } from "lucide-react";
import { Event, Provider } from "@/types";
import { getWeekEvents } from "@/lib/api";

interface Props {
  provider: Provider;
  onAddTask: () => void;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function priorityClass(p?: string | null): string {
  switch (p?.toUpperCase()) {
    case "URGENT": return "priority-urgent";
    case "HIGH": return "priority-high";
    case "MEDIUM": return "priority-medium";
    case "LOW": return "priority-low";
    default: return "";
  }
}

export default function TasksView({ provider, onAddTask }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchIdRef = useRef(0);
  const [weekStartKey] = useState(() => formatDateKey(getWeekStart(new Date())));

  const weekStart = new Date(weekStartKey + "T00:00:00");
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    getWeekEvents(provider, weekStartKey)
      .then(data => { if (fetchIdRef.current === id) setEvents(data); })
      .catch(() => { if (fetchIdRef.current === id) setEvents([]); })
      .finally(() => { if (fetchIdRef.current === id) setLoading(false); });
  }, [provider, weekStartKey]);

  const eventsForDay = (day: Date): Event[] => {
    const key = formatDateKey(day);
    return events.filter(ev => ev.start.split("T")[0] === key);
  };

  return (
    <div>
      <div className="tasks-header">
        <h1 className="page-title">Tasks</h1>
        <button className="add-task-btn" onClick={onAddTask}>
          <Plus size={15} /> Add Task
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 12, fontFamily: "var(--mono)" }}>
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <div className="empty-title">No tasks this week</div>
          <p className="empty-text">Add a task to get started.</p>
        </div>
      ) : (
        weekDays.map((day, di) => {
          const dayEvents = eventsForDay(day);
          if (dayEvents.length === 0) return null;
          const label = `${DAY_NAMES[day.getDay()]}, ${MONTH_NAMES[day.getMonth()]} ${day.getDate()}`;
          return (
            <div key={di} className="tasks-day-group">
              <div className="tasks-day-label">{label}</div>
              {dayEvents.map((ev, ei) => (
                <a key={ev.id ?? ei} href={ev.htmlLink || ev.eventLink || "#"} target="_blank" rel="noopener noreferrer" className="task-item">
                  <span className="task-time-badge">{formatTime(ev.start)}{ev.end ? ` – ${formatTime(ev.end)}` : ""}</span>
                  <span className="task-title">{ev.summary}</span>
                  {ev.priority && <span className={`priority-badge ${priorityClass(ev.priority)}`}>{ev.priority}</span>}
                  <ExternalLink size={12} style={{ color: "var(--subtle)", flexShrink: 0 }} />
                </a>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
