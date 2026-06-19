import { Link, useLocation } from "react-router-dom";
import { Home, Tv, Search, Heart, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Live", href: "/live", icon: Tv },
  { label: "Search", href: "/search", icon: Search },
  { label: "Channels", href: "/channels", icon: Grid3x3 },
  { label: "Favorites", href: "/favorites", icon: Heart },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-white/10 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex items-center justify-around">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors focus-ring",
                active ? "text-brand-400" : "text-white/50"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "fill-brand-500/20")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
