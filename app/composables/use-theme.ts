import { useState } from "#imports";
import { onMounted, readonly } from "vue";

export type Theme = "light" | "dark";

const storageKey = "market-diary-theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

export function useTheme() {
  const theme = useState<Theme>("market-diary-theme", () => "light");

  function applyTheme(nextTheme: Theme) {
    theme.value = nextTheme;
    if (!import.meta.client) return;
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
  }

  onMounted(() => {
    const saved = window.localStorage.getItem(storageKey);
    applyTheme(isTheme(saved) ? saved : "light");
  });

  function toggleTheme() {
    applyTheme(theme.value === "light" ? "dark" : "light");
  }

  return { theme: readonly(theme), toggleTheme };
}
