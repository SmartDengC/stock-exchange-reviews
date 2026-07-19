"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";
const storageKey = "market-diary-theme";

function applyTheme(theme: Theme) {
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(theme);
  localStorage.setItem(storageKey, theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    const nextTheme: Theme = saved === "light" || saved === "dark"
      ? saved
      : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const toggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={`切换至${theme === "dark" ? "浅色" : "深色"}主题`} title="切换主题">
    <span className={theme === "dark" ? "selected" : ""}>☾</span>
    <span className={theme === "light" ? "selected" : ""}>☀</span>
  </button>;
}
