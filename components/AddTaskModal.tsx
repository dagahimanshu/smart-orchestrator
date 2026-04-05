"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { X, Loader2, Link2, Video } from "lucide-react";
import { Event } from "@/types";
import { createTask } from "@/lib/api";

type PriorityOpt = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
const PRIORITIES: PriorityOpt[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

interface Props {
  onClose: () => void;
  onAdd: (e: Event) => void;
  setLoading: Dispatch<SetStateAction<boolean>>;
}

export default function AddTaskModal({ onClose, onAdd, setLoading }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ title: "", description: "", date: today, time: "09:00", attachmentUrls: "", createMeetLink: false });
  const [priority, setPriority] = useState<PriorityOpt>("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string | boolean) => { setForm(p => ({ ...p, [k]: v })); };

  const handleSubmit = async () => {
    if (!form.title || !form.date || !form.time) { setError("Title, date, and time are required."); return; }
    setSubmitting(true); setLoading(true); setError(null);
    try {
      const res = await createTask({
        title: form.title, description: form.description, date: form.date, time: form.time,
        createMeetLink: form.createMeetLink,
        priority,
        ...(form.attachmentUrls && { attachmentUrls: form.attachmentUrls.split("\n").map(u => u.trim()).filter(Boolean) }),
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
          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input className="form-input" placeholder="e.g. Submit project demo" value={form.title} onChange={e => set("title", e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="Add details, context, or notes..." value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          <div className="form-row form-group">
            <div>
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div>
              <label className="form-label">Time *</label>
              <input className="form-input" type="time" value={form.time} onChange={e => set("time", e.target.value)} />
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
            <label className="form-label"><Link2 size={12} style={{ display: "inline", marginRight: 4 }} />Attachment URLs</label>
            <textarea className="form-textarea" placeholder={"https://drive.google.com/...\nhttps://example.com/file"} style={{ minHeight: 54, fontFamily: "var(--mono)", fontSize: 12 }} value={form.attachmentUrls} onChange={e => set("attachmentUrls", e.target.value)} />
            <div className="form-hint">One URL per line</div>
          </div>

          <div className="form-group">
            <label className="form-check-group">
              <input type="checkbox" checked={form.createMeetLink} onChange={e => set("createMeetLink", e.target.checked)} />
              <Video size={13} style={{ color: "var(--muted)" }} />
              <span style={{ fontSize: 13, color: "var(--slate)" }}>Create Google Meet link</span>
            </label>
          </div>

          {error && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--urgent-soft)", border: "1px solid #FECACA", fontSize: 12, color: "var(--urgent)" }}>
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
