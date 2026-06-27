import { Event, Provider } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9090";

function log(label: string, ...args: unknown[]) {
  console.log(`[API] ${label}`, ...args);
}

// ── JWT Token Management ─────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

function setToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearToken() {
  localStorage.removeItem("auth_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  headers["X-Timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return headers;
}

export interface AuthResponse {
  token: string;
  email: string;
  name: string;
  calendarProvider: string | null;
  calendarConnected: boolean;
  loginMethod: string;
}

export async function signup(email: string, password: string, name: string): Promise<AuthResponse> {
  log("signup →", email);
  const res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Signup failed");
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}

export async function loginWithPassword(email: string, password: string): Promise<AuthResponse> {
  log("loginWithPassword →", email);
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Login failed");
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}

export async function loginWithOAuth(email: string, provider: Provider): Promise<AuthResponse> {
  log("loginWithOAuth →", email, provider);
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, provider }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "OAuth login failed");
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}

export async function getMe(): Promise<AuthResponse | null> {
  log("getMe →");
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function connectCalendar(provider: Provider): Promise<AuthResponse> {
  log("connectCalendar →", provider);
  const res = await fetch(`${BASE}/auth/connect-calendar`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ provider }),
  });
  if (!res.ok) throw new Error("Failed to connect calendar");
  const data = await res.json();
  setToken(data.token);
  return data;
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
    const res = await fetch(`${BASE}/auth/${provider}/disconnect`, { method: "DELETE", headers: authHeaders() });
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
      headers: authHeaders(),
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
    const res = await fetch(`${BASE}/events/next-day?provider=${provider}`, { headers: authHeaders() });
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

const mockCache: Record<string, Event[]> = {};

function generateMockEvents(startDate: string): Event[] {
  if (mockCache[startDate]) return mockCache[startDate];

  const priorities: Array<"URGENT" | "HIGH" | "MEDIUM" | "LOW"> = ["URGENT", "HIGH", "MEDIUM", "LOW"];
  const titles = [
    "Team standup", "Design review", "Sprint planning", "Code review",
    "1:1 with manager", "Deploy to staging", "Write unit tests", "Client demo",
    "Architecture discussion", "Bug triage", "Lunch with team", "Release prep",
    "Retrospective", "Pair programming", "Product sync",
  ];

  let seed = 0;
  for (let i = 0; i < startDate.length; i++) seed += startDate.charCodeAt(i);
  const rng = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  const start = new Date(startDate + "T00:00:00");
  const events: Event[] = [];
  for (let d = 0; d < 7; d++) {
    const day = new Date(start);
    day.setDate(day.getDate() + d);
    const count = Math.floor(rng() * 3) + 1;
    for (let i = 0; i < count; i++) {
      const hour = 9 + Math.floor(rng() * 9);
      const eventStart = new Date(day);
      eventStart.setHours(hour, 0, 0, 0);
      const eventEnd = new Date(eventStart);
      eventEnd.setHours(hour + 1);
      events.push({
        id: `mock-${d}-${i}`,
        summary: titles[Math.floor(rng() * titles.length)],
        start: eventStart.toISOString(),
        end: eventEnd.toISOString(),
        priority: priorities[Math.floor(rng() * priorities.length)],
        status: "confirmed",
      });
    }
  }
  mockCache[startDate] = events;
  return events;
}

export async function getWeekEvents(provider: Provider = "google", startDate: string): Promise<Event[]> {
  log("getWeekEvents →", provider, startDate);
  try {
    const res = await fetch(`${BASE}/events/week?provider=${provider}&startDate=${startDate}`, { headers: authHeaders() });
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
    if (process.env.NODE_ENV === "development") {
      log("getWeekEvents → returning mock data");
      return generateMockEvents(startDate);
    }
    throw err;
  }
}

export async function updateEvent(eventId: string, payload: { start: string; end: string; provider: string }): Promise<void> {
  log("updateEvent →", eventId, payload);
  try {
    const res = await fetch(`${BASE}/events/${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      headers: authHeaders(),
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
      headers: authHeaders(),
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
    const res = await fetch(`${BASE}/delegates`, { headers: authHeaders() });
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
    const res = await fetch(`${BASE}/delegates/${encodeURIComponent(email)}`, { method: "DELETE", headers: authHeaders() });
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
