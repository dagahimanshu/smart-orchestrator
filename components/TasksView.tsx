"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, ExternalLink, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Event, Provider } from "@/types";
import { getWeekEvents, updateEvent } from "@/lib/api";

interface Props {
  provider: Provider;
  onAddTask: (date?: string) => void;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDuration(start: string, end?: string): string {
  if (!end) return "1:00";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function totalHours(events: Event[]): string {
  const ms = events.reduce((sum, ev) => {
    const dur = ev.end ? new Date(ev.end).getTime() - new Date(ev.start).getTime() : 3600000;
    return sum + dur;
  }, 0);
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return m > 0 ? `${h}:${String(m).padStart(2, "0")}` : `${h}:00`;
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

function priorityAccent(p?: string | null): string {
  const style = getComputedStyle(document.documentElement);
  switch (p?.toUpperCase()) {
    case "URGENT": return style.getPropertyValue("--urgent").trim() || "#ef4444";
    case "HIGH": return style.getPropertyValue("--rose").trim() || "#f97316";
    case "MEDIUM": return style.getPropertyValue("--blue-accent").trim() || "#3b82f6";
    case "LOW": return style.getPropertyValue("--green-accent").trim() || "#22c55e";
    default: return style.getPropertyValue("--subtle").trim() || "#94a3b8";
  }
}

export default function TasksView({ provider, onAddTask }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchIdRef = useRef(0);
  const [startOffset, setStartOffset] = useState(0);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + startOffset);
  const startKey = formatDateKey(baseDate);

  const days = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const todayKey = formatDateKey(new Date());

  useEffect(() => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    getWeekEvents(provider, startKey)
      .then(data => { if (fetchIdRef.current === id) setEvents(data); })
      .catch(() => { if (fetchIdRef.current === id) setEvents([]); })
      .finally(() => { if (fetchIdRef.current === id) setLoading(false); });
  }, [provider, startKey]);

  const isToday = startOffset === 0;
  const goToday = () => setStartOffset(0);
  const goPrev = () => setStartOffset(o => o - 1);
  const goNext = () => setStartOffset(o => o + 1);

  const eventsForDay = (day: Date): Event[] => {
    const key = formatDateKey(day);
    return events.filter(ev => ev.start.split("T")[0] === key).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  };

  const handleDragStart = (e: React.DragEvent, ev: Event) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: ev.id, start: ev.start, end: ev.end }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, dayKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDay(dayKey);
  };

  const handleDragLeave = () => setDragOverDay(null);

  const handleDrop = async (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault();
    setDragOverDay(null);
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return; }
    const { id, start, end } = parsed as { id: string; start: string; end?: string };

    const oldStart = new Date(start);
    const targetDate = new Date(targetDay);
    const newStart = new Date(targetDate);
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);

    const duration = end ? new Date(end).getTime() - oldStart.getTime() : 3600000;
    const newEnd = new Date(newStart.getTime() + duration);

    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, start: newStart.toISOString(), end: newEnd.toISOString() } : ev));
    try {
      await updateEvent(id, { start: newStart.toISOString(), end: newEnd.toISOString(), provider });
    } catch {
      getWeekEvents(provider, startKey).then(setEvents).catch(() => {});
    }
  };

  return (
    <div className="tv">
      <div className="tv-topbar">
        <div className="calendar-nav">
          <button className="cal-nav-btn" onClick={goPrev}><ChevronLeft size={14} /></button>
          <button className="cal-nav-btn today" onClick={goToday} disabled={isToday}>Today</button>
          <button className="cal-nav-btn" onClick={goNext}><ChevronRight size={14} /></button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)", fontSize: 13, fontFamily: "var(--mono)" }}>
          Loading tasks...
        </div>
      ) : (
        <div className="tv-columns">
          {days.map((day, di) => {
            const dayKey = formatDateKey(day);
            const dayEvents = eventsForDay(day);
            const isToday = dayKey === todayKey;
            return (
              <div
                key={di}
                className={`tv-col ${isToday ? "tv-col-today" : ""} ${dragOverDay === dayKey ? "tv-col-dragover" : ""}`}
                onDragOver={e => handleDragOver(e, dayKey)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, day)}
              >
                <div className="tv-col-head">
                  <div className="tv-col-dayname">{DAY_NAMES[day.getDay()]}</div>
                  <div className="tv-col-date">{MONTH_NAMES[day.getMonth()]} {day.getDate()}</div>
                </div>

                <button className="tv-add-row" onClick={() => onAddTask(dayKey)}>
                  <Plus size={13} /> Add task
                  <span className="tv-add-hours">{totalHours(dayEvents)}</span>
                </button>

                <div className="tv-cards">
                  {dayEvents.length === 0 ? (
                    <div className="tv-empty">No tasks scheduled</div>
                  ) : (
                    dayEvents.map((ev, ei) => (
                      <div
                        key={ev.id ?? ei}
                        className="tv-card"
                        draggable
                        onDragStart={e => handleDragStart(e, ev)}
                      >
                        <div className="tv-card-top">
                          <div className="tv-card-title">{ev.summary}</div>
                          <span className="tv-card-dur">{formatDuration(ev.start, ev.end)}</span>
                        </div>
                        {ev.description && <div className="tv-card-desc">{ev.description}</div>}
                        <div className="tv-card-bottom">
                          <span className="tv-card-time" style={{ background: priorityAccent(ev.priority) + "18", color: priorityAccent(ev.priority) }}>
                            <Clock size={10} /> {formatTime(ev.start)}
                          </span>
                          {ev.priority && <span className={`priority-badge ${priorityClass(ev.priority)}`}>{ev.priority}</span>}
                          <a href={ev.htmlLink || ev.eventLink || "#"} target="_blank" rel="noopener noreferrer" className="tv-card-link" onClick={e => e.stopPropagation()}>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
