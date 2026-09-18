import { useReader, FONT_FAMILIES } from '../ui/context/ReaderContext';

export interface ReaderSettings {
  theme: string;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  margin: 'compact' | 'normal' | 'wide';
  isSettingsOpen: boolean;
}

export function useReaderSettings() {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    changeFontSize,
    fontFamily,
    setFontFamily,
    lineHeight,
    setLineHeight,
    margin,
    setMargin,
    isSettingsOpen,
    setIsSettingsOpen,
  } = useReader();

  const resetToDefault = () => {
    setTheme('dark');
    setFontSize(18);
    setFontFamily('Literata, Georgia, serif');
    setLineHeight(1.6);
    setMargin('normal');
  };

  return {
    // Current settings state
    settings: {
      theme,
      fontSize,
      fontFamily,
      lineHeight,
      margin,
      isSettingsOpen,
    },
    // Setters
    setTheme,
    setFontSize,
    changeFontSize,
    setFontFamily,
    setLineHeight,
    setMargin,
    setIsSettingsOpen,
    toggleSettings: () => setIsSettingsOpen(!isSettingsOpen),
    resetToDefault,
    // Constants
    fontFamilies: FONT_FAMILIES,
    fontSizes: [12, 13, 14, 15, 16, 18, 20, 22, 24],
    lineHeights: [1.4, 1.6, 1.8],
    margins: [
      { id: 'compact', label: 'Hẹp (Compact)' },
      { id: 'normal', label: 'Chuẩn (Normal)' },
      { id: 'wide', label: 'Rộng (Wide)' },
    ],
    themes: [
      { id: 'dark', label: 'Tối (Dark)', bg: '#121212', text: '#f3f4f6' },
      { id: 'sepia', label: 'Sepia', bg: '#f4ecd8', text: '#3f392f' },
      { id: 'warm', label: 'Ấm (Warm)', bg: '#fdfbf7', text: '#1f2937' },
      { id: 'light', label: 'Sáng (Light)', bg: '#ffffff', text: '#111827' },
    ],
  };
}
