'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

/** Paper = warm daylight atelier · Ink = deep forest night desk */
export type Theme = 'paper' | 'ink';

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizeTheme(value: string | null): Theme {
  if (value === 'ink' || value === 'dark') return 'ink';
  return 'paper';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('paper');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('ajh-theme') : null;
    const preferred = normalizeTheme(stored);
    setThemeState(preferred);
    document.documentElement.setAttribute('data-theme', preferred);
    setReady(true);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('ajh-theme', t);
    document.documentElement.setAttribute('data-theme', t);
  };

  const toggleTheme = () => setTheme(theme === 'paper' ? 'ink' : 'paper');

  if (!ready) {
    return <div className="min-h-screen" style={{ background: '#f2ebe0' }} />;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
