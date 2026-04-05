const BASE = "http://localhost:9090";

export async function getAuthUrl(): Promise<string> {
  const res = await fetch(`${BASE}/auth/google/url`);
  if (!res.ok) throw new Error("Failed to get auth URL");
  const data = await res.json();
  return data.url;
}

export async function getAuthStatus(): Promise<boolean> {
  const res = await fetch(`${BASE}/auth/google/status`);
  if (!res.ok) return false;
  const data = await res.json();
  return data.authorized;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  date: string;
  time: string;
  priority?: string | null;
  createMeetLink: boolean;
  attachmentUrls?: string[];
}

export interface CreateTaskResponse {
  message: string;
  eventLink: string;
  priority: string;
  description: string;
}

export async function createTask(payload: CreateTaskPayload): Promise<CreateTaskResponse> {
  const res = await fetch(`${BASE}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
}

export async function getNextDayEvents() {
  const res = await fetch(`${BASE}/events/next-day`);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}
