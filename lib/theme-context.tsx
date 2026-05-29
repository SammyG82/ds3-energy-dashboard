"use client";

import { createContext, useContext, useState, useLayoutEffect } from "react";
import type { ReactNode } from "react";

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ isDark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useLayoutEffect(() => {
    if (localStorage.getItem("ds3-theme") === "dark") setIsDark(true);
  }, []);

  return (
    <ThemeContext.Provider value={{
      isDark,
      toggle: () => setIsDark((d) => {
        const next = !d;
        localStorage.setItem("ds3-theme", next ? "dark" : "light");
        return next;
      }),
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
