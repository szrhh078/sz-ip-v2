import { cn } from "@/lib/utils";

export function GroupFilter({
  groups,
  active,
  onChange,
}: {
  groups: string[];
  active: string;
  onChange: (group: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar sm:px-6 lg:px-8">
      {["All", ...groups].map((group) => (
        <button
          key={group}
          onClick={() => onChange(group)}
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-ring",
            active === group ? "gradient-brand text-white shadow-lg shadow-brand-600/30" : "bg-surface-200 text-white/60 hover:bg-surface-300 hover:text-white"
          )}
        >
          {group}
        </button>
      ))}
    </div>
  );
}
