'use client';

import { useState, useCallback } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light')
      ? 'light'
      : 'dark'
  );

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.replace(`theme-${theme}`, `theme-${next}`);
    localStorage.setItem('theme', next);
    setTheme(next);
  }, [theme]);

  return { theme, toggle };
}
