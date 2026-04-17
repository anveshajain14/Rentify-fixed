'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'luxerent-theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const next = stored || (prefersDark ? 'dark' : 'light');
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        document.documentElement.classList.toggle('dark', next === 'dark');
        window.localStorage.setItem(STORAGE_KEY, next);
      }
      return next;
    });
  };

  if (theme === null) return <div className="w-10 h-10" aria-hidden="true" />;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2.5 rounded-xl hover:bg-secondary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
    >
      {theme === 'dark' ? (
        <Sun size={18} className="text-amber-400" />
      ) : (
        <Moon size={18} className="text-muted-foreground" />
      )}
    </button>
  );
}

