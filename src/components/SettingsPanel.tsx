'use client';

import { motion } from 'framer-motion';
import { X, Settings, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCENT_PRESETS, type AccentColor } from '@/lib/settings-shared';
import { useSettings } from '@/lib/useSettings';
import { useTheme } from '@/lib/useTheme';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const ACCENT_COLORS = Object.keys(ACCENT_PRESETS) as AccentColor[];

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { accentColor, cardDensity, timeDisplay, setAccentColor, setCardDensity, setTimeDisplay } = useSettings();
  const { theme, toggle: toggleTheme } = useTheme();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Display Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-6">

          {/* Accent Color */}
          <section>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Accent Color</h3>
            <div className="grid grid-cols-4 gap-2">
              {ACCENT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setAccentColor(color)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all duration-200",
                    "hover:bg-secondary/50",
                    accentColor === color
                      ? "bg-secondary ring-1 ring-border"
                      : "bg-transparent"
                  )}
                  aria-label={`Set accent color to ${color}`}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform",
                      accentColor === color ? "scale-110 border-foreground/30" : "border-transparent"
                    )}
                    style={{ backgroundColor: ACCENT_PRESETS[color].primary }}
                  />
                  <span className="text-[10px] text-muted-foreground capitalize">{color}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Card Density */}
          <section>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Card Density</h3>
            <div className="flex gap-2">
              {(['compact', 'comfortable'] as const).map(density => (
                <button
                  key={density}
                  onClick={() => setCardDensity(density)}
                  className={cn(
                    "flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200",
                    cardDensity === density
                      ? "bg-secondary text-foreground ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {density.charAt(0).toUpperCase() + density.slice(1)}
                </button>
              ))}
            </div>
          </section>

          {/* Time Display */}
          <section>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Time Display</h3>
            <div className="flex gap-2">
              {(['utc', 'local'] as const).map(display => (
                <button
                  key={display}
                  onClick={() => setTimeDisplay(display)}
                  className={cn(
                    "flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200",
                    timeDisplay === display
                      ? "bg-secondary text-foreground ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {display === 'utc' ? 'UTC' : 'Local'}
                </button>
              ))}
            </div>
          </section>

          {/* Theme */}
          <section>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Theme</h3>
            <button
              onClick={toggleTheme}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200",
                "bg-secondary/50 hover:bg-secondary border border-border/50"
              )}
            >
              <div className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
                <span className="text-xs font-medium text-foreground capitalize">{theme}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Click to toggle</span>
            </button>
          </section>

        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-5 py-3 bg-background/50">
          <span className="text-[10px] text-muted-foreground">Settings saved to browser</span>
        </div>
      </motion.aside>
    </>
  );
}
