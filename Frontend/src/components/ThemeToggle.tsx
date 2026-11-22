import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const storageKey = "fortune-intern-theme";
const themeEvent = "fortune-intern:theme";
const system = window.matchMedia("(prefers-color-scheme: dark)");

function readPreference(): Theme | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

let preference = readPreference();

function applyTheme() {
  document.documentElement.dataset.theme = preference ?? (system.matches ? "dark" : "light");
  window.dispatchEvent(new Event(themeEvent));
}

system.addEventListener("change", () => { if (!preference) applyTheme(); });
window.addEventListener("storage", event => {
  if (event.key !== storageKey && event.key !== null) return;
  preference = readPreference();
  applyTheme();
});
applyTheme();

function subscribe(listener: () => void) {
  window.addEventListener(themeEvent, listener);
  return () => window.removeEventListener(themeEvent, listener);
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export default function ThemeToggle({ showLabel = false, className = "" }: { showLabel?: boolean; className?: string }) {
  const theme = useSyncExternalStore(subscribe, getTheme);
  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button type="button" aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}
      className={`theme-toggle inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-2.5 text-sm font-semibold text-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${className}`}
      onClick={() => {
        preference = next;
        try { localStorage.setItem(storageKey, next); } catch { /* Current tab still uses the selected theme. */ }
        applyTheme();
      }}>
      <Icon aria-hidden="true" className="size-[1.125rem]" />
      {showLabel && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
