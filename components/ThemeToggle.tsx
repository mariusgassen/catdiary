"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import type { LucideIcon } from "lucide-react";
import { Sun, Moon, Monitor } from "lucide-react";

const OPTIONS: { value: string; Icon: LucideIcon; label: string }[] = [
  { value: "system", Icon: Monitor, label: "System" },
  { value: "light", Icon: Sun, label: "Light" },
  { value: "dark", Icon: Moon, label: "Dark" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The active theme is only known on the client; render a neutral state on
  // the server to avoid a hydration mismatch.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5"
    >
      {OPTIONS.map(({ value, Icon, label }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(value)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              active ? "bg-surface text-accent shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
