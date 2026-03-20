import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Import client-safe constants and types from shared module, then re-export
import { ACCENT_PRESETS, type AccentColor, type Theme, type CardDensity, type TimeDisplay } from './settings-shared';
export { ACCENT_PRESETS, type AccentColor, type Theme, type CardDensity, type TimeDisplay };

// ── Settings Interface ──────────────────────────────────────────────────
export interface DashboardSettings {
  // Identity
  name: string;
  subtitle: string;
  repoUrl: string | null;
  logoIcon: string; // lucide icon name: "zap", "brain", "bot", "flame", "shield", etc.

  // Appearance
  theme: Theme;
  accentColor: AccentColor;
  backgroundGradient: {
    topLeft: string;     // CSS color for top-left glow
    bottomRight: string; // CSS color for bottom-right glow
  };

  // Layout
  cardDensity: CardDensity;
  showMetricsPanel: boolean;
  showTokenPanel: boolean;
  refreshInterval: number; // milliseconds

  // Time
  timeDisplay: TimeDisplay;

  // Agents (custom roster override)
  agents: Array<{
    id: string;
    name: string;
    letter: string;
    color: string;
    role: string;
    badge?: 'lead' | 'spc';
    description?: string;
    specialty?: string;
  }> | null; // null = use default roster
}

// ── Defaults ────────────────────────────────────────────────────────────
const DEFAULTS: DashboardSettings = {
  name: 'OpenClaw',
  subtitle: 'Mission Control',
  repoUrl: 'https://github.com/bokiko/openClaw-dashboard',
  logoIcon: 'zap',
  theme: 'dark',
  accentColor: 'green',
  backgroundGradient: {
    topLeft: 'rgba(70,167,88,0.05)',
    bottomRight: 'rgba(62,99,221,0.05)',
  },
  cardDensity: 'comfortable',
  showMetricsPanel: true,
  showTokenPanel: true,
  refreshInterval: 30000,
  timeDisplay: 'utc',
  agents: null,
};

// ── Load Settings ───────────────────────────────────────────────────────
let _cached: DashboardSettings | null = null;
let _cachedAt = 0;
const CACHE_TTL = 5000; // re-read file every 5s at most

/** @internal — test only */
export function _resetSettingsCache() { _cached = null; _cachedAt = 0; }

export function loadSettings(): DashboardSettings {
  const now = Date.now();
  if (_cached && (now - _cachedAt) < CACHE_TTL) return _cached;

  const settingsPath = join(process.cwd(), 'settings.json');

  if (!existsSync(settingsPath)) {
    _cached = { ...DEFAULTS };
    _cachedAt = now;
    return _cached;
  }

  try {
    const raw = JSON.parse(readFileSync(settingsPath, 'utf-8')) as Partial<DashboardSettings>;
    _cached = {
      name: typeof raw.name === 'string' ? raw.name : DEFAULTS.name,
      subtitle: typeof raw.subtitle === 'string' ? raw.subtitle : DEFAULTS.subtitle,
      repoUrl: typeof raw.repoUrl === 'string' ? raw.repoUrl : DEFAULTS.repoUrl,
      logoIcon: typeof raw.logoIcon === 'string' ? raw.logoIcon : DEFAULTS.logoIcon,
      theme: raw.theme === 'light' ? 'light' : 'dark',
      accentColor: (raw.accentColor && raw.accentColor in ACCENT_PRESETS) ? raw.accentColor : DEFAULTS.accentColor,
      backgroundGradient: {
        topLeft: typeof raw.backgroundGradient?.topLeft === 'string' ? raw.backgroundGradient.topLeft : DEFAULTS.backgroundGradient.topLeft,
        bottomRight: typeof raw.backgroundGradient?.bottomRight === 'string' ? raw.backgroundGradient.bottomRight : DEFAULTS.backgroundGradient.bottomRight,
      },
      cardDensity: raw.cardDensity === 'compact' ? 'compact' : 'comfortable',
      showMetricsPanel: raw.showMetricsPanel !== false,
      showTokenPanel: raw.showTokenPanel !== false,
      refreshInterval: typeof raw.refreshInterval === 'number' && raw.refreshInterval >= 5000 ? raw.refreshInterval : DEFAULTS.refreshInterval,
      timeDisplay: raw.timeDisplay === 'local' ? 'local' : 'utc',
      agents: Array.isArray(raw.agents) ? raw.agents : null,
    };
    _cachedAt = now;
    return _cached;
  } catch {
    _cached = { ...DEFAULTS };
    _cachedAt = now;
    return _cached;
  }
}
