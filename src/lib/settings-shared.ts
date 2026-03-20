// ── Accent Color Presets ────────────────────────────────────────────────
// Shared between server (settings.ts) and client components.
// This file has NO Node.js imports, so it is safe for client bundles.

export const ACCENT_PRESETS = {
  green:  { primary: '#46a758', primaryLight: 'rgba(70,167,88,0.1)',  glow: 'rgba(70,167,88,0.6)' },
  blue:   { primary: '#3e63dd', primaryLight: 'rgba(62,99,221,0.1)',  glow: 'rgba(62,99,221,0.6)' },
  purple: { primary: '#8e4ec6', primaryLight: 'rgba(142,78,198,0.1)', glow: 'rgba(142,78,198,0.6)' },
  orange: { primary: '#f76b15', primaryLight: 'rgba(247,107,21,0.1)', glow: 'rgba(247,107,21,0.6)' },
  red:    { primary: '#e54d2e', primaryLight: 'rgba(229,77,46,0.1)',  glow: 'rgba(229,77,46,0.6)' },
  cyan:   { primary: '#00a2c7', primaryLight: 'rgba(0,162,199,0.1)',  glow: 'rgba(0,162,199,0.6)' },
  amber:  { primary: '#ffb224', primaryLight: 'rgba(255,178,36,0.1)', glow: 'rgba(255,178,36,0.6)' },
  pink:   { primary: '#e879a4', primaryLight: 'rgba(232,121,164,0.1)', glow: 'rgba(232,121,164,0.6)' },
} as const;

export type AccentColor = keyof typeof ACCENT_PRESETS;
export type Theme = 'dark' | 'light';
export type CardDensity = 'compact' | 'comfortable';
export type TimeDisplay = 'utc' | 'local';
