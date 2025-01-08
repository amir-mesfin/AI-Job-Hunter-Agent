'use client';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isPaper = theme === 'paper';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${className}`}
      aria-label={isPaper ? 'Switch to Ink theme' : 'Switch to Paper theme'}
      title={isPaper ? 'Ink desk' : 'Paper atelier'}
    >
      <span className={`theme-toggle-knob ${isPaper ? 'is-paper' : 'is-ink'}`} />
      <span className="theme-toggle-label">{isPaper ? 'Paper' : 'Ink'}</span>
    </button>
  );
}
