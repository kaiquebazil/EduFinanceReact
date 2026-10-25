import { useColorScheme } from 'react-native';
import type { ThemeId, ColorMode } from '../lib/types';

export interface ThemePalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  gradientStart: string;
  gradientEnd: string;
}

export interface AppTheme {
  palette: ThemePalette;
  colors: {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    muted: string;
    mutedLight: string;
    border: string;
    borderLight: string;
    income: string;
    expense: string;
    warn: string;
    danger: string;
  };
  isDark: boolean;
}

export const palettes: Record<ThemeId, ThemePalette> = {
  default: {
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#1d4ed8',
    accent: '#2563eb',
    gradientStart: '#3b82f6',
    gradientEnd: '#1d4ed8',
  },
  orange: {
    primary: '#f97316',
    primaryLight: '#fb923c',
    primaryDark: '#ea580c',
    accent: '#ea580c',
    gradientStart: '#fb923c',
    gradientEnd: '#ea580c',
  },
  blue: {
    primary: '#06b6d4',
    primaryLight: '#22d3ee',
    primaryDark: '#0891b2',
    accent: '#0891b2',
    gradientStart: '#22d3ee',
    gradientEnd: '#0891b2',
  },
  green: {
    primary: '#10b981',
    primaryLight: '#34d399',
    primaryDark: '#059669',
    accent: '#059669',
    gradientStart: '#34d399',
    gradientEnd: '#059669',
  },
  pink: {
    primary: '#ec4899',
    primaryLight: '#f472b6',
    primaryDark: '#db2777',
    accent: '#db2777',
    gradientStart: '#f472b6',
    gradientEnd: '#db2777',
  },
  purple: {
    primary: '#a855f7',
    primaryLight: '#c084fc',
    primaryDark: '#9333ea',
    accent: '#9333ea',
    gradientStart: '#c084fc',
    gradientEnd: '#9333ea',
  },
};

const lightColors = {
  background: '#f0f4fa',
  card: '#ffffff',
  text: '#0f172a',
  textSecondary: '#334155',
  muted: '#64748b',
  mutedLight: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  income: '#10b981',
  expense: '#f43f5e',
  warn: '#f59e0b',
  danger: '#dc2626',
};

const darkColors = {
  background: '#111827',
  card: '#1f2937',
  text: '#f1f5f9',
  textSecondary: '#cbd5e1',
  muted: '#cbd5e1',
  mutedLight: '#94a3b8',
  border: '#334155',
  borderLight: '#273449',
  income: '#10b981',
  expense: '#f43f5e',
  warn: '#f59e0b',
  danger: '#dc2626',
};

export function getTheme(themeId: ThemeId, colorMode: ColorMode, systemScheme: 'light' | 'dark' | null | undefined): AppTheme {
  const isDark = colorMode === 'dark' || (colorMode === 'system' && systemScheme === 'dark');
  return {
    palette: palettes[themeId] ?? palettes.default,
    colors: isDark ? darkColors : lightColors,
    isDark,
  };
}

export const heatColors: Record<string, string> = {
  'heat-0': '#facc15',
  'heat-1': '#ca8a04',
  'heat-2': '#fb923c',
  'heat-3': '#ea580c',
  'heat-4': '#dc2626',
};
