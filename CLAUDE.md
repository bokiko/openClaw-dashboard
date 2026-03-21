# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

OpenClaw Dashboard — a real-time Next.js 16 dashboard for managing an AI agent swarm. Supports three data modes that auto-detect at runtime: **file-based** (JSON on disk), **DB-backed** (PostgreSQL), and **gateway** (WebSocket RPC to OpenClaw cluster). The dual data source layer (`src/lib/data-source.ts`) dynamically selects DB or file storage.

## Commands

```bash
# Development (custom server with WebSocket support)
npm run dev              # tsx --watch server.ts (use this, NOT next dev)
npm run dev:next         # next dev (no WebSocket/routine scheduler)

# Build & production
npm run build            # next build
npm run start            # node --import tsx server.ts

# Lint & test
npm run lint             # eslint
npm run test             # vitest run
npm run test:watch       # vitest (watch mode)

# Run a single test file
npx vitest run src/lib/__tests__/utils.test.ts

# Database
npm run setup-db         # ensure tables exist
npm run sync             # sync DB from gateway
npm run migrate-files    # migrate file-based tasks to DB

# Utilities
npm run report           # executive report
npm run export           # export bundle
```

## Architecture

### Custom Server (`server.ts`)

The app uses a custom Node HTTP server (not the default `next start`) to attach:
1. **WebSocket server** (`src/lib/ws-server.ts`) — real-time browser push on `/ws`
2. **Routine scheduler** (`src/lib/routine-scheduler.ts`) — cron-like scheduling engine

Always use `npm run dev` (not `npm run dev:next`) to get WebSocket and scheduler support.

### Dual Data Source Pattern

`src/lib/data-source.ts` checks `isDbAvailable()` and routes all data operations to either:
- `src/lib/db-data.ts` — PostgreSQL queries via `pg` pool (`src/lib/db.ts`)
- `src/lib/data.ts` — file-based JSON loader from `OPENCLAW_TASKS_DIR`

Every data function has a `*Unified()` wrapper that handles this routing. When adding new data operations, follow this pattern.

### Auth Flow

- `DASHBOARD_SECRET` or `JWT_SECRET` env var enables JWT auth (HS256, 24h, httpOnly cookie `oc_session`)
- No secret configured = open access (no auth required)
- `src/middleware.ts` protects all routes except `/login`, `/_next`, `/api/health`, `/api/auth`
- `src/lib/auth.ts` handles JWT sign/verify
- Rate limiting on `/api/auth/login` (5 attempts / 15 min / IP)

### API Route Split

Two sets of API routes serve different backends:
- `/api/gateway/*` — proxies to OpenClaw gateway via server-side WebSocket RPC (`src/lib/gateway-client.ts`)
- `/api/tasks`, `/api/notifications`, `/api/routines`, `/api/chat`, `/api/feed` — DB-backed CRUD

### Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json` and `vitest.config.ts`).

### DB Migrations

SQL migration files live in `scripts/migrations/` and are numbered sequentially (002–008). Run them in order with `psql`.

## Key Conventions

- **Environment**: all secrets/config via `.env.local` — never hardcode
- **Components**: React 19 with Tailwind CSS 3.4, Radix UI primitives, Framer Motion animations
- **Drag & drop**: dnd-kit for Kanban board (`MissionQueue.tsx` + `TaskCard.tsx`)
- **Types**: all TypeScript interfaces in `src/types/index.ts`
- **Tests**: colocated in `__tests__/` directories, Vitest with `@/` alias support
- **Lazy loading**: overlay components (modals, panels) use `next/dynamic` for code splitting
