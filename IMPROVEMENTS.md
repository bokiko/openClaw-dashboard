
## 2026-03-17 — Testing: Comprehensive unit tests for utils.ts

Added 24 unit tests covering all exported functions in `src/lib/utils.ts`, which had zero prior test coverage. Tests use vitest fake timers for deterministic `timeAgo` assertions and verify UTC-correctness for `formatUTC`. Functions covered: `cn`, `timeAgo`, `formatNumber`, `formatTokens`, `formatUTC`.

**Files changed:** `src/lib/__tests__/utils.test.ts` (new)
**Lines:** +160 / -0
