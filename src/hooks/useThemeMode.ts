import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'default' | 'high-contrast-light' | 'high-contrast-dark' | 'yellow-black';

export const useThemeMode = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme-mode');
    return (stored as ThemeMode) || 'default';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('high-contrast-light', 'high-contrast-dark', 'yellow-black');
    
    // Apply selected theme
    if (themeMode !== 'default') {
      root.classList.add(themeMode);
    }
    
    // Save to localStorage
    localStorage.setItem('theme-mode', themeMode);
  }, [themeMode]);

  const cycleTheme = useCallback(() => {
    const modes: ThemeMode[] = ['default', 'high-contrast-light', 'high-contrast-dark', 'yellow-black'];
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
    return modes[nextIndex];
  }, [themeMode]);

  const getThemeName = useCallback((mode: ThemeMode): string => {
    switch (mode) {
      case 'high-contrast-light': return 'High Contrast Light';
      case 'high-contrast-dark': return 'High Contrast Dark';
      case 'yellow-black': return 'Yellow on Black';
      default: return 'Default Theme';
    }
  }, []);

  return {
    themeMode,
    setThemeMode,
    cycleTheme,
    themeName: getThemeName(themeMode)
  };
};
