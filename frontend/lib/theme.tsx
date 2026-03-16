"use client";
// lib/theme.tsx — Theme context, all color schemes, dark mode support

import React, { createContext, useContext, useEffect, useState } from "react";

// ── Color scheme definitions ──────────────────────────────────

export type SchemeName =
  | "sage"        // default green
  | "ocean"       // blues
  | "crimson"     // reds
  | "amber"       // warm oranges/yellows
  | "violet"      // purples
  | "slate"       // neutral grays
  | "colorblind"  // deuteranopia-safe (blue/orange)
  | "highcontrast"; // WCAG AAA black/white

export interface ColorScheme {
  name: SchemeName;
  label: string;
  description: string;
  swatch: string; // preview color
  light: ThemeTokens;
  dark: ThemeTokens;
}

export interface ThemeTokens {
  bg:           string;
  bgSubtle:     string;
  surface:      string;
  surfaceRaised:string;
  border:       string;
  borderStrong: string;
  text:         string;
  textMuted:    string;
  textSubtle:   string;
  accent:       string;
  accentHover:  string;
  accentLight:  string;
  accentText:   string; // text on accent bg
  warn:         string;
  danger:       string;
  navActive:    string;
  navActiveBg:  string;
  navActiveText:string;
}

export const COLOR_SCHEMES: ColorScheme[] = [
  // ── Sage (default) ───────────────────────────────────────────
  {
    name: "sage",
    label: "Sage",
    description: "Calming natural greens",
    swatch: "#426542",
    light: {
      bg: "#fafaf9", bgSubtle: "#f4f7f4", surface: "#ffffff",
      surfaceRaised: "#ffffff", border: "#e7e5e4", borderStrong: "#a5bfa5",
      text: "#1c1917", textMuted: "#78716c", textSubtle: "#a8a29e",
      accent: "#426542", accentHover: "#365136", accentLight: "#e6ede6",
      accentText: "#ffffff", warn: "#d97706", danger: "#e11d48",
      navActive: "#426542", navActiveBg: "#e6ede6", navActiveText: "#2c422c",
    },
    dark: {
      bg: "#111d11", bgSubtle: "#162016", surface: "#1e2a1e",
      surfaceRaised: "#253725", border: "#2c422c", borderStrong: "#426542",
      text: "#e6ede6", textMuted: "#a5bfa5", textSubtle: "#779e77",
      accent: "#77a877", accentHover: "#8fbc8f", accentLight: "#253725",
      accentText: "#111d11", warn: "#fbbf24", danger: "#fb7185",
      navActive: "#77a877", navActiveBg: "#253725", navActiveText: "#ccdacc",
    },
  },

  // ── Ocean ─────────────────────────────────────────────────────
  {
    name: "ocean",
    label: "Ocean",
    description: "Cool, focused blues",
    swatch: "#1d4ed8",
    light: {
      bg: "#f8faff", bgSubtle: "#eff6ff", surface: "#ffffff",
      surfaceRaised: "#ffffff", border: "#dbeafe", borderStrong: "#93c5fd",
      text: "#0f172a", textMuted: "#475569", textSubtle: "#94a3b8",
      accent: "#1d4ed8", accentHover: "#1e40af", accentLight: "#dbeafe",
      accentText: "#ffffff", warn: "#d97706", danger: "#e11d48",
      navActive: "#1d4ed8", navActiveBg: "#dbeafe", navActiveText: "#1e3a8a",
    },
    dark: {
      bg: "#060d1a", bgSubtle: "#0a1628", surface: "#0f1f3d",
      surfaceRaised: "#152848", border: "#1e3a5f", borderStrong: "#1d4ed8",
      text: "#e0eaff", textMuted: "#93c5fd", textSubtle: "#60a5fa",
      accent: "#60a5fa", accentHover: "#93c5fd", accentLight: "#152848",
      accentText: "#060d1a", warn: "#fbbf24", danger: "#fb7185",
      navActive: "#60a5fa", navActiveBg: "#152848", navActiveText: "#bfdbfe",
    },
  },

  // ── Crimson ───────────────────────────────────────────────────
  {
    name: "crimson",
    label: "Crimson",
    description: "Warm, energetic reds",
    swatch: "#b91c1c",
    light: {
      bg: "#fff9f9", bgSubtle: "#fff1f2", surface: "#ffffff",
      surfaceRaised: "#ffffff", border: "#fecdd3", borderStrong: "#fca5a5",
      text: "#1c0a0a", textMuted: "#7c3030", textSubtle: "#b07070",
      accent: "#b91c1c", accentHover: "#991b1b", accentLight: "#ffe4e6",
      accentText: "#ffffff", warn: "#d97706", danger: "#7c3aed",
      navActive: "#b91c1c", navActiveBg: "#ffe4e6", navActiveText: "#7f1d1d",
    },
    dark: {
      bg: "#1a0808", bgSubtle: "#200e0e", surface: "#2d1010",
      surfaceRaised: "#3b1414", border: "#4c1919", borderStrong: "#b91c1c",
      text: "#ffe4e6", textMuted: "#fca5a5", textSubtle: "#f87171",
      accent: "#f87171", accentHover: "#fca5a5", accentLight: "#3b1414",
      accentText: "#1a0808", warn: "#fbbf24", danger: "#a78bfa",
      navActive: "#f87171", navActiveBg: "#3b1414", navActiveText: "#fecdd3",
    },
  },

  // ── Amber ─────────────────────────────────────────────────────
  {
    name: "amber",
    label: "Amber",
    description: "Warm golds and oranges",
    swatch: "#b45309",
    light: {
      bg: "#fffcf5", bgSubtle: "#fffbeb", surface: "#ffffff",
      surfaceRaised: "#ffffff", border: "#fde68a", borderStrong: "#fcd34d",
      text: "#1c1508", textMuted: "#78580c", textSubtle: "#b08030",
      accent: "#b45309", accentHover: "#92400e", accentLight: "#fef3c7",
      accentText: "#ffffff", warn: "#dc2626", danger: "#e11d48",
      navActive: "#b45309", navActiveBg: "#fef3c7", navActiveText: "#78350f",
    },
    dark: {
      bg: "#1a1200", bgSubtle: "#201800", surface: "#2d2200",
      surfaceRaised: "#3b2c00", border: "#4c3800", borderStrong: "#b45309",
      text: "#fef3c7", textMuted: "#fcd34d", textSubtle: "#fbbf24",
      accent: "#fbbf24", accentHover: "#fcd34d", accentLight: "#3b2c00",
      accentText: "#1a1200", warn: "#f87171", danger: "#fb7185",
      navActive: "#fbbf24", navActiveBg: "#3b2c00", navActiveText: "#fef3c7",
    },
  },

  // ── Violet ────────────────────────────────────────────────────
  {
    name: "violet",
    label: "Violet",
    description: "Soft, thoughtful purples",
    swatch: "#6d28d9",
    light: {
      bg: "#faf8ff", bgSubtle: "#f5f3ff", surface: "#ffffff",
      surfaceRaised: "#ffffff", border: "#ede9fe", borderStrong: "#c4b5fd",
      text: "#0f0a1e", textMuted: "#5b4b7a", textSubtle: "#9580b0",
      accent: "#6d28d9", accentHover: "#5b21b6", accentLight: "#ede9fe",
      accentText: "#ffffff", warn: "#d97706", danger: "#e11d48",
      navActive: "#6d28d9", navActiveBg: "#ede9fe", navActiveText: "#4c1d95",
    },
    dark: {
      bg: "#0d0818", bgSubtle: "#130d22", surface: "#1a1130",
      surfaceRaised: "#221640", border: "#2e1f55", borderStrong: "#6d28d9",
      text: "#ede9fe", textMuted: "#c4b5fd", textSubtle: "#a78bfa",
      accent: "#a78bfa", accentHover: "#c4b5fd", accentLight: "#221640",
      accentText: "#0d0818", warn: "#fbbf24", danger: "#fb7185",
      navActive: "#a78bfa", navActiveBg: "#221640", navActiveText: "#ddd6fe",
    },
  },

  // ── Slate (Neutral) ───────────────────────────────────────────
  {
    name: "slate",
    label: "Slate",
    description: "Clean, neutral grays",
    swatch: "#334155",
    light: {
      bg: "#f8fafc", bgSubtle: "#f1f5f9", surface: "#ffffff",
      surfaceRaised: "#ffffff", border: "#e2e8f0", borderStrong: "#94a3b8",
      text: "#0f172a", textMuted: "#475569", textSubtle: "#94a3b8",
      accent: "#334155", accentHover: "#1e293b", accentLight: "#e2e8f0",
      accentText: "#ffffff", warn: "#d97706", danger: "#e11d48",
      navActive: "#334155", navActiveBg: "#e2e8f0", navActiveText: "#0f172a",
    },
    dark: {
      bg: "#020617", bgSubtle: "#0f172a", surface: "#1e293b",
      surfaceRaised: "#273548", border: "#334155", borderStrong: "#475569",
      text: "#f1f5f9", textMuted: "#94a3b8", textSubtle: "#64748b",
      accent: "#94a3b8", accentHover: "#cbd5e1", accentLight: "#1e293b",
      accentText: "#020617", warn: "#fbbf24", danger: "#fb7185",
      navActive: "#94a3b8", navActiveBg: "#1e293b", navActiveText: "#e2e8f0",
    },
  },

  // ── Color Blind Safe ─────────────────────────────────────────
  {
    name: "colorblind",
    label: "Color Blind",
    description: "Deuteranopia/Protanopia safe — blue & orange",
    swatch: "#0077bb",
    light: {
      bg: "#f8f9ff", bgSubtle: "#eef3ff", surface: "#ffffff",
      surfaceRaised: "#ffffff", border: "#ccd9f0", borderStrong: "#6699cc",
      text: "#111122", textMuted: "#445577", textSubtle: "#8899bb",
      accent: "#0077bb", accentHover: "#005588", accentLight: "#cce4f7",
      accentText: "#ffffff", warn: "#ee7700", danger: "#cc3311",
      navActive: "#0077bb", navActiveBg: "#cce4f7", navActiveText: "#003366",
    },
    dark: {
      bg: "#050a14", bgSubtle: "#0a1220", surface: "#0f1d33",
      surfaceRaised: "#152540", border: "#1a3055", borderStrong: "#0077bb",
      text: "#cce4f7", textMuted: "#6699cc", textSubtle: "#4477aa",
      accent: "#44aadd", accentHover: "#66bbee", accentLight: "#152540",
      accentText: "#050a14", warn: "#ee9900", danger: "#ff6644",
      navActive: "#44aadd", navActiveBg: "#152540", navActiveText: "#99ccee",
    },
  },

  // ── High Contrast ─────────────────────────────────────────────
  {
    name: "highcontrast",
    label: "High Contrast",
    description: "WCAG AAA — maximum readability",
    swatch: "#000000",
    light: {
      bg: "#ffffff", bgSubtle: "#f0f0f0", surface: "#ffffff",
      surfaceRaised: "#ffffff", border: "#000000", borderStrong: "#000000",
      text: "#000000", textMuted: "#1a1a1a", textSubtle: "#333333",
      accent: "#000000", accentHover: "#222222", accentLight: "#e0e0e0",
      accentText: "#ffffff", warn: "#6b3a00", danger: "#8b0000",
      navActive: "#000000", navActiveBg: "#e0e0e0", navActiveText: "#000000",
    },
    dark: {
      bg: "#000000", bgSubtle: "#111111", surface: "#000000",
      surfaceRaised: "#111111", border: "#ffffff", borderStrong: "#ffffff",
      text: "#ffffff", textMuted: "#e0e0e0", textSubtle: "#cccccc",
      accent: "#ffffff", accentHover: "#e0e0e0", accentLight: "#222222",
      accentText: "#000000", warn: "#ffcc00", danger: "#ff6666",
      navActive: "#ffffff", navActiveBg: "#222222", navActiveText: "#ffffff",
    },
  },
];

// ── Theme Context ─────────────────────────────────────────────

interface ThemeContextValue {
  scheme: SchemeName;
  darkMode: boolean;
  tokens: ThemeTokens;
  setScheme: (s: SchemeName) => void;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

function getTokens(scheme: SchemeName, dark: boolean): ThemeTokens {
  const found = COLOR_SCHEMES.find((s) => s.name === scheme);
  const s = found ?? COLOR_SCHEMES[0];
  return dark ? s.dark : s.light;
}

function applyTokens(tokens: ThemeTokens, dark: boolean) {
  const root = document.documentElement;
  root.style.setProperty("--color-bg",            tokens.bg);
  root.style.setProperty("--color-bg-subtle",     tokens.bgSubtle);
  root.style.setProperty("--color-surface",       tokens.surface);
  root.style.setProperty("--color-surface-raised",tokens.surfaceRaised);
  root.style.setProperty("--color-border",        tokens.border);
  root.style.setProperty("--color-border-strong", tokens.borderStrong);
  root.style.setProperty("--color-text",          tokens.text);
  root.style.setProperty("--color-text-muted",    tokens.textMuted);
  root.style.setProperty("--color-text-subtle",   tokens.textSubtle);
  root.style.setProperty("--color-accent",        tokens.accent);
  root.style.setProperty("--color-accent-hover",  tokens.accentHover);
  root.style.setProperty("--color-accent-light",  tokens.accentLight);
  root.style.setProperty("--color-accent-text",   tokens.accentText);
  root.style.setProperty("--color-warn",          tokens.warn);
  root.style.setProperty("--color-danger",        tokens.danger);
  root.style.setProperty("--color-nav-active",    tokens.navActive);
  root.style.setProperty("--color-nav-active-bg", tokens.navActiveBg);
  root.style.setProperty("--color-nav-active-text",tokens.navActiveText);
  // Dark mode class for any direct Tailwind dark: usage
  if (dark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

const STORAGE_SCHEME = "willow-scheme";
const STORAGE_DARK   = "willow-dark";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<SchemeName>("sage");
  const [darkMode, setDarkMode]  = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedScheme = (localStorage.getItem(STORAGE_SCHEME) as SchemeName) ?? "sage";
    const savedDark   = localStorage.getItem(STORAGE_DARK) === "true";
    setSchemeState(savedScheme);
    setDarkMode(savedDark);
    applyTokens(getTokens(savedScheme, savedDark), savedDark);
  }, []);

  function setScheme(s: SchemeName) {
    setSchemeState(s);
    localStorage.setItem(STORAGE_SCHEME, s);
    applyTokens(getTokens(s, darkMode), darkMode);
  }

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem(STORAGE_DARK, String(next));
    applyTokens(getTokens(scheme, next), next);
  }

  const tokens = getTokens(scheme, darkMode);

  return (
    <ThemeContext.Provider value={{ scheme, darkMode, tokens, setScheme, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
