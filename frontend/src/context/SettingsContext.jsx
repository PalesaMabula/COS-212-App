import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { load, save } from '../hooks/storage';

// Every option on the Settings screen lives here, so any page can read it.
// Saved to localStorage under "cos212-settings" (no login, guest use).
export const DEFAULT_SETTINGS = {
  // Reading
  size: 1, // index into textSizes: 0 small, 1 medium, 2 large, 3 extra large
  font: 'work', // work | lexend | atkinson
  spacing: 'normal', // normal | wide
  // Seeing and motion
  theme: 'dark', // dark | light | contrast
  speedA: 'normal', // slow | normal | step (animations only advance on Next)
  still: false, // reduce motion
  solar: true, // solar system background
  // Listening and speaking
  rate: 1, // read-aloud voice speed
  autoRead: false,
  mic: true, // voice answers
  captions: true,
  sound: false, // "hear the ripple"
  // Tracking and language
  trackOn: true,
  lang: 'off', // off | zu | st | af | tn
};

const KEY = 'cos212-settings';
const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...load(KEY, {}) }));

  useEffect(() => save(KEY, settings), [settings]);

  // data-theme lets components add small theme-specific tweaks; theme-color tints the browser chrome.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', settings.theme === 'light' ? '#faf9f6' : settings.theme === 'contrast' ? '#000000' : '#0e0e10');
  }, [settings.theme]);

  const set = useCallback((key, value) => setSettings((s) => ({ ...s, [key]: value })), []);
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);
  const toggleTheme = useCallback(
    () => setSettings((s) => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' })),
    []
  );

  const value = useMemo(() => ({ settings, set, reset, toggleTheme }), [settings, set, reset, toggleTheme]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
