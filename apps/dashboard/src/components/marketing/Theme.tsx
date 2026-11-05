"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";

type Theme = "light" | "dark";
const storageKey = "voxel-site-theme";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

export function ThemeShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch { /* The theme can still be changed when browser storage is unavailable. */ }
    const syncTheme = (event: StorageEvent) => {
      if (event.key === storageKey) setTheme(event.newValue === "light" ? "light" : "dark");
    };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Session-only preference. */ }
  }
  return <ThemeContext.Provider value={{ theme, toggle }}><div className="voxel-site" data-theme={theme}>{children}</div></ThemeContext.Provider>;
}

export function ThemeToggle() {
  const context = useContext(ThemeContext);
  if (!context) return null;
  const { theme, toggle } = context;
  const label = `Switch to ${theme === "dark" ? "light" : "dark"} theme`;
  return <button type="button" className="vl-theme-toggle" onClick={toggle} aria-label={label} title={label}>{theme === "dark" ? <Sun size={20} aria-hidden="true"/> : <Moon size={20} aria-hidden="true"/>}</button>;
}
