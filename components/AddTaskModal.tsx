"use client";

import { Dispatch, SetStateAction, useState, useEffect } from "react";
import { X, Loader2, Link2, Video, Repeat } from "lucide-react";
import { Event, ConnectionState } from "@/types";
import { createTask, listDelegates, DelegateInfo } from "@/lib/api";

type PriorityOpt = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
const PRIORITIES: PriorityOpt[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export interface ModalPreset {
  date?: string;
  time?: string;
  endTime?: string;
}

interface Props {
  onClose: () => void;
  onAdd: (e: Event) => void;
  setLoading: Dispatch<SetStateAction<boolean>>;
  connection: ConnectionState;
  preset?: ModalPreset;
}

function getDefaultTime(): { time: string; endTime: string } {
  const now = new Date();
  const h = now.getHours() + 1;
  const startH = h > 23 ? 9 : h;
  return {
    time: `${String(startH).padStart(2, "0")}:00`,
    endTime: `${String((startH + 1) % 24).padStart(2, "0")}:00`,
  };
}

export default function AddTaskModal({ onClose, onAdd, setLoading, connection, preset }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const defaults = getDefaultTime();
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: preset?.date ?? today,
    time: preset?.time ?? defaults.time,
    endTime: preset?.endTime ?? defaults.endTime,
    attachmentUrls: "",
    createMeetLink: false,
  });
  const [priority, setPriority] = useState<PriorityOpt>("MEDIUM");
  const [recurrence, setRecurrence] = useState<string>("NONE");
  const [recurrenceCount, setRecurrenceCount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delegates, setDelegates] = useState<DelegateInfo[]>([]);
  const [delegateEmail, setDelegateEmail] = useState("");

  useEffect(() => {
    listDelegates().then(setDelegates);
  }, []);

  const set = (k: string, v: string | boolean) => {
    setForm(p => {
      const next = { ...p, [k]: v };
      if (k === "time" && typeof v === "string") {
        const [h, m] = v.split(":").map(Number);
        const endH = (h + 1) % 24;
        next.endTime = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
      return next;
    });
  };

  const meetLabel = "Create Google Meet link";

  const handleSubmit = async () => {
    if (!form.title || !form.date || !form.time) { setError("Title, date, and time are required."); return; }
    if (!connection.connected || !connection.provider) { setError("Connect a calendar first."); return; }
    const selectedDateTime = new Date(`${form.date}T${form.time}:00`);
    if (selectedDateTime < new Date()) { setError("Cannot create events in the past."); return; }
    setSubmitting(true); setLoading(true); setError(null);
    try {
      const res = await createTask({
        title: form.title, description: form.description, date: form.date, time: form.time,
        endTime: form.endTime,
        createMeetLink: form.createMeetLink,
        priority,
        provider: connection.provider,
        ...(recurrence !== "NONE" && { recurrence }),
        ...(recurrence !== "NONE" && recurrenceCount && { recurrenceCount: parseInt(recurrenceCount) }),
        ...(form.attachmentUrls && { attachmentUrls: form.attachmentUrls.split("\n").map(u => u.trim()).filter(Boolean) }),
        ...(delegateEmail && { delegateEmail }),
      });
      onAdd({ summary: form.title, description: res.description, priority: res.priority as Event["priority"], start: `${form.date}T${form.time}:00`, htmlLink: res.eventLink, status: "confirmed" });
      onClose();
    } catch { setError("Failed to create event. Is the backend running?"); }
    finally { setSubmitting(false); setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Task</h2>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal-body">
          {delegates.length > 0 && (
            <div className="form-group delegate-select">
              <label className="form-label">Create on behalf of</label>
              <select className="form-input" value={delegateEmail} onChange={e => setDelegateEmail(e.target.value)}>
                <option value="">My calendar</option>
                {delegates.map(d => (
                  <option key={d.email} value={d.email}>{d.email}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input className="form-input" placeholder="e.g. Submit project demo" value={form.title} onChange={e => set("title", e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="Add details, context, or notes..." value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          <div className="form-row form-group" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div>
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" value={form.date} min={today} onChange={e => set("date", e.target.value)} />
            </div>
            <div>
              <label className="form-label">Start Time *</label>
              <input className="form-input" type="time" value={form.time} min={form.date === today ? `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}` : undefined} onChange={e => set("time", e.target.value)} />
            </div>
            <div>
              <label className="form-label">End Time</label>
              <input className="form-input" type="time" value={form.endTime} min={form.time} onChange={e => set("endTime", e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Priority</label>
            <div className="priority-selector">
              {PRIORITIES.map(p => (
                <button type="button" key={p} className={`priority-option ${priority === p ? `sel-${p.toLowerCase()}` : ""}`} onClick={() => setPriority(p)}>{p}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label"><Repeat size={12} style={{ display: "inline", marginRight: 4 }} />Repeat</label>
            <div className="recurrence-row">
              <select className="form-input recurrence-select" value={recurrence} onChange={e => setRecurrence(e.target.value)}>
                <option value="NONE">Does not repeat</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="WEEKDAYS">Every weekday (Mon–Fri)</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
              {recurrence !== "NONE" && (
                <input
                  className="form-input recurrence-count"
                  type="number"
                  min="1"
                  max="365"
                  placeholder="# times"
                  value={recurrenceCount}
                  onChange={e => setRecurrenceCount(e.target.value)}
                />
              )}
            </div>
            {recurrence !== "NONE" && (
              <div className="form-hint">
                {!recurrenceCount ? "Default: " : ""}{recurrence === "DAILY" ? (recurrenceCount || "30") + " occurrences" : recurrence === "WEEKLY" || recurrence === "WEEKDAYS" ? (recurrenceCount || "52") + " occurrences" : recurrence === "MONTHLY" ? (recurrenceCount || "12") + " occurrences" : (recurrenceCount || "5") + " occurrences"}
              </div>
            )}
          </div>

          {connection.provider !== "microsoft" && (
            <div className="form-group">
              <label className="form-label"><Link2 size={12} style={{ display: "inline", marginRight: 4 }} />Attachment URLs</label>
              <textarea className="form-textarea" placeholder={"https://drive.google.com/...\nhttps://example.com/file"} style={{ minHeight: 54, fontFamily: "var(--mono)", fontSize: 12 }} value={form.attachmentUrls} onChange={e => set("attachmentUrls", e.target.value)} />
              <div className="form-hint">One URL per line</div>
            </div>
          )}

          <div className="form-group">
            <label className="form-check-group">
              <input type="checkbox" checked={form.createMeetLink} onChange={e => set("createMeetLink", e.target.checked)} />
              <Video size={13} style={{ color: "var(--muted)" }} />
              <span style={{ fontSize: 13, color: "var(--slate)" }}>{meetLabel}</span>
            </label>
          </div>

          {error && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--urgent-soft)", border: "1px solid var(--rose-border)", fontSize: 12, color: "var(--urgent)" }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-submit" onClick={handleSubmit} disabled={submitting || !form.title}>
            {submitting ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Creating…</> : "Add to Calendar"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
