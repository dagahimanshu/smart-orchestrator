# Smart Life Orchestrator

A modern calendar dashboard that connects to Google Calendar or Microsoft Outlook. Features a 7-day week view with drag-and-drop, AI-powered task priority, recurring events, and delegate access to manage other people's calendars.

## Features

- **Landing page** with email-based login — auto-detects Google or Microsoft via DNS MX lookup
- **Dashboard** — next 24 hours at a glance with stats and priority badges
- **Calendar view** — 7-day week grid (like Google Calendar) with:
  - Events as positioned, color-coded blocks
  - Drag-and-drop to reschedule events
  - Click-and-drag on empty slots to create tasks
  - Week navigation (prev/next/today)
  - Current time indicator
- **Tasks view** — weekly event list grouped by day
- **Settings** — account info, delegate management, disconnect
- **Add Task modal** with:
  - Title, description, date, start/end time
  - Priority selector (LOW/MEDIUM/HIGH/URGENT)
  - Recurrence (daily, weekly, weekdays, monthly, yearly)
  - Google Meet / Teams link toggle
  - Attachment URLs (Google only)
  - Create on behalf of a delegate
- **Delegate access** — request calendar access from others via magic link email, manage authorized delegates

## Tech Stack

- Next.js 16, React 19, TypeScript
- Custom CSS design system (no Tailwind runtime)
- Lucide React icons

## Prerequisites

- Node.js 20+
- npm
- Smart Scheduler backend running on `http://localhost:9090`

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page — email login + product info |
| `/dashboard` | Main app (requires connection) |
| `/auth/success` | OAuth popup callback |
| `/auth/error` | OAuth error callback |
| `/auth/delegate` | Delegate consent page (magic link target) |
| `/auth/delegate/success` | Delegate auth success |
| `/auth/delegate/error` | Delegate auth error |

## Backend API

The frontend calls the scheduler backend at `http://localhost:9090`. Key endpoints used:

| Endpoint | Used by |
|----------|---------|
| `GET /auth/detect-provider?email=...` | Landing page (auto-detect provider) |
| `GET /auth/{provider}/url` | OAuth flow |
| `GET /auth/{provider}/status` | Auth state check |
| `DELETE /auth/{provider}/disconnect` | Settings disconnect |
| `POST /tasks` | Add Task modal |
| `GET /events/next-day?provider=...` | Dashboard |
| `GET /events/week?provider=...&startDate=...` | Calendar + Tasks views |
| `PATCH /events/{id}` | Calendar drag-and-drop |
| `POST /delegates/request` | Settings delegate request |
| `GET /delegates` | Settings + AddTaskModal delegate list |
| `DELETE /delegates/{email}` | Settings revoke delegate |

## Project Structure

```
app/
├── page.tsx                    # Landing page
├── layout.tsx                  # Root layout (Sora + DM Mono fonts)
├── globals.css                 # Full design system
├── dashboard/
│   └── page.tsx                # Main dashboard shell + tab routing
└── auth/
    ├── success/page.tsx        # OAuth success (popup)
    ├── error/page.tsx          # OAuth error (popup)
    └── delegate/
        ├── page.tsx            # Delegate consent page
        ├── success/page.tsx    # Delegate auth success
        └── error/page.tsx      # Delegate auth error
components/
├── Sidebar.tsx                 # Navigation + calendar connection
├── Dashboard.tsx               # Stats + next-24h events
├── CalendarView.tsx            # 7-day week grid + drag-and-drop
├── TasksView.tsx               # Weekly task list by day
├── SettingsView.tsx            # Account, delegates, disconnect
└── AddTaskModal.tsx            # Task creation form
lib/
└── api.ts                      # All backend HTTP calls with logging
types/
└── index.ts                    # Shared TypeScript types
```

## Design System

Custom CSS variables in `globals.css` — no Tailwind utility classes. Key tokens:

- Colors: `--navy`, `--slate`, `--muted`, `--rose`, `--blue-accent`, `--green-accent`, `--amber-accent`, `--urgent`
- Typography: Sora (UI) + DM Mono (code/labels)
- Spacing: `--radius`, `--radius-lg`
- Effects: `--shadow`, `--shadow-md`, `--transition`

Priority colors: URGENT (red), HIGH (rose), MEDIUM (amber), LOW (green)
