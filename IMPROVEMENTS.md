## 2026-03-20 — Code Quality: Consolidate duplicate timeAgo implementations

Removed 5 local copies of `timeAgo` scattered across components (ChannelMonitor, CronJobsPanel, NotificationPanel, RoutineManager, SpawnedSessionRow). Extended the canonical `timeAgo()` in `src/lib/utils.ts` to accept `number | string | undefined` so all call sites work without adapters. Also removed a duplicate `formatTokens` from SpawnedSessionRow. All 79 tests pass, build clean.
**Files changed:** src/lib/utils.ts, src/components/ChannelMonitor.tsx, src/components/CronJobsPanel.tsx, src/components/NotificationPanel.tsx, src/components/RoutineManager.tsx, src/components/SpawnedSessionRow.tsx
**Lines:** +14 / -53

## 2026-03-18 — Accessibility: ARIA labels, keyboard nav, screen reader support

Added meaningful accessibility attributes across 5 core interactive components.
TaskCard: role=article, aria-label, tabIndex, keyboard (Enter/Space) activation.
NotificationPanel: aria-live=polite, role=list/listitem, icon button aria-labels.
MissionQueue: search input aria-label, filter row role=tablist/tab with aria-selected.
Header: aria-current=page on active nav, aria-label on icon-only buttons.
AgentAvatar: aria-label with agent name + status for screen readers.
No visual changes, no new dependencies.
**Files changed:** TaskCard.tsx, NotificationPanel.tsx, MissionQueue.tsx, Header.tsx, AgentAvatar.tsx
**Lines:** +33 / -8

## 2026-03-18 — Testing: Unit tests for utils and activity-mappers

Added comprehensive unit test suites for two previously untested modules.
`utils.ts` (cn, timeAgo, formatNumber, formatTokens, formatUTC) and
`activity-mappers.ts` (buildWorkItems — all item types, status mapping, sort order).
Total test count grew from 41 to 79 (+38 tests, 0 regressions).

**Files changed:** src/lib/__tests__/utils.test.ts, src/lib/__tests__/activity-mappers.test.ts
**Lines:** +399 / -0

## 2026-03-17 — New Feature: Inline run history per cron job

Added inline expandable run history to cron job cards in RoutineManager.
Clicking a cron job row reveals the last N runs (status, duration, timestamp)
fetched from /api/cron/runs without leaving the page.

## 2026-03-16 — Bug Fix: Wire Header search button + CommandPalette

Fixed the search button in the Header not opening the CommandPalette.
Wired the Header's magnifier icon to the existing CommandPalette toggle.

## 2026-03-15 — New Feature: Real-time task search in MissionQueue

Added ⌘F shortcut and search bar to MissionQueue for instant client-side
task filtering by title, tags, and assignee across all lanes.

## 2026-03-18 — Performance: Lazy-load overlay components with next/dynamic

Replaced static imports for 9 modal/drawer/overlay components with `next/dynamic({ ssr: false })`.
These components only render on user interaction (clicks, keyboard shortcuts), so their JS
does not need to be in the initial bundle. Deferring them reduces the JS parsed on first load,
improving TTI on slower devices and connections.

Components now lazy-loaded: LiveFeed, NotificationPanel, TaskEditModal, TaskCreateModal,
AgentModal, RoutineManager, CommandPalette, KeyboardShortcutsDialog, ChatPanel.

Header, AgentStrip, MissionQueue, MetricsPanel, CronJobsPanel remain statically imported
as they render on every page load.

**Files changed:** src/app/page.tsx
**Lines:** +21 / -10

## 2026-03-20 — UI/UX: Unified EmptyState component across dashboard panels

Added a reusable `EmptyState` component and applied it consistently across 5 locations that previously had minimal or inconsistent empty state treatment. NotificationPanel now shows a Bell icon + "All clear" instead of bare text. LiveFeed shows Activity icon + description. MissionQueue grid and kanban lanes use compact variants with contextual icons. AgentStrip now has a proper empty state (Users icon + "No agents connected") where previously there was nothing at all. All variants use framer-motion fade-in and design system CSS vars.
**Files changed:** src/components/EmptyState.tsx (new), AgentStrip.tsx, LiveFeed.tsx, MissionQueue.tsx, NotificationPanel.tsx
**Lines:** +137 / -38

## 2026-03-20 — New Feature: Connection status badge in header

Replaced the fixed bottom-right 6px connection dot with a proper ConnectionStatusBadge component integrated into the Header toolbar. Three states: connected (accent pulse dot + relative time), refreshing (spinner), error (red WifiOff + retry). Relative time updates every 5s. Clicking the badge triggers a manual refresh. Removed duplicate bottom-right indicators from both pages.
**Files changed:** src/components/ConnectionStatusBadge.tsx (new), Header.tsx, page.tsx, activity/page.tsx
**Lines:** +155 / -16
