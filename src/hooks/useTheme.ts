"use client";
import { useState, useEffect } from 'react';
import { StakingTheme, defaultStakingTheme } from '@/schemas/staking';

export const useTheme = () => {
  const [theme, setTheme] = useState<StakingTheme>(defaultStakingTheme);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Check for system theme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    // Listen for theme changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Update theme based on dark mode
  useEffect(() => {
    if (isDarkMode) {
      setTheme({
        ...defaultStakingTheme,
        colors: {
          ...defaultStakingTheme.colors,
          background: 'linear-gradient(135deg, #0c141f 0%, #1a1a2e 100%)',
          surface: 'rgba(0, 0, 0, 0.3)',
          text: '#ffffff',
          textSecondary: '#cccccc',
        }
      });
    } else {
      setTheme({
        ...defaultStakingTheme,
        colors: {
          ...defaultStakingTheme.colors,
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          surface: 'rgba(255, 255, 255, 0.8)',
          text: '#1a202c',
          textSecondary: '#4a5568',
        }
      });
    }
  }, [isDarkMode]);

  return {
    theme,
    isDarkMode,
    setTheme,
    toggleDarkMode: () => setIsDarkMode(!isDarkMode)
  };
};
