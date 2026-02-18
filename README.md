<div align="center">

# OpenClaw Dashboard

<h3>Mission control for your OpenClaw agent swarm.</h3>

<p>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <a href="https://github.com/bokiko/openClaw-dashboard/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License">
  </a>
</p>

<p>
  <a href="https://openclaw.io">OpenClaw</a> · <a href="https://bokiko.io">bokiko.io</a> · <a href="https://twitter.com/bokiko">@bokiko</a>
</p>

</div>

---

<img src="public/screenshot.png" alt="OpenClaw Dashboard" width="100%">

---

## What Is This?

A real-time web dashboard for the [OpenClaw](https://openclaw.io) agent swarm. It connects to the OpenClaw gateway via WebSocket RPC on the server side and provides full operational visibility — agents, tasks, routines, chat, and notifications.

v2.0.0 adds a full platform layer: PostgreSQL persistence, JWT auth, browser WebSocket for real-time updates, rich task management, and a DB-backed notification system. The gateway adapter layer remains for live cluster integration.

| Feature | What it does |
|---------|--------------|
| **Live Agent Strip** | See every agent's status at a glance — who's working, who's idle, model info |
| **Task Kanban** | Drag-and-drop task board across status lanes with create, edit, checklists, and comments |
| **Routine Manager** | Create, edit, enable/disable, and trigger scheduled routines from the UI |
| **Agent Chat** | Send messages to any agent — responses rendered with code block highlighting |
| **Activity Feed** | Live activity stream with severity indicators |
| **Metrics Panel** | Charts and stats — task throughput, status distribution, per-agent workload |
| **Notifications** | Real-time notification panel with read/dismiss actions and severity badges |
| **Command Palette** | `Cmd+K` to quickly filter agents, toggle feed, create tasks, open routines |
| **Auth & Sessions** | JWT-based operator login with rate limiting and optional DB session tracking |
| **DB Persistence** | PostgreSQL backend for tasks, agents, notifications, chat, and routines |
| **WebSocket Updates** | Real-time browser push for task changes, feed events, and notifications |
| **Skeleton Loading** | Smooth loading states with skeleton UI for agent strip, task cards, and metrics |
| **Mobile Responsive** | Full mobile support — bottom-sheet modals, wrapping layouts, touch-friendly sizing |

---

## Architecture

The dashboard supports two data paths:

```
Browser (React)                    Browser (React)
  │                                  │
  │ HTTP polling                     │ HTTP + WebSocket
  ▼                                  ▼
Gateway API Routes               v2.0 API Routes
(/api/gateway/*)                 (/api/tasks, /api/notifications, etc.)
  │                                  │
  │ WebSocket RPC                    │ SQL queries
  ▼                                  ▼
OpenClaw Gateway                 PostgreSQL
(ws://127.0.0.1:18789)          (dashboard DB)
```

**Gateway mode** — Server-side WebSocket client connects to the OpenClaw gateway, handles challenge/auth, and exposes typed RPC calls. Sessions and cron jobs are mapped to the dashboard's component interfaces.

**DB mode** — Full CRUD via PostgreSQL with real-time browser push over WebSocket. Tasks, agents, notifications, chat messages, and routines are stored in the database.

**Dual data source** — `data-source.ts` automatically selects DB or file-based storage depending on whether a database is configured.

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (optional — falls back to file-based tasks without it)
- A running OpenClaw gateway (optional — for live cluster integration)

### Setup

```bash
git clone https://github.com/bokiko/openClaw-dashboard.git
cd openClaw-dashboard
npm install
```

### Configure

Create `.env.local`:

```bash
# Auth: JWT signing secret (required for auth)
DASHBOARD_SECRET=$(openssl rand -hex 32)

# Database (optional — enables full v2.0 features)
DATABASE_URL=postgresql://user:pass@localhost:5432/openclaw_dashboard

# Gateway connection (optional — for live cluster integration)
GATEWAY_WS_URL=ws://127.0.0.1:18789
GATEWAY_TOKEN=your-gateway-token
GATEWAY_HEALTH_URL=http://127.0.0.1:18792

# Task directory (file-based fallback when no DB)
OPENCLAW_TASKS_DIR=./tasks
```

### Database Setup (optional)

Run the migration scripts in order:

```bash
psql $DATABASE_URL -f scripts/migrations/002_dashboard_tasks.sql
psql $DATABASE_URL -f scripts/migrations/003_agents.sql
psql $DATABASE_URL -f scripts/migrations/004_activity_log.sql
psql $DATABASE_URL -f scripts/migrations/005_notifications.sql
psql $DATABASE_URL -f scripts/migrations/006_chat_messages.sql
psql $DATABASE_URL -f scripts/migrations/007_routines.sql
psql $DATABASE_URL -f scripts/migrations/008_task_extras.sql
```

To migrate existing file-based tasks into the database:

```bash
npx tsx scripts/migrate-files-to-db.ts
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If `DASHBOARD_SECRET` is set, log in with it as the password.

---

## API Routes

### Gateway Routes (cluster integration)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/gateway/dashboard` | GET | Aggregated dashboard data (sessions, agents, cron runs, stats) |
| `/api/gateway/routines` | GET/POST | List or create cron jobs |
| `/api/gateway/routines/[id]` | PATCH/DELETE | Update or remove a cron job |
| `/api/gateway/routines/[id]/trigger` | POST | Trigger a cron job immediately |
| `/api/gateway/chat` | POST | Send a message to an agent |
| `/api/gateway/health` | GET | Health check (HTTP + RPC) |

### v2.0 Routes (DB-backed CRUD)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/tasks` | GET/POST | List or create tasks |
| `/api/tasks/[id]` | GET/PATCH/DELETE | Read, update, or delete a task |
| `/api/tasks/[id]/checklist` | POST/PATCH/DELETE | Manage task checklists |
| `/api/tasks/[id]/comments` | GET/POST | Task comments |
| `/api/feed` | GET | Activity feed |
| `/api/notifications` | GET/POST | List or create notifications |
| `/api/notifications/[id]` | PATCH/DELETE | Mark read or delete |
| `/api/routines` | GET/POST | List or create routines |
| `/api/routines/[id]` | PATCH/DELETE | Update or delete a routine |
| `/api/chat` | POST | Send chat message |
| `/api/chat/[agentId]/history` | GET | Chat history for an agent |
| `/api/ws-token` | GET | Short-lived WebSocket auth token |
| `/api/auth/login` | POST | Operator login (rate limited) |
| `/api/auth/logout` | POST | Logout |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/                    # Login/logout routes
│   │   ├── cluster/                 # Legacy cluster proxy
│   │   ├── gateway/                 # Gateway adapter routes
│   │   ├── tasks/                   # Task CRUD + checklist/comments
│   │   ├── notifications/           # Notification endpoints
│   │   ├── routines/                # Routine scheduling endpoints
│   │   ├── chat/                    # Agent chat endpoints
│   │   ├── feed/                    # Activity feed
│   │   └── ws-token/                # WebSocket auth token
│   ├── login/page.tsx               # Login page
│   └── page.tsx                     # Main dashboard
├── components/
│   ├── AgentStrip.tsx               # Agent status bar
│   ├── AgentModal.tsx               # Agent detail + chat
│   ├── ChatPanel.tsx                # Agent chat panel
│   ├── Header.tsx                   # Top bar with stats
│   ├── MissionQueue.tsx             # Kanban board
│   ├── TaskCard.tsx                 # Kanban task card
│   ├── TaskCreateModal.tsx          # Task creation modal
│   ├── TaskEditModal.tsx            # Task detail/edit modal
│   ├── RoutineManager.tsx           # Routine scheduling UI
│   ├── RoutineForm.tsx              # Routine create/edit form
│   ├── MetricsPanel.tsx             # Charts and statistics
│   ├── LiveFeed.tsx                 # Activity feed drawer
│   ├── NotificationBell.tsx         # Notification badge button
│   ├── NotificationPanel.tsx        # Notification panel
│   ├── CommandPalette.tsx           # Cmd+K palette
│   ├── ErrorBoundary.tsx            # Error boundary wrapper
│   ├── WelcomeScreen.tsx            # Empty state onboarding
│   ├── providers/                   # Client providers (WS, etc.)
│   └── skeletons/                   # Loading skeleton components
├── lib/
│   ├── gateway-client.ts            # WS RPC client (server-side)
│   ├── gateway-mappers.ts           # Gateway → dashboard mappers
│   ├── useClusterState.ts           # Gateway data hook
│   ├── WebSocketProvider.tsx         # Browser WS context
│   ├── data.ts                      # File-based task loader
│   ├── data-source.ts               # Dual data source selector
│   ├── db.ts                        # PostgreSQL connection pool
│   ├── db-data.ts                   # DB-backed data operations
│   ├── auth.ts                      # JWT session management
│   ├── ws-server.ts                 # Server-side WebSocket hub
│   ├── ws-client.ts                 # Browser WebSocket client
│   ├── notification-bus.ts          # Notification event bus
│   ├── activity-logger.ts           # Activity log writer
│   ├── routine-scheduler.ts         # Routine scheduling engine
│   └── api-client.ts                # Typed API client
├── types/
│   └── index.ts                     # All TypeScript interfaces
└── scripts/
    ├── migrations/                  # SQL migration files
    └── migrate-files-to-db.ts       # File → DB migration tool
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 3.4 |
| Database | PostgreSQL (optional) |
| Auth | JWT via jose |
| Gateway Client | ws (Node.js WebSocket) |
| Animations | Framer Motion |
| Charts | Recharts |
| Drag & Drop | dnd-kit |
| Command Palette | cmdk |
| Primitives | Radix UI (Dialog, Tooltip, Dropdown) |
| Notifications | Sonner |
| Icons | Lucide React |
| Testing | Vitest |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `Enter` | Send chat message |
| `Shift + Enter` | Newline in chat |
| `Escape` | Close modals, panels, chat |

---

## Security

- **JWT auth** — Session tokens signed with HS256, 24h expiry, httpOnly cookies
- **Rate limiting** — Login endpoint limited to 5 attempts per 15 minutes per IP
- **Middleware protection** — All routes except `/login` and `/api/auth` require valid session
- **Server-side gateway access** — Gateway token never exposed to the browser
- **Path traversal protection** — File-based task loader validates paths with `resolve()` + `startsWith()`
- **DB session tracking** — Optional server-side session storage for audit/revocation
- **Open access mode** — No `DASHBOARD_SECRET` = no auth required (v1 compatibility)

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
