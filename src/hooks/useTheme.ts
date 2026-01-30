import { useState, useEffect, useCallback } from 'react';
import type { ThemeName } from '@/types';

const THEME_STORAGE_KEY = 'rendmd-theme';
const DEFAULT_THEME: ThemeName = 'dark-basic';

export interface UseThemeReturn {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleDarkLight: () => void;
  isDark: boolean;
}

/**
 * Hook for managing the application theme.
 * Persists to localStorage and applies CSS class to document root.
 */
export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isValidTheme(stored)) {
      return stored as ThemeName;
    }
    return DEFAULT_THEME;
  });

  const isDark = theme.startsWith('dark');

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('dark-basic', 'light-basic', 'dark-glass', 'light-glass');
    
    // Add current theme class
    root.classList.add(theme);
    
    // Persist to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeName) => {
    setThemeState(newTheme);
  }, []);

  const toggleDarkLight = useCallback(() => {
    setThemeState((current) => {
      const isGlass = current.includes('glass');
      const isDarkNow = current.startsWith('dark');
      
      if (isGlass) {
        return isDarkNow ? 'light-glass' : 'dark-glass';
      }
      return isDarkNow ? 'light-basic' : 'dark-basic';
    });
  }, []);

  return { theme, setTheme, toggleDarkLight, isDark };
}

function isValidTheme(value: string): value is ThemeName {
  return ['dark-basic', 'light-basic', 'dark-glass', 'light-glass'].includes(value);
}
