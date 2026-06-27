"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Event, Provider } from "@/types";
import { getWeekEvents, updateEvent } from "@/lib/api";

export interface TimeSlot {
  date: string;
  time: string;
  endTime: string;
}

interface Props {
  provider: Provider;
  onCreateAtSlot?: (slot: TimeSlot) => void;
  singleDay?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function pad2(n: number): string { return String(n).padStart(2, "0"); }

function minutesToTime(mins: number): string {
  return `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;
}

function priorityClass(p?: string | null): string {
  switch (p?.toUpperCase()) {
    case "URGENT": return "priority-urgent";
    case "HIGH": return "priority-high";
    case "MEDIUM": return "priority-medium";
    case "LOW": return "priority-low";
    default: return "priority-default";
  }
}

function getEventTop(start: string): number {
  const d = new Date(start);
  return d.getHours() * 60 + d.getMinutes();
}

function getEventHeight(start: string, end?: string): number {
  if (!end) return 60;
  return Math.max((new Date(end).getTime() - new Date(start).getTime()) / 60000, 20);
}

function getMinutesFromY(clientY: number, scrollRef: React.RefObject<HTMLDivElement | null>): number {
  const sc = scrollRef.current;
  if (!sc) return 0;
  const rect = sc.getBoundingClientRect();
  const y = clientY - rect.top + sc.scrollTop;
  return Math.round(Math.max(0, Math.min(1439, y)) / 15) * 15;
}

export default function CalendarView({ provider, onCreateAtSlot, singleDay = false }: Props) {
  const [weekStartKey, setWeekStartKey] = useState(() => formatDateKey(new Date()));
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fetchIdRef = useRef(0);
  const isDragging = useRef(false);

  const [selecting, setSelecting] = useState(false);
  const [selectDay, setSelectDay] = useState<Date | null>(null);
  const [selectStartMin, setSelectStartMin] = useState(0);
  const [selectEndMin, setSelectEndMin] = useState(0);

  const weekStart = new Date(weekStartKey + "T00:00:00");
  const dayCount = singleDay ? 1 : 7;
  const weekDays = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekLabel = singleDay
    ? `${DAY_NAMES[weekDays[0].getDay()]}, ${MONTH_NAMES[weekDays[0].getMonth()]} ${weekDays[0].getDate()}`
    : `${MONTH_NAMES[weekDays[0].getMonth()]} ${weekDays[0].getDate()} – ${MONTH_NAMES[weekDays[6].getMonth()]} ${weekDays[6].getDate()}, ${weekDays[6].getFullYear()}`;

  useEffect(() => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    getWeekEvents(provider, weekStartKey)
      .then(data => { if (fetchIdRef.current === id) setEvents(data); })
      .catch(() => { if (fetchIdRef.current === id) setEvents([]); })
      .finally(() => { if (fetchIdRef.current === id) setLoading(false); });
  }, [provider, weekStartKey]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * 60;
  }, []);

  const step = singleDay ? 1 : 7;
  const goToday = () => setWeekStartKey(formatDateKey(new Date()));
  const goPrev = () => { const d = new Date(weekStart); d.setDate(d.getDate() - step); setWeekStartKey(formatDateKey(d)); };
  const goNext = () => { const d = new Date(weekStart); d.setDate(d.getDate() + step); setWeekStartKey(formatDateKey(d)); };

  const todayKey = formatDateKey(new Date());
  const eventsForDay = (day: Date): Event[] => {
    const key = formatDateKey(day);
    return events.filter(ev => ev.start.split("T")[0] === key);
  };

  // ── Drag-and-drop existing events ──

  const handleDragStart = (e: React.DragEvent, ev: Event) => {
    if (!ev.id) { e.preventDefault(); return; }
    isDragging.current = true;
    setDraggingId(ev.id);
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: ev.id, start: ev.start, end: ev.end }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, dayDate: Date) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(null);
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return; }
    const { id, start, end } = parsed as { id: string; start: string; end?: string };

    const snappedMin = getMinutesFromY(e.clientY, scrollRef);
    const newStart = new Date(dayDate);
    newStart.setHours(Math.floor(snappedMin / 60), snappedMin % 60, 0, 0);
    const duration = end ? new Date(end).getTime() - new Date(start).getTime() : 3600000;
    const newEnd = new Date(newStart.getTime() + duration);

    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, start: newStart.toISOString(), end: newEnd.toISOString() } : ev));
    try {
      await updateEvent(id, { start: newStart.toISOString(), end: newEnd.toISOString(), provider });
    } catch {
      getWeekEvents(provider, weekStartKey).then(setEvents).catch(() => {});
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setTimeout(() => { isDragging.current = false; }, 100);
  };

  // ── Click-drag to select time range and create task ──

  const handleMouseDown = (e: React.MouseEvent, day: Date) => {
    if ((e.target as HTMLElement).closest(".cal-event")) return;
    const mins = getMinutesFromY(e.clientY, scrollRef);
    setSelecting(true);
    setSelectDay(day);
    setSelectStartMin(mins);
    setSelectEndMin(mins + 30);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selecting) return;
    const mins = getMinutesFromY(e.clientY, scrollRef);
    setSelectEndMin(Math.max(mins, selectStartMin + 15));
  };

  const handleMouseUp = () => {
    if (!selecting || !selectDay) { setSelecting(false); return; }
    setSelecting(false);

    const startMin = Math.min(selectStartMin, selectEndMin);
    const endMin = Math.max(selectStartMin, selectEndMin);
    if (endMin - startMin < 15) return;

    if (onCreateAtSlot) {
      onCreateAtSlot({
        date: formatDateKey(selectDay),
        time: minutesToTime(startMin),
        endTime: minutesToTime(endMin),
      });
    }

    setSelectDay(null);
  };

  const handleEventClick = (ev: Event) => {
    if (isDragging.current) return;
    const link = ev.htmlLink || ev.eventLink;
    if (link) window.open(link, "_blank");
  };

  const now = new Date();
  const nowTop = now.getHours() * 60 + now.getMinutes();

  const selTop = Math.min(selectStartMin, selectEndMin);
  const selHeight = Math.abs(selectEndMin - selectStartMin);
  const selectDayKey = selectDay ? formatDateKey(selectDay) : null;

  return (
    <div>
      {singleDay ? (
        <div className="calendar-header">
          <h1 className="page-title">Calendar</h1>
          <div className="cal-week-label" style={{ margin: 0 }}>{weekLabel}</div>
        </div>
      ) : (
        <>
          <div className="calendar-header">
            <h1 className="page-title">Calendar</h1>
            <div className="calendar-nav">
              <button className="cal-nav-btn" onClick={goPrev}><ChevronLeft size={14} /></button>
              <button className="cal-nav-btn today" onClick={goToday}>Today</button>
              <button className="cal-nav-btn" onClick={goNext}><ChevronRight size={14} /></button>
            </div>
          </div>
          <div className="cal-week-label">{weekLabel}</div>
        </>
      )}

      <div className={`cal-grid-wrapper ${singleDay ? "cal-single-day" : ""}`}>
        {!singleDay && (
          <div className="cal-day-headers">
            <div className="cal-day-header cal-time-col" />
            {weekDays.map((d, i) => (
              <div key={i} className={`cal-day-header ${formatDateKey(d) === todayKey ? "is-today" : ""}`}>
                <span className="cal-day-name">{DAY_NAMES[d.getDay()]}</span>
                <span className="cal-day-num">{d.getDate()}</span>
              </div>
            ))}
          </div>
        )}

        <div
          className="cal-grid-scroll"
          ref={scrollRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { if (selecting) handleMouseUp(); }}
        >
          <div className="cal-grid-body">
            <div className="cal-time-labels">
              {HOURS.map(h => <div key={h} className="cal-time-label">{formatHour(h)}</div>)}
            </div>

            {weekDays.map((day, di) => {
              const isToday = formatDateKey(day) === todayKey;
              const dayKey = formatDateKey(day);
              const dayEvents = eventsForDay(day);
              const showSelection = selecting && selectDayKey === dayKey;
              return (
                <div
                  key={di}
                  className="cal-day-col"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                  onMouseDown={(e) => handleMouseDown(e, day)}
                >
                  {HOURS.map(h => <div key={h} className="cal-hour-row" />)}

                  {isToday && (
                    <div className="cal-now-line" style={{ top: `${nowTop}px` }}>
                      <div className="cal-now-dot" />
                    </div>
                  )}

                  {showSelection && (
                    <div className="cal-selection" style={{ top: `${selTop}px`, height: `${Math.max(selHeight, 15)}px` }}>
                      <span className="cal-selection-label">
                        {minutesToTime(selTop)} – {minutesToTime(selTop + Math.max(selHeight, 15))}
                      </span>
                    </div>
                  )}

                  {dayEvents.map((ev, ei) => (
                    <div
                      key={ev.id ?? ei}
                      className={`cal-event ${priorityClass(ev.priority)} ${draggingId === ev.id ? "dragging" : ""}`}
                      style={{ top: `${getEventTop(ev.start)}px`, height: `${getEventHeight(ev.start, ev.end)}px` }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, ev)}
                      onDragEnd={handleDragEnd}
                      onMouseUp={(e) => { e.stopPropagation(); handleEventClick(ev); }}
                    >
                      <div className="cal-event-title">{ev.summary}</div>
                      <div className="cal-event-time">{new Date(ev.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 20, color: "var(--muted)", fontSize: 12, fontFamily: "var(--mono)" }}>
          Loading events...
        </div>
      )}
    </div>
  );
}
