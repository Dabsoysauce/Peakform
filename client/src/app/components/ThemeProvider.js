'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const THEME_PRESETS = {
  orange: { primary: '#e85d04', light: '#f97316', rgb: '232,93,4', lightRgb: '249,115,22' },
  blue: { primary: '#3b82f6', light: '#60a5fa', rgb: '59,130,246', lightRgb: '96,165,250' },
  green: { primary: '#22c55e', light: '#4ade80', rgb: '34,197,94', lightRgb: '74,222,128' },
  red: { primary: '#ef4444', light: '#f87171', rgb: '239,68,68', lightRgb: '248,113,113' },
  purple: { primary: '#8b5cf6', light: '#a78bfa', rgb: '139,92,246', lightRgb: '167,139,250' },
  pink: { primary: '#ec4899', light: '#f472b6', rgb: '236,72,153', lightRgb: '244,114,182' },
  cyan: { primary: '#06b6d4', light: '#22d3ee', rgb: '6,182,212', lightRgb: '34,211,238' },
  yellow: { primary: '#eab308', light: '#facc15', rgb: '234,179,8', lightRgb: '250,204,21' },
};

export const ThemeContext = createContext(null);

function applyThemeToDOM(themeName) {
  const colors = THEME_PRESETS[themeName];
  if (!colors) return;

  const root = document.documentElement;
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--primary-light', colors.light);
  root.style.setProperty('--primary-rgb', colors.rgb);
  root.style.setProperty('--primary-light-rgb', colors.lightRgb);
  root.style.setProperty('--primary-glow', `rgba(${colors.rgb}, 0.4)`);
  root.style.setProperty('--aurora-1', `rgba(${colors.rgb}, 0.08)`);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('orange');

  useEffect(() => {
    const stored = localStorage.getItem('theme-color');
    const initial = stored && THEME_PRESETS[stored] ? stored : 'orange';
    setThemeState(initial);
    applyThemeToDOM(initial);
  }, []);

  const setTheme = useCallback((themeName) => {
    if (!THEME_PRESETS[themeName]) return;
    setThemeState(themeName);
    localStorage.setItem('theme-color', themeName);
    applyThemeToDOM(themeName);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEME_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
