// lib/ThemeContext.tsx — Theme provider for Willow mobile

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { SCHEMES, DEFAULT_SCHEME, type SchemeName, type ThemeTokens } from "./theme";

interface ThemeContextValue {
  scheme:    SchemeName;
  darkMode:  boolean;
  tokens:    ThemeTokens;
  setScheme: (s: SchemeName) => void;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}

const STORAGE_SCHEME = "willow:scheme";
const STORAGE_DARK   = "willow:dark";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemDark = useColorScheme() === "dark";
  const [scheme,   setSchemeState] = useState<SchemeName>(DEFAULT_SCHEME);
  const [darkMode, setDarkMode]    = useState(systemDark);
  const [ready,    setReady]       = useState(false);

  useEffect(() => {
    async function load() {
      const savedScheme = (await AsyncStorage.getItem(STORAGE_SCHEME)) as SchemeName | null;
      const savedDark   = await AsyncStorage.getItem(STORAGE_DARK);
      if (savedScheme && SCHEMES[savedScheme]) setSchemeState(savedScheme);
      if (savedDark !== null) setDarkMode(savedDark === "true");
      else setDarkMode(systemDark);
      setReady(true);
    }
    load();
  }, [systemDark]);

  async function setScheme(s: SchemeName) {
    setSchemeState(s);
    await AsyncStorage.setItem(STORAGE_SCHEME, s);
  }

  async function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    await AsyncStorage.setItem(STORAGE_DARK, String(next));
  }

  const tokens = darkMode ? SCHEMES[scheme].dark : SCHEMES[scheme].light;

  if (!ready) return null; // Don't flash wrong colors

  return (
    <ThemeContext.Provider value={{ scheme, darkMode, tokens, setScheme, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
