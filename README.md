# Smart Life Orchestrator

Smart Life Orchestrator is a Next.js dashboard for viewing upcoming Google Calendar events and creating new tasks through a Spring Boot backend.

The UI shows events for the next 24 hours, lets a user connect Google Calendar, and supports task creation with priority, attachments, and optional Google Meet links.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- `lucide-react` for icons

## Prerequisites

- Node.js 20+
- npm
- The Spring Boot backend running locally

This frontend currently calls the backend at `http://localhost:9090` in [`lib/api.ts`](/Users/himanshu/workspace/smart-orchestrator/lib/api.ts).

## Backend Expectations

The app expects the backend to expose these endpoints:

- `GET /auth/google/url`
- `GET /auth/google/status`
- `POST /tasks`
- `GET /events/next-day`

The event feed shown in the dashboard represents events returned by the backend for the next 24 hours.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Main Features

- Google Calendar connection state synced from the backend on page load
- Dashboard with dynamic greeting based on local time
- Upcoming events view for the next 24 hours
- Task creation modal with:
  - title
  - description
  - date and time
  - manual priority selection
  - attachment URLs
  - optional Google Meet link creation

## Notes

- The frontend does not store Google auth itself. It reads auth state from the backend.
- If events appear but the UI says "Connect Google Calendar", check the backend auth status endpoint and frontend state sync.
- If requests fail in the browser, verify that backend CORS allows the frontend origin.

## Project Structure

- [`app/page.tsx`](/Users/himanshu/workspace/smart-orchestrator/app/page.tsx): app shell and top-level state
- [`components/Dashboard.tsx`](/Users/himanshu/workspace/smart-orchestrator/components/Dashboard.tsx): dashboard and events list
- [`components/AddTaskModal.tsx`](/Users/himanshu/workspace/smart-orchestrator/components/AddTaskModal.tsx): task creation form
- [`components/Sidebar.tsx`](/Users/himanshu/workspace/smart-orchestrator/components/Sidebar.tsx): navigation and Google Calendar connect UI
- [`lib/api.ts`](/Users/himanshu/workspace/smart-orchestrator/lib/api.ts): backend API calls

## Future Improvements

- Move the API base URL to environment variables
- Add explicit loading and error states for auth and event fetches
- Add tests for API integration and UI state transitions
