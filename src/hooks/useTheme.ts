import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

/**
 * React hook for managing theme system
 */
export function useTheme() {
  const { theme, setTheme } = useAppStore();

  /**
   * Apply theme to document
   */
  useEffect(() => {
    const root = document.documentElement;

    // Remove existing theme attributes
    root.removeAttribute('data-theme');

    if (theme === 'system') {
      // Detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.setAttribute('data-theme', 'light');
      }
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  /**
   * Listen for system theme changes when in system mode
   */
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.setAttribute('data-theme', 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme]);

  /**
   * Get current effective theme (resolves 'system' to 'light' or 'dark')
   */
  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  };

  return {
    theme,
    setTheme,
    effectiveTheme: getEffectiveTheme(),
  };
}
