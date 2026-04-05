export type Tab = "dashboard" | "tasks" | "calendar" | "settings";

export type Priority = "URGENT" | "HIGH" | "MEDIUM" | "LOW" | null;

export interface Event {
  id?: string;
  summary: string;
  description?: string;
  colorId?: string;
  priority?: Priority;
  location?: string | null;
  status?: string;
  start: string;
  end?: string;
  htmlLink?: string;
  eventLink?: string;
}