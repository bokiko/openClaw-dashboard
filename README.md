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

A real-time web dashboard that gives you eyes on your [OpenClaw](https://openclaw.io) agent swarm. It reads task files directly from your swarm's task directory and presents everything in a clean, dark-themed UI.

**No database. No backend setup. Just point it at your tasks folder and go.**

| Feature | What it does |
|---------|--------------|
| **Agent Auto-Discovery** | Agents are detected from your task files automatically — no configuration needed |
| **Agent Strip** | See every agent's status and completion stats at a glance — who's working, who's idle |
| **Kanban Board** | Drag-and-drop tasks across lanes: In Progress, Review, Assigned, Waiting, Inbox, Done |
| **Live Feed** | Real-time activity stream from task changes, auto-refreshes every 30s |
| **Metrics Panel** | Charts and stats — task throughput, status distribution, per-agent workload breakdown |
| **Token Tracking** | Input/output token usage per task, model breakdown charts, daily trends |
| **Personalization** | Custom name, theme (dark/light), 8 accent colors, logo icon — persists across updates |
| **Welcome Screen** | Fresh installs get a guided onboarding with sample task format |
| **Update Checker** | Header shows when a new version is available on GitHub |
| **Command Palette** | `Cmd+K` to quickly filter agents, toggle feed, refresh data |
| **Task & Agent Modals** | Click any task or agent for full detail views with activity timelines |

---

## Why OpenClaw Dashboard?

### Zero friction
Drop JSON files in a folder. That's the entire backend. No database required, no config files to wrestle with, no Docker compose to debug. Point it at your tasks directory and you're live in under a minute.

### Works with any AI
Claude, GPT, Gemini, LLaMA, Mistral, local models — it doesn't matter. The dashboard reads standard JSON. If your agent can write a file, it can talk to this dashboard. No vendor lock-in, no proprietary APIs.

### AI-assisted setup
Tell your AI agent to clone the repo and read `AGENTS.md`. It handles installation, asks you personalization questions (name, theme, colors), and writes a config file — all without you touching a terminal. Works with any AI agent.

### Your style, your brand
8 accent colors. Dark and light themes. 10 logo icons. Custom dashboard name and subtitle. Custom agent roster. All stored in a single `settings.json` that **survives every update** — `git pull` never touches your preferences.

### Token usage visibility
See exactly how many tokens each task consumed. Per-model breakdowns. Daily trend charts. Input vs output splits. Know where your API budget is going before the invoice arrives.

### Self-updating
The header shows when a new version is available on GitHub. Pull updates with a single `git pull` — your `settings.json` is gitignored, so your preferences are never overwritten.

### Production-ready security
API key authentication. Rate limiting (60 req/min per IP). Path traversal protection. File size limits. Sanitized error messages. Published security audits in the repo — nothing hidden.

### Built for teams
Bind to `0.0.0.0` and anyone on your network gets eyes on the swarm. Real-time agent status, live activity feed, Kanban board with drag-and-drop. Everyone sees the same picture.

### Lightweight and fast
Next.js 16, React 19, Tailwind CSS. No heavy ORM, no background workers, no message queues. Reads files from disk, serves JSON over HTTP. Runs comfortably on a $5/month VPS.

---

## Table of Contents

1. [What Is This?](#what-is-this)
2. [Why OpenClaw Dashboard?](#why-openclaw-dashboard)
3. [Quick Start](#quick-start)
4. [Agent-Assisted Install](#recommended-agent-assisted-install)
5. [Personalization](#personalization)
6. [Configuration](#configuration)
7. [Security](#security)
8. [Task File Format](#task-file-format)
9. [Agent Roster](#agent-roster)
10. [Architecture](#architecture)
11. [Tech Stack](#tech-stack)
12. [Keyboard Shortcuts](#keyboard-shortcuts)
13. [Audit Reports](#audit-reports)
14. [Contributing](#contributing)

---

## Quick Start

### Prerequisites

- Node.js 18+
- An OpenClaw swarm with a tasks directory (JSON files)

### Setup

```bash
git clone https://github.com/bokiko/openClaw-dashboard.git
cd openClaw-dashboard
npm install
```

### Configure your tasks path

Copy `.env.example` to `.env.local` and set `OPENCLAW_TASKS_DIR` to your swarm's task directory:

```bash
cp .env.example .env.local
# Edit .env.local and set OPENCLAW_TASKS_DIR
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Recommended: Agent-Assisted Install

For the best setup experience, let your AI agent handle the installation. Point any AI agent (Claude, GPT, Gemini, or others) at this repo and it will:

1. Clone and install dependencies
2. Ask you personalization questions (name, theme, accent color, logo)
3. Write a `settings.json` that persists across future updates
4. Configure environment variables
5. Start the server

The agent reads [`AGENTS.md`](AGENTS.md) — a comprehensive setup guide written for AI agents of any capability level. Your preferences are stored in `settings.json` (gitignored), so `git pull` never overwrites them.

```
"Clone github.com/bokiko/openClaw-dashboard and set it up. Read AGENTS.md for instructions."
```

---

## Personalization

The dashboard is fully customizable via `settings.json` in the project root:

```bash
cp settings.example.json settings.json
# Edit settings.json with your preferences
```

| Setting | Options | Default |
|---------|---------|---------|
| `name` | Any string | `"OpenClaw"` |
| `subtitle` | Any string | `"Mission Control"` |
| `theme` | `dark`, `light` | `dark` |
| `accentColor` | `green`, `blue`, `purple`, `orange`, `red`, `cyan`, `amber`, `pink` | `green` |
| `logoIcon` | `zap`, `brain`, `bot`, `flame`, `shield`, `rocket`, `sparkles`, `cpu`, `eye`, `activity` | `zap` |
| `cardDensity` | `compact`, `comfortable` | `comfortable` |
| `showMetricsPanel` | `true`, `false` | `true` |
| `showTokenPanel` | `true`, `false` | `true` |
| `timeDisplay` | `utc`, `local` | `utc` |

Settings are gitignored and survive updates. See [`settings.example.json`](settings.example.json) for the full schema.

---

## Configuration

The dashboard reads JSON task files from a single directory. Set the path via environment variable in `.env.local`:

```bash
OPENCLAW_TASKS_DIR=/path/to/your/tasks
```

If not set, it defaults to `./tasks` relative to the project root.

The dashboard will:
- Scan for all `.json` files in that directory
- Parse each file into a task with status, priority, assignee, and tags
- Auto-refresh every 30 seconds
- Skip files larger than 1MB and validate paths to prevent traversal

---

## Security

### API Key Authentication

For deployments beyond localhost, protect the API with a key:

```bash
# In .env.local
OPENCLAW_API_KEY=your-secret-key
NEXT_PUBLIC_OPENCLAW_API_KEY=your-secret-key
```

When `OPENCLAW_API_KEY` is set, all requests to `/api/data` must include an `Authorization: Bearer <key>` header. If not set, the API remains open (suitable for local development).

### Rate Limiting

The API endpoint includes built-in rate limiting (60 requests per minute per IP). Requests exceeding the limit receive a `429 Too Many Requests` response.

### Path Traversal Protection

Task file loading validates that all resolved file paths stay within the configured tasks directory, preventing directory traversal attacks.

---

## Task File Format

The dashboard is flexible with field names. Drop JSON files into your tasks directory:

```json
{
  "id": "task-001",
  "title": "Implement auth middleware",
  "description": "Add JWT validation to all API routes",
  "status": "in-progress",
  "priority": "high",
  "claimed_by": "spark",
  "tags": ["backend", "security"],
  "created_at": "2026-01-15T10:00:00Z"
}
```

### Status mapping

The dashboard normalizes various status strings:

| Your value | Dashboard shows |
|------------|----------------|
| `complete`, `completed`, `done`, `approved` | Done |
| `in-progress`, `in_progress`, `active`, `working` | In Progress |
| `review`, `submitted`, `pending_review` | Review |
| `assigned`, `claimed` | Assigned |
| `waiting`, `blocked`, `paused` | Waiting |
| anything else | Inbox |

### Priority mapping

| Your value | Dashboard shows |
|------------|----------------|
| `urgent`, `p0`, `critical` | Urgent (red) |
| `high`, `p1` | High (amber) |
| anything else | Normal (grey) |

### Assignee detection

The dashboard checks these fields in order: `claimed_by` → `assignee` → first `deliverables[].assignee`.

---

## Agent Roster

Agents are **auto-discovered** from your task files. Any unique `claimed_by`, `assignee`, or `deliverables[].assignee` value becomes an agent in the dashboard — no configuration required.

Auto-discovered agents get:
- A capitalized name derived from their ID
- A color from a 10-color palette
- `working` status if they have an in-progress task, `idle` otherwise
- Completion stats (`done/total`) shown on the agent strip

To override with a custom roster, set the `agents` array in `settings.json`:

```json
{
  "agents": [
    { "id": "spark", "name": "Spark", "letter": "S", "color": "#ffb224", "role": "Code & Writing", "badge": "spc" },
    { "id": "scout", "name": "Scout", "letter": "R", "color": "#3e63dd", "role": "Research" }
  ]
}
```

Settings agents take priority over auto-discovery when configured.

---

## Architecture

```
openClaw-dashboard/
├── audits/                        # Security audit reports
├── scripts/
│   ├── __tests__/                 # Script tests (Vitest)
│   ├── export-bundle.ts           # Nightly snapshot export
│   ├── executive-report.ts        # Weekly executive markdown report
│   ├── sync-db.ts                 # PostgreSQL → task JSON bridge
│   ├── log-usage.ts               # Token usage writer (DB + file)
│   ├── dispatch-task.sh           # Agent wrapper with auto-capture
│   ├── ensure-tables.ts           # Database migration runner
│   └── migrations/                # SQL migration files
├── public/
│   └── screenshot.png             # Dashboard screenshot
├── src/
│   ├── app/
│   │   ├── api/data/route.ts      # API endpoint — reads task files from disk
│   │   ├── api/update/route.ts    # Update checker (git fetch + compare, read-only)
│   │   ├── page.tsx                # Main dashboard page
│   │   ├── layout.tsx              # Root layout, theme-aware
│   │   └── globals.css             # Tailwind config, CSS variables (dark + light)
│   ├── components/
│   │   ├── AgentAvatar.tsx         # Agent avatar with status indicator
│   │   ├── AgentModal.tsx          # Agent detail modal
│   │   ├── AgentStrip.tsx          # Horizontal agent status bar
│   │   ├── CommandPalette.tsx      # Cmd+K command palette
│   │   ├── Header.tsx              # Top bar with stats, logo, update button
│   │   ├── LiveFeed.tsx            # Activity feed drawer
│   │   ├── MetricsPanel.tsx        # Charts and statistics
│   │   ├── TokenMetricsPanel.tsx   # Token usage charts and trends
│   │   ├── MissionQueue.tsx        # Kanban board with drag-and-drop
│   │   ├── TaskCard.tsx            # Individual task card (with token badge)
│   │   ├── TaskModal.tsx           # Task detail modal (with usage info)
│   │   └── WelcomeScreen.tsx      # Onboarding guide for fresh installs
│   ├── lib/
│   │   ├── __tests__/              # Data layer tests (Vitest)
│   │   ├── data.ts                 # Task loader, agent discovery, stats, token aggregation
│   │   ├── settings.ts             # Settings loader (reads settings.json)
│   │   ├── useSwarmData.ts         # Client hook — fetches from API, auto-refreshes
│   │   └── utils.ts                # Utility functions
│   └── types/
│       └── index.ts                # TypeScript interfaces and config
├── AGENTS.md                       # AI agent setup guide (model-agnostic)
├── settings.example.json           # Settings schema reference
├── vitest.config.ts                # Test runner configuration
├── .env.example                    # Environment variable reference
├── next.config.ts
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

**Data flow:** Task JSON files on disk → `data.ts` reads them → `/api/data` serves them → `useSwarmData` hook fetches every 30s → React components render. Settings from `settings.json` are applied server-side and sent to the client via the API.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 3.4 |
| Animations | Framer Motion |
| Charts | Recharts |
| Drag & Drop | dnd-kit |
| Command Palette | cmdk |
| Primitives | Radix UI (Dialog, Tooltip, Dropdown) |
| Notifications | Sonner |
| Icons | Lucide React |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `Escape` | Close modals, feed drawer |

---

## Audit Reports

We build in the open. No security through obscurity, no hidden vulnerabilities, nothing to cover up. Every audit we run gets published right here in the repo — the findings, the fixes, and the reasoning behind them. If someone finds a flaw, we'd rather the world see how we handled it than pretend it never existed.

This is how trust gets built: not by claiming perfection, but by showing the work.

| Date | Report | Findings | Status |
|------|--------|----------|--------|
| 2026-02-08 | [Security Audit](audits/2026-02-08-security-audit.md) | 7 (1 critical, 2 medium, 4 low) | All remediated |

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
