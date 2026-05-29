"use client";

import { createContext, useContext, useState, useLayoutEffect } from "react";
import type { ReactNode } from "react";

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useLayoutEffect(() => {
    const dark = localStorage.getItem("ds3-theme") === "dark";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  return (
    <ThemeContext.Provider value={{
      isDark,
      toggle: () => setIsDark((d) => {
        const next = !d;
        localStorage.setItem("ds3-theme", next ? "dark" : "light");
        document.documentElement.classList.toggle("dark", next);
        return next;
      }),
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
