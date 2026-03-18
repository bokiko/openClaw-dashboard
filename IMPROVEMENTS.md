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
