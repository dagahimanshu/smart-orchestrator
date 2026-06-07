export type Tab = "dashboard" | "tasks" | "calendar" | "settings";

export type Priority = "URGENT" | "HIGH" | "MEDIUM" | "LOW" | null;

export type Provider = "google" | "microsoft";

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

export interface ConnectionState {
  connected: boolean;
  provider: Provider | null;
  email: string | null;
}

export interface UpdateEventPayload {
  start: string;
  end: string;
  provider: string;
}
