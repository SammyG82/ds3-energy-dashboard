"use client";

import { createContext, useContext, useState, useLayoutEffect, useCallback, useMemo } from "react";
import type { ReactNode } from "react";

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function detectIsDark(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem("ds3-theme");
    if (stored !== null) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch { return false; }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(false);

  useLayoutEffect(() => {
    const dark = detectIsDark();
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggle = useCallback(() => {
    setIsDark((d) => {
      const next = !d;
      try { localStorage.setItem("ds3-theme", next ? "dark" : "light"); } catch (e) { if (process.env.NODE_ENV !== "production") console.warn("Theme save failed:", e); }
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ isDark, toggle }), [isDark, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
