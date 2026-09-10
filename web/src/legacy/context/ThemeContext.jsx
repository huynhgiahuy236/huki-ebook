import React, { createContext, useContext, useState, useEffect } from 'react';

export const COLOR_PALETTES = [
  {
    id: 'huki-original',
    name: 'HUKI Original',
    description: 'Thương hiệu HUKI cổ điển & Tri thức số',
    colors: {
      background: '#F2FBF9',
      surface: '#FFFFFF',
      secondary: '#006953',
      primary: '#003B2B'
    }
  },
  {
    id: 'sakura',
    name: 'Sakura',
    description: 'Hồng phấn hoa anh đào dịu êm & Thư thái',
    colors: {
      background: '#FCF8F8',
      surface: '#FBEFEF',
      secondary: '#F9DFDF',
      primary: '#F5AFAF'
    }
  },
  {
    id: 'japanese-warm',
    name: 'Japanese Warm',
    description: 'Trang giấy ấm & Không gian thư viện Nhật',
    colors: {
      background: '#FBF8F1',
      surface: '#F5EFE0',
      secondary: '#E8DCB8',
      primary: '#5C4033'
    }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Biển xanh tĩnh lặng & Thư giãn tinh thần',
    colors: {
      background: '#F0F7FB',
      surface: '#E3F0F8',
      secondary: '#BAE0F3',
      primary: '#1A537E'
    }
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Rừng thông yên tĩnh & Đọc sách chữa lành',
    colors: {
      background: '#F4F7F4',
      surface: '#EBF1EB',
      secondary: '#C8DBC8',
      primary: '#2D5A3F'
    }
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'Oải hương mộng mơ & Nguồn cảm hứng',
    colors: {
      background: '#F8F6FC',
      surface: '#F0EBF8',
      secondary: '#DDD2F0',
      primary: '#5A3D7A'
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Hoàng hôn rực rỡ & Khơi nguồn năng lượng',
    colors: {
      background: '#FDF6F0',
      surface: '#FBEDE2',
      secondary: '#F9D6BE',
      primary: '#B84E20'
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Đêm sâu huyền bí & Tập trung tối đa',
    colors: {
      background: '#0B1120',
      surface: '#1E293B',
      secondary: '#334155',
      primary: '#38BDF8'
    }
  }
];

const ThemeContext = createContext({
  theme: 'huki-original',
  setTheme: () => {},
  isDarkMode: false,
  toggleDarkMode: () => {},
  palettes: COLOR_PALETTES,
  currentPalette: COLOR_PALETTES[0]
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('huki_color_theme') || 'huki-original';
    } catch {
      return 'huki-original';
    }
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('huki_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  const currentPalette = COLOR_PALETTES.find(p => p.id === theme) || COLOR_PALETTES[0];

  const setTheme = (paletteId) => {
    const valid = COLOR_PALETTES.some(p => p.id === paletteId);
    const target = valid ? paletteId : 'huki-original';
    setThemeState(target);
    try {
      localStorage.setItem('huki_color_theme', target);
    } catch (e) {
      console.warn('Could not persist theme to localStorage', e);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('huki_dark_mode', String(next));
      } catch (e) {
        console.warn('Could not persist dark mode to localStorage', e);
      }
      return next;
    });
  };

  // Synchronize with documentElement
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, isDarkMode]);

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
