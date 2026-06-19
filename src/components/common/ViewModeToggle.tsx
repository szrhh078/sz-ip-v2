import { Grid3x3, List, LayoutGrid } from "lucide-react";
import type { ViewMode } from "@/types";
import { cn } from "@/lib/utils";

const MODES: { value: ViewMode; icon: React.ElementType; label: string }[] = [
  { value: "grid", icon: LayoutGrid, label: "Grid view" },
  { value: "list", icon: List, label: "List view" },
  { value: "compact", icon: Grid3x3, label: "Compact view" },
];

export function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-200 p-1">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        return (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value)}
            className={cn(
              "rounded-md p-1.5 transition-colors focus-ring",
              value === mode.value ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
            )}
            aria-label={mode.label}
            title={mode.label}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
