import { cn } from "@/lib/utils";

export function Logo({ className, showTagline = false }: { className?: string; showTagline?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-brand shadow-lg shadow-brand-600/30">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M3 5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V14C21 15.1046 20.1046 16 19 16H13L9 20V16H5C3.89543 16 3 15.1046 3 14V5Z"
            fill="white"
          />
          <path d="M9.5 7.5L15 10L9.5 12.5V7.5Z" fill="#e11d48" />
        </svg>
      </div>
      <div className="leading-tight">
        <p className="font-display text-lg font-extrabold tracking-tight text-white">
          SHAHRIAR <span className="gradient-text">TV</span>
        </p>
        {showTagline && <p className="text-[10px] font-medium uppercase tracking-widest text-white/40">Family Entertainment Hub</p>}
      </div>
    </div>
  );
}
