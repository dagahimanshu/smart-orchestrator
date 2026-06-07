import { Event, Provider } from "@/types";

const BASE = "http://localhost:9090";

function log(label: string, ...args: unknown[]) {
  console.log(`[API] ${label}`, ...args);
}

// ── Provider detection ────────────────────────────────────────────────────────

export interface DetectProviderResponse {
  provider: string;
  email?: string;
  authorized?: boolean;
  message?: string;
}

export async function detectProvider(email: string): Promise<DetectProviderResponse> {
  log("detectProvider →", email);
  const url = `${BASE}/auth/detect-provider?email=${encodeURIComponent(email)}`;
  log("detectProvider fetch", url);
  try {
    const res = await fetch(url);
    log("detectProvider response", res.status, res.statusText);
    if (!res.ok) {
      const text = await res.text();
      log("detectProvider error body", text);
      throw new Error(`Failed to detect provider (${res.status}): ${text}`);
    }
    const data = await res.json();
    log("detectProvider result", data);
    return data;
  } catch (err) {
    log("detectProvider FAILED", err);
    throw err;
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function getAuthUrl(provider: Provider): Promise<string> {
  log("getAuthUrl →", provider);
  try {
    const res = await fetch(`${BASE}/auth/${provider}/url`);
    log("getAuthUrl response", res.status);
    if (!res.ok) {
      const text = await res.text();
      log("getAuthUrl error body", text);
      throw new Error(`Failed to get ${provider} auth URL (${res.status})`);
    }
    const data = await res.json();
    log("getAuthUrl result", data.url?.substring(0, 80) + "...");
    return data.url;
  } catch (err) {
    log("getAuthUrl FAILED", err);
    throw err;
  }
}

export async function disconnectProvider(provider: Provider): Promise<void> {
  log("disconnectProvider →", provider);
  try {
    const res = await fetch(`${BASE}/auth/${provider}/disconnect`, { method: "DELETE" });
    log("disconnectProvider response", res.status);
    if (!res.ok) {
      const text = await res.text();
      log("disconnectProvider error", text);
    }
    const data = await res.json();
    log("disconnectProvider result", data);
  } catch (err) {
    log("disconnectProvider FAILED", err);
  }
}

export async function getAuthStatus(provider: Provider): Promise<boolean> {
  log("getAuthStatus →", provider);
  try {
    const res = await fetch(`${BASE}/auth/${provider}/status`);
    if (!res.ok) { log("getAuthStatus not ok", res.status); return false; }
    const data = await res.json();
    log("getAuthStatus result", data);
    return data.authorized;
  } catch (err) {
    log("getAuthStatus FAILED", err);
    return false;
  }
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export interface CreateTaskPayload {
  title: string;
  description: string;
  date: string;
  time: string;
  endTime?: string;
  priority?: string | null;
  createMeetLink: boolean;
  attachmentUrls?: string[];
  provider?: Provider;
  recurrence?: string | null;
  recurrenceCount?: number | null;
  delegateEmail?: string;
}

export interface CreateTaskResponse {
  message: string;
  eventLink: string;
  priority: string;
  description: string;
  provider: string;
}

export async function createTask(payload: CreateTaskPayload): Promise<CreateTaskResponse> {
  log("createTask →", payload);
  try {
    const res = await fetch(`${BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    log("createTask response", res.status);
    if (!res.ok) {
      const text = await res.text();
      log("createTask error body", text);
      throw new Error(`Failed to create task (${res.status})`);
    }
    const data = await res.json();
    log("createTask result", data);
    return data;
  } catch (err) {
    log("createTask FAILED", err);
    throw err;
  }
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function getNextDayEvents(provider: Provider = "google"): Promise<Event[]> {
  log("getNextDayEvents →", provider);
  try {
    const res = await fetch(`${BASE}/events/next-day?provider=${provider}`);
    log("getNextDayEvents response", res.status);
    if (!res.ok) {
      const text = await res.text();
      log("getNextDayEvents error body", text);
      throw new Error(`Failed to fetch events (${res.status})`);
    }
    const data = await res.json();
    log("getNextDayEvents result", `${data.length} events`);
    return data;
  } catch (err) {
    log("getNextDayEvents FAILED", err);
    throw err;
  }
}

export async function getWeekEvents(provider: Provider = "google", startDate: string): Promise<Event[]> {
  log("getWeekEvents →", provider, startDate);
  try {
    const res = await fetch(`${BASE}/events/week?provider=${provider}&startDate=${startDate}`);
    log("getWeekEvents response", res.status);
    if (!res.ok) {
      const text = await res.text();
      log("getWeekEvents error body", text);
      throw new Error(`Failed to fetch week events (${res.status})`);
    }
    const data = await res.json();
    log("getWeekEvents result", `${data.length} events`);
    return data;
  } catch (err) {
    log("getWeekEvents FAILED", err);
    throw err;
  }
}

export async function updateEvent(eventId: string, payload: { start: string; end: string; provider: string }): Promise<void> {
  log("updateEvent →", eventId, payload);
  try {
    const res = await fetch(`${BASE}/events/${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    log("updateEvent response", res.status);
    if (!res.ok) {
      const text = await res.text();
      log("updateEvent error", text);
      throw new Error(`Failed to update event (${res.status})`);
    }
  } catch (err) {
    log("updateEvent FAILED", err);
    throw err;
  }
}

// ── Delegates ─────────────────────────────────────────────────────────────────

export interface DelegateInfo {
  email: string;
  provider: string;
  authorizedAt?: string;
}

export async function requestDelegateAccess(email: string, provider: Provider): Promise<{ requestId: string; status: string; magicLink: string }> {
  log("requestDelegateAccess →", email, provider);
  try {
    const res = await fetch(`${BASE}/delegates/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, provider }),
    });
    log("requestDelegateAccess response", res.status);
    if (!res.ok) throw new Error("Failed to request delegate access");
    const data = await res.json();
    log("requestDelegateAccess result", data);
    return data;
  } catch (err) {
    log("requestDelegateAccess FAILED", err);
    throw err;
  }
}

export async function listDelegates(): Promise<DelegateInfo[]> {
  log("listDelegates →");
  try {
    const res = await fetch(`${BASE}/delegates`);
    log("listDelegates response", res.status);
    if (!res.ok) return [];
    const data = await res.json();
    log("listDelegates result", data);
    return data;
  } catch (err) {
    log("listDelegates FAILED", err);
    return [];
  }
}

export async function removeDelegate(email: string): Promise<void> {
  log("removeDelegate →", email);
  try {
    const res = await fetch(`${BASE}/delegates/${encodeURIComponent(email)}`, { method: "DELETE" });
    log("removeDelegate response", res.status);
  } catch (err) {
    log("removeDelegate FAILED", err);
  }
}

export async function validateDelegateToken(token: string): Promise<{ requesterEmail: string; delegateEmail: string; provider: string; status: string }> {
  log("validateDelegateToken →", token);
  const res = await fetch(`${BASE}/delegates/validate?token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error("Invalid or expired token");
  return res.json();
}
