'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface PaletteColor {
  background: string;
  surface: string;
  secondary: string;
  primary: string;
}

export interface Palette {
  id: string;
  name: string;
  description: string;
  colors: PaletteColor;
}

// Brand Fixed Theme: Xanh lá HUKI Nguyên bản (#003B2B)
export const COLOR_PALETTES: Palette[] = [
  {
    id: 'huki-original',
    name: 'HUKI Original (Xanh Lá)',
    description: 'Thương hiệu HUKI xanh lá tri thức số',
    colors: {
      background: '#F2FBF9',
      surface: '#FFFFFF',
      secondary: '#006953',
      primary: '#003B2B'
    }
  }
];

interface ThemeContextType {
  theme: string;
  setTheme: (paletteId: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  palettes: Palette[];
  currentPalette: Palette;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'huki-original',
  setTheme: () => {},
  isDarkMode: false,
  toggleDarkMode: () => {},
  palettes: COLOR_PALETTES,
  currentPalette: COLOR_PALETTES[0]
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme] = useState<string>('huki-original');
  const isDarkMode = false;

  const currentPalette = COLOR_PALETTES[0];

  const setTheme = (_paletteId: string) => {
    // Theme selection is disabled - permanently locked to HUKI Original Green
  };

  const toggleDarkMode = () => {
    // Dark mode is permanently disabled
  };

  // Synchronize CSS variables and lock HUKI Original Green brand theme
  useEffect(() => {
    try {
      localStorage.setItem('huki_color_theme', 'huki-original');
      localStorage.removeItem('huki_dark_mode');
    } catch {
      // ignore
    }

    const root = document.documentElement;
    root.setAttribute('data-theme', 'huki-original');
    root.classList.remove('dark');

    // Bind primary brand green tokens
    root.style.setProperty('--theme-primary', '#003B2B');
    root.style.setProperty('--theme-secondary', '#006953');
    root.style.setProperty('--theme-secondary-subtle', '#F2FBF9');
    root.style.setProperty('--theme-accent', '#AC2C19');
    root.style.setProperty('--theme-header-bg', '#003B2B');
    root.style.setProperty('--theme-header-accent', '#94F5D6');
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDarkMode,
        toggleDarkMode,
        palettes: COLOR_PALETTES,
        currentPalette
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
