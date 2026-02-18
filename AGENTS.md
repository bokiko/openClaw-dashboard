# OpenClaw Dashboard — Agent Setup Guide (v2.0.0)

You are setting up the OpenClaw Dashboard for the user. Follow these instructions exactly. Do not skip steps. Do not improvise alternatives. Every step has been tested.

This guide works with any AI agent — Claude, GPT, Gemini, Kimi, LLaMA, Copilot, or any other model.

---

## What This Is

A real-time web dashboard (v2.0.0) for the [OpenClaw](https://openclaw.io) agent swarm. It provides full operational visibility: agents, tasks, routines, chat, notifications, and metrics.

The dashboard supports three deployment modes:

| Mode | What you need | What you get |
|------|--------------|--------------|
| **File-based** (minimal) | Node.js only | Reads task JSON files from disk, Kanban board, metrics |
| **DB-backed** (full platform) | Node.js + PostgreSQL | Everything above + task CRUD, checklists, comments, notifications, chat, routines, WebSocket real-time updates |
| **Gateway** (live cluster) | Node.js + OpenClaw gateway | Everything above + live session data from the OpenClaw agent cluster via WebSocket RPC |

All three can be combined. The dashboard auto-detects which backends are available.

---

## Prerequisites

Before starting, confirm these exist on the machine:
- **Node.js 18+** (`node --version`)
- **npm** (`npm --version`)
- **git** (`git --version`)

Optional:
- **PostgreSQL** — enables full v2.0 features (task CRUD, notifications, chat, routines). Docker works: `docker ps | grep postgres`
- **OpenClaw gateway** — enables live cluster integration (sessions, agents, cron jobs)

**Minimum viable setup:** Node.js + npm only. The dashboard runs with file-based tasks and no auth.

If any required prerequisite is missing, install it before continuing.

---

## Installation

### Step 1: Clone and install

```bash
git clone https://github.com/bokiko/openClaw-dashboard.git
cd openClaw-dashboard
npm install
```

### Step 2: Create environment file

```bash
cp .env.example .env.local
```

### Step 3: Configure .env.local

Ask the user which mode they want, then set the appropriate variables:

```bash
# ── File-based mode (always available) ────────────────────────────
# Path to the directory containing task JSON files.
# The dashboard reads *.json from this directory.
OPENCLAW_TASKS_DIR=./tasks

# ── Auth (recommended for production) ─────────────────────────────
# Operator password for login protection.
# Session stored as JWT (HS256) in httpOnly cookie.
# If unset, dashboard has open access (fine for localhost).
DASHBOARD_SECRET=

# ── Database mode (optional, enables full v2.0) ──────────────────
# PostgreSQL connection string.
# Enables: task CRUD, checklists, comments, notifications, chat, routines.
# If unset, falls back to file-based mode.
# DATABASE_URL=postgresql://user:password@localhost:5432/openclaw_dashboard

# ── Gateway mode (optional, live cluster integration) ─────────────
# OpenClaw gateway WebSocket RPC connection.
# Enables: live sessions, worker status, cron job management, agent chat via gateway.
# GATEWAY_WS_URL=ws://127.0.0.1:18789
# GATEWAY_TOKEN=your-gateway-token
# GATEWAY_HEALTH_URL=http://127.0.0.1:18792

# ── Agent chat (optional) ────────────────────────────────────────
# Anthropic API key for direct agent chat (when not using gateway).
# ANTHROPIC_API_KEY=
```

**Important:** Only uncomment and fill in the sections the user needs. File-based mode requires zero configuration beyond `OPENCLAW_TASKS_DIR`.

### Step 4: Create the tasks directory

```bash
mkdir -p tasks
```

### Step 5: Database setup (if using DB mode)

Skip this step if not using PostgreSQL.

```bash
# Run all migrations
npm run setup-db
```

Or run manually:
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
npm run migrate-files
```

### Step 6: Personalize the dashboard

**IMPORTANT: Before starting the server, run the personalization step below.** This creates a `settings.json` that persists across updates. See the [Personalization](#personalization) section.

### Step 7: Start the dashboard

For development:
```bash
npm run dev
```

For production:
```bash
npm run build
npm start
```

The dashboard runs on `http://localhost:3000` by default.

**Note:** The `dev` and `start` scripts use a custom server (`server.ts`) that attaches WebSocket support and the routine scheduler. Use `npm run dev:next` if you only want the bare Next.js server without these features.

If `DASHBOARD_SECRET` is set, the user must log in with it as the password.

---

## Personalization

The dashboard is fully personalizable via a `settings.json` file in the project root. This file is gitignored, so it survives `git pull` updates — the user's preferences are never overwritten.

### How it works

1. Copy the example: `cp settings.example.json settings.json`
2. Edit `settings.json` with the user's preferences
3. The dashboard reads `settings.json` on every request (cached for 5 seconds)
4. Changes take effect on the next page load — no restart needed

### Interactive setup (ask the user)

**You MUST ask the user these questions before writing `settings.json`.** Present each question clearly, show the available options, and use their answers to build the file. If the user says "just use defaults" or skips a question, use the default value.

#### Question 1: Dashboard name
> "What would you like to name your Mission Control dashboard?"
>
> Default: `"OpenClaw"`
> Examples: `"Alpha Squad"`, `"Project Phoenix"`, `"Neural Ops"`

Maps to: `name` field

#### Question 2: Subtitle
> "What subtitle should appear below the name?"
>
> Default: `"Mission Control"`
> Examples: `"Command Center"`, `"Agent HQ"`, `"Control Room"`

Maps to: `subtitle` field

#### Question 3: Theme
> "Which theme do you prefer?"
>
> Options:
> - `dark` (default) — Dark background, light text. Best for low-light environments.
> - `light` — Light background, dark text. Best for bright environments.

Maps to: `theme` field

#### Question 4: Accent color
> "Pick an accent color for the dashboard:"
>
> Options:
> - `green` (default) — Fresh and balanced
> - `blue` — Professional and calm
> - `purple` — Bold and creative
> - `orange` — Energetic and warm
> - `red` — Intense and urgent
> - `cyan` — Cool and technical
> - `amber` — Warm and golden
> - `pink` — Vibrant and modern

Maps to: `accentColor` field

#### Question 5: Logo icon
> "Which icon should appear in the header?"
>
> Options:
> - `zap` (default) — Lightning bolt
> - `brain` — Brain
> - `bot` — Robot
> - `flame` — Fire
> - `shield` — Shield
> - `rocket` — Rocket
> - `sparkles` — Sparkles
> - `cpu` — Processor chip
> - `eye` — Eye
> - `activity` — Heartbeat pulse

Maps to: `logoIcon` field

#### Question 6: Repository URL (optional)
> "Would you like to link to a GitHub/GitLab repository? If so, paste the URL. Otherwise say 'skip'."
>
> Default: `null` (no link shown)

Maps to: `repoUrl` field (set to `null` if skipped)

#### Question 7: Card density
> "How dense should task cards be?"
>
> Options:
> - `comfortable` (default) — More spacing, easier to read
> - `compact` — Tighter layout, fits more tasks on screen

Maps to: `cardDensity` field

#### Question 8: Panels
> "Which metric panels should be visible?"
>
> Options (multi-select):
> - Metrics Panel — task throughput, status distribution charts (default: on)
> - Token Usage Panel — token consumption charts and model breakdown (default: on)

Maps to: `showMetricsPanel` and `showTokenPanel` fields

#### Question 9: Time display
> "How should timestamps be displayed?"
>
> Options:
> - `utc` (default) — All times in UTC
> - `local` — Times in the user's local timezone

Maps to: `timeDisplay` field

### Writing settings.json

After collecting answers, write `settings.json` to the project root. Here is the full schema with all defaults:

```json
{
  "name": "OpenClaw",
  "subtitle": "Mission Control",
  "repoUrl": null,
  "logoIcon": "zap",
  "theme": "dark",
  "accentColor": "green",
  "backgroundGradient": {
    "topLeft": "rgba(70,167,88,0.05)",
    "bottomRight": "rgba(62,99,221,0.05)"
  },
  "cardDensity": "comfortable",
  "showMetricsPanel": true,
  "showTokenPanel": true,
  "refreshInterval": 30000,
  "timeDisplay": "utc",
  "agents": null
}
```

**Background gradient tip:** Match the `topLeft` color to the accent color at 5% opacity. Here are the gradient presets per accent:

| Accent | topLeft | bottomRight |
|--------|---------|-------------|
| green | `rgba(70,167,88,0.05)` | `rgba(62,99,221,0.05)` |
| blue | `rgba(62,99,221,0.05)` | `rgba(142,78,198,0.05)` |
| purple | `rgba(142,78,198,0.05)` | `rgba(62,99,221,0.05)` |
| orange | `rgba(247,107,21,0.05)` | `rgba(255,178,36,0.05)` |
| red | `rgba(229,77,46,0.05)` | `rgba(247,107,21,0.05)` |
| cyan | `rgba(0,162,199,0.05)` | `rgba(62,99,221,0.05)` |
| amber | `rgba(255,178,36,0.05)` | `rgba(247,107,21,0.05)` |
| pink | `rgba(232,121,164,0.05)` | `rgba(142,78,198,0.05)` |

### Custom agent roster (optional)

If the user has specific agents they want displayed on the agent strip, ask them. Otherwise set `agents` to `null` — the dashboard auto-discovers agents from task assignees.

Custom format:
```json
{
  "agents": [
    { "id": "alpha", "name": "Alpha", "letter": "A", "color": "#3e63dd", "role": "Lead Engineer", "badge": "lead" },
    { "id": "beta", "name": "Beta", "letter": "B", "color": "#46a758", "role": "Code & Writing", "badge": "spc" }
  ]
}
```

- `id`: unique lowercase identifier
- `name`: display name
- `letter`: single character shown in the avatar circle
- `color`: hex color for the agent's avatar (must be `#` + 6 hex digits)
- `role`: short description
- `badge`: optional, `"lead"` or `"spc"`

### Settings survive updates

The `settings.json` file is listed in `.gitignore`. When the user runs `git pull`, their settings are preserved. They never need to re-personalize after an update.

---

## Architecture

The dashboard supports two data paths that can run independently or together:

```
Data paths:

  Gateway path (live cluster):
  Browser → useClusterState → /api/gateway/* → gateway-client.ts → OpenClaw Gateway (WS RPC)

  DB path (full platform):
  Browser → API routes → /api/tasks, /api/notifications, etc. → db-data.ts → PostgreSQL

  File path (minimal fallback):
  Browser → /api/tasks → data-source.ts → data.ts → tasks/*.json (disk)

  Real-time updates:
  server.ts → ws-server.ts → Browser WebSocket (push events for task/feed/notification changes)
```

**Data source selection** (`data-source.ts`): If `DATABASE_URL` is set and the DB is reachable, uses PostgreSQL. Otherwise falls back to file-based task loading from `OPENCLAW_TASKS_DIR`.

**Custom server** (`server.ts`): Wraps Next.js to attach a WebSocket server on `/ws` and start the routine scheduler. Required for real-time push and scheduled routines.

### Key files

| File | Purpose |
|------|---------|
| `server.ts` | Custom HTTP server: Next.js + WebSocket + routine scheduler |
| `src/lib/auth.ts` | JWT session management (jose HS256), password verification |
| `src/lib/db.ts` | PostgreSQL connection pool |
| `src/lib/db-data.ts` | DB-backed CRUD operations for tasks, agents, notifications, chat, routines |
| `src/lib/data.ts` | File-based task loader (reads JSON from disk) |
| `src/lib/data-source.ts` | Dual data source selector (DB vs file) |
| `src/lib/gateway-client.ts` | Server-side WebSocket RPC client for OpenClaw gateway |
| `src/lib/gateway-mappers.ts` | Gateway response → dashboard type mappers |
| `src/lib/useClusterState.ts` | Client hook for gateway mode (HTTP polling + reducer) |
| `src/lib/WebSocketProvider.tsx` | Browser WebSocket context provider |
| `src/lib/ws-server.ts` | Server-side WebSocket hub (broadcasts events to browsers) |
| `src/lib/ws-client.ts` | Browser WebSocket client |
| `src/lib/notification-bus.ts` | Notification event bus |
| `src/lib/activity-logger.ts` | Activity log writer |
| `src/lib/routine-scheduler.ts` | Routine scheduling engine |
| `src/lib/settings.ts` | Settings loader (reads settings.json, caches 5s) |
| `src/middleware.ts` | Auth middleware (JWT cookie validation on all routes) |
| `src/types/index.ts` | All TypeScript interfaces |

### API routes

**Auth:**

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/login` | POST | Operator login (rate limited: 5 attempts/15min per IP) |
| `/api/auth/logout` | POST | Logout (destroys session) |

**Task CRUD (DB mode):**

| Route | Method | Description |
|-------|--------|-------------|
| `/api/tasks` | GET/POST | List or create tasks |
| `/api/tasks/[id]` | GET/PATCH/DELETE | Read, update, or delete a task |
| `/api/tasks/[id]/checklist` | POST/PATCH/DELETE | Manage task checklists |
| `/api/tasks/[id]/comments` | GET/POST | Task comments |

**Other v2.0 routes:**

| Route | Method | Description |
|-------|--------|-------------|
| `/api/feed` | GET | Activity feed |
| `/api/notifications` | GET/POST | List or create notifications |
| `/api/notifications/[id]` | PATCH/DELETE | Mark read or delete |
| `/api/routines` | GET/POST | List or create routines |
| `/api/routines/[id]` | PATCH/DELETE | Update or delete a routine |
| `/api/chat` | POST | Send chat message |
| `/api/chat/[agentId]/history` | GET | Chat history for an agent |
| `/api/ws-token` | GET | Short-lived WebSocket auth token (30s JWT) |

**Gateway routes (cluster integration):**

| Route | Method | Description |
|-------|--------|-------------|
| `/api/gateway/dashboard` | GET | Aggregated cluster data (sessions, agents, cron runs, stats) |
| `/api/gateway/routines` | GET/POST | List or create cron jobs |
| `/api/gateway/routines/[id]` | PATCH/DELETE | Update or remove a cron job |
| `/api/gateway/routines/[id]/trigger` | POST | Trigger a cron job immediately |
| `/api/gateway/chat` | POST | Send a message to an agent via gateway |
| `/api/gateway/health` | GET | Health check (HTTP + RPC) |

---

## Production Deployment

### Use a process manager

```bash
# PM2 (recommended)
npm install -g pm2
pm2 start npm --name "mission-control" -- start
pm2 save
pm2 startup

# Or systemd (create /etc/systemd/system/mission-control.service)
# Or Docker with restart: always
```

### Bind to all interfaces (LAN access)

Next.js binds to `0.0.0.0` by default in production. For dev mode:
```bash
npm run dev -- -H 0.0.0.0
```

### Set DASHBOARD_SECRET for production

Never leave `DASHBOARD_SECRET` empty in production:
```bash
echo "DASHBOARD_SECRET=$(openssl rand -hex 32)" >> .env.local
```

---

## Token Usage Tracking

Token usage appears automatically when task JSON files contain a `usage` array. Three ways to populate it:

### Option A: dispatch-task.sh (automatic)

Wraps any agent command and auto-captures token usage:

```bash
npm run dispatch -- my-task-id "Fix the authentication bug"
npm run dispatch -- refactor-api "Refactor the API layer" --model claude-sonnet-4-5
```

### Option B: log-usage (manual/scripted)

Call after any agent run from your own automation:

```bash
npm run log-usage -- \
  --session-id my-session \
  --task-id my-task \
  --input 15000 \
  --output 4200 \
  --model claude-opus-4
```

### Option C: Database (from DB tables)

If token usage is logged to the `token_usage` PostgreSQL table by other tools, it's available in the dashboard automatically.

---

## Task JSON File Format

For file-based mode, drop JSON files into `OPENCLAW_TASKS_DIR`. The dashboard is flexible with field names:

```json
{
  "id": "task-001",
  "title": "Implement auth middleware",
  "description": "Add JWT validation to all API routes",
  "status": "in-progress",
  "priority": "high",
  "claimed_by": "spark",
  "tags": ["backend", "security"],
  "created_at": "2025-01-15T10:00:00Z",
  "usage": [
    {
      "inputTokens": 12100,
      "outputTokens": 6300,
      "model": "claude-opus-4",
      "provider": "anthropic",
      "timestamp": 1705312800000
    }
  ]
}
```

### Status values

| Your value | Dashboard shows |
|------------|-----------------|
| `complete`, `completed`, `done`, `approved` | Done |
| `in-progress`, `in_progress`, `active`, `working` | In Progress |
| `review`, `submitted`, `pending_review` | Review |
| `assigned`, `claimed` | Assigned |
| `waiting`, `blocked`, `paused` | Waiting |
| anything else | Inbox |

### Priority values

| Your value | Dashboard shows |
|------------|-----------------|
| `urgent`, `p0`, `critical` | Urgent (red) |
| `high`, `p1` | High (amber) |
| anything else | Normal |

### Assignee detection

Checks in order: `claimed_by` -> `assignee` -> first `deliverables[].assignee`

### Usage array

Each entry in `usage` represents one API call. Fields:
- `inputTokens` (required) — also accepts `input_tokens`
- `outputTokens` (required) — also accepts `output_tokens`
- `cacheReadTokens` (optional) — also accepts `cache_read_tokens`
- `cacheWriteTokens` (optional) — also accepts `cache_write_tokens`
- `model` (optional) — e.g. "claude-opus-4", "gpt-4o", "gemini-pro"
- `provider` (optional) — "anthropic", "openai", "google", etc.
- `timestamp` (optional) — epoch milliseconds

---

## npm Scripts Reference

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server with WebSocket + routine scheduler (custom server, hot reload) |
| `npm run dev:next` | Start bare Next.js dev server (no WebSocket, no scheduler) |
| `npm run build` | Production build |
| `npm start` | Start production server (custom server with WS + scheduler) |
| `npm run setup-db` | Run database migrations (creates all v2.0 tables) |
| `npm run migrate-files` | Migrate file-based tasks into PostgreSQL |
| `npm run sync` | Sync PostgreSQL -> task JSON files (one-time, legacy) |
| `npm run sync:watch` | Sync with file watch (re-runs on changes, legacy) |
| `npm run log-usage -- [args]` | Log token usage to DB + file |
| `npm run dispatch -- [task-id] [prompt]` | Run agent with auto-capture |
| `npm run export` | Export task bundle |
| `npm run report` | Generate executive report |
| `npm test` | Run Vitest test suite (41 tests) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |

---

## Verification Checklist

After setup, verify everything works:

1. `npx tsc --noEmit` — TypeScript compiles with zero errors
2. `npm run dev` — Dashboard loads at http://localhost:3000
3. Dashboard shows the custom name and accent color from settings.json
4. Theme matches what the user chose (dark or light)

If `DASHBOARD_SECRET` is set:
5. Visit http://localhost:3000 — redirects to `/login`
6. Enter wrong password — gets 401, no cookie set
7. Enter correct password (the `DASHBOARD_SECRET` value) — redirects to dashboard

If using database mode:
8. `npm run setup-db` — prints migration success
9. Task create modal works (click + icon or use Cmd+K → "New task")
10. Notification bell appears in header
11. Routines section visible on dashboard

If using gateway mode:
12. Connection indicator (bottom-right) shows "Live" with green dot
13. Agent strip populates with cluster workers
14. Routine manager shows cron jobs from gateway

General UI checks:
15. Click a task card → edit modal appears
16. Agent avatar click → agent detail modal with task timeline
17. Cmd+K → command palette opens
18. Token Usage panel shows "No usage data yet" (normal if no data)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ENOENT: tasks directory not found` | Create it: `mkdir -p tasks` |
| Dashboard shows empty state | Add task JSON files to `OPENCLAW_TASKS_DIR`, or set up DB and create tasks via UI |
| Token panel always empty | Tasks need a `usage` array — use `npm run dispatch` or `npm run log-usage` |
| Redirected to /login but no password set | Set `DASHBOARD_SECRET` in `.env.local` — that value IS the password |
| Login always fails | Check `DASHBOARD_SECRET` is set in `.env.local` (not `.env`). The password must match exactly. |
| "Too many login attempts" | Rate limited — wait 15 minutes, or restart the dev server to clear in-memory state |
| `npm run setup-db` fails | Ensure `DATABASE_URL` is set, PostgreSQL is running, and user has CREATE TABLE permission |
| WebSocket not connecting | Ensure you're using `npm run dev` (not `npm run dev:next`) — custom server required for WS |
| Connection indicator shows "Reconnecting..." | Gateway is unreachable — check `GATEWAY_WS_URL` and that the gateway is running |
| Settings not applying | Check `settings.json` exists in project root and is valid JSON |
| Theme/colors look wrong | Verify `accentColor` is one of: green, blue, purple, orange, red, cyan, amber, pink |
| `next build` fails on `/_global-error` | Known Next.js 16 bug — does not affect functionality, ignore it |
| Chat not working | If using gateway: check gateway connection. If using DB mode: check `ANTHROPIC_API_KEY` is set. |

---

## Security Notes

- **Session auth:** Operator password verified server-side. Session stored as JWT (HS256 via jose library) in httpOnly cookie signed with `DASHBOARD_SECRET`. 24-hour expiry.
- **Rate limiting:** Login endpoint limited to 5 attempts per 15 minutes per IP (in-memory sliding window).
- **Middleware protection:** All routes except `/login` and `/api/auth/*` require valid JWT cookie. Invalid/expired tokens redirect to login.
- **WebSocket auth:** Browser WS connections require a short-lived JWT token (30s) obtained from `/api/ws-token`.
- **Open access mode:** If `DASHBOARD_SECRET` is not set, all routes are open (v1 compatibility, suitable for localhost).
- **DB session tracking:** When PostgreSQL is available, sessions are also stored in the `operator_sessions` table for audit/revocation.
- **Path traversal protection:** File-based task loader validates paths with `resolve()` + `startsWith()`.
- **File size limit:** 1MB per task JSON file.
- **jose is already installed:** Do NOT add jwt, jsonwebtoken, or other JWT libraries — `jose` handles everything.

---

## Do Not

- Do not edit `postcss.config.js` — it must stay as CommonJS (`.js`, not `.mjs`)
- Do not add `.env` files to git — they are gitignored (`.env.example` is the exception)
- Do not put non-JSON files in `OPENCLAW_TASKS_DIR` — only `*.json` is read
- Do not commit `tasks/` contents — they are generated/ephemeral and gitignored
- Do not commit `settings.json` — it is user-specific and gitignored
- Do not add extra JWT libraries — `jose` is already installed and handles all token operations
- Do not use `npm run dev:next` if you need WebSocket or routines — use `npm run dev` instead
- Do not make `TASKS_DIR` a module-level const — it must be a function (`getTasksDir()`) for tests to work
- Do not rename or restructure the `scripts/migrations/` directory — migration files are numbered and run in order
