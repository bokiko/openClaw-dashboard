'use client';

import { useState, useCallback, useEffect } from 'react';
import { ACCENT_PRESETS, type AccentColor, type CardDensity, type TimeDisplay } from '@/lib/settings-shared';

const STORAGE_KEYS = {
  accentColor: 'settings.accentColor',
  cardDensity: 'settings.cardDensity',
  timeDisplay: 'settings.timeDisplay',
} as const;

const DEFAULTS = {
  accentColor: 'green' as AccentColor,
  cardDensity: 'comfortable' as CardDensity,
  timeDisplay: 'utc' as TimeDisplay,
};

function readStorage<T extends string>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const v = localStorage.getItem(key);
  return (v as T) || fallback;
}

function applyAccentColor(color: AccentColor) {
  const preset = ACCENT_PRESETS[color];
  if (!preset) return;
  const s = document.documentElement.style;
  s.setProperty('--accent-primary', preset.primary);
  s.setProperty('--accent-primary-light', preset.primaryLight);
  s.setProperty('--accent-glow', preset.glow);
}

function applyCardDensity(density: CardDensity) {
  if (density === 'compact') {
    document.documentElement.classList.add('density-compact');
  } else {
    document.documentElement.classList.remove('density-compact');
  }
}

export function useSettings() {
  const [accentColor, setAccentColorState] = useState<AccentColor>(() =>
    readStorage(STORAGE_KEYS.accentColor, DEFAULTS.accentColor)
  );
  const [cardDensity, setCardDensityState] = useState<CardDensity>(() =>
    readStorage(STORAGE_KEYS.cardDensity, DEFAULTS.cardDensity)
  );
  const [timeDisplay, setTimeDisplayState] = useState<TimeDisplay>(() =>
    readStorage(STORAGE_KEYS.timeDisplay, DEFAULTS.timeDisplay)
  );

  // Apply saved settings on mount
  useEffect(() => {
    applyAccentColor(accentColor);
    applyCardDensity(cardDensity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAccentColor = useCallback((color: AccentColor) => {
    setAccentColorState(color);
    localStorage.setItem(STORAGE_KEYS.accentColor, color);
    applyAccentColor(color);
  }, []);

  const setCardDensity = useCallback((density: CardDensity) => {
    setCardDensityState(density);
    localStorage.setItem(STORAGE_KEYS.cardDensity, density);
    applyCardDensity(density);
  }, []);

  const setTimeDisplay = useCallback((display: TimeDisplay) => {
    setTimeDisplayState(display);
    localStorage.setItem(STORAGE_KEYS.timeDisplay, display);
  }, []);

  return { accentColor, cardDensity, timeDisplay, setAccentColor, setCardDensity, setTimeDisplay };
}
