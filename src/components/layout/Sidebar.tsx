import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Tv,
  Heart,
  Clock,
  Trophy,
  Globe2,
  ShieldCheck,
  Settings,
  X,
  Pin,
  Grid3x3,
  Calendar,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Live TV", href: "/live", icon: Tv },
  { label: "All Channels", href: "/channels", icon: Grid3x3 },
  { label: "World Cup Schedule", href: "/schedule", icon: Calendar },
  { label: "Bangla TV", href: "/category/bangla", icon: Globe2 },
  { label: "Sports", href: "/category/sports", icon: Trophy },
  { label: "FIFA", href: "/category/fifa", icon: Trophy },
  { label: "Custom Channels", href: "/category/custom", icon: Tv },
];

const PERSONAL_LINKS = [
  { label: "Favorites", href: "/favorites", icon: Heart },
  { label: "Watch History", href: "/history", icon: Clock },
  { label: "Pinned", href: "/pinned", icon: Pin },
];

const SYSTEM_LINKS = [
  { label: "Admin Dashboard", href: "/admin", icon: ShieldCheck },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 left-0 z-50 w-72 glass-strong p-5 lg:hidden"
          >
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10 focus-ring">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="space-y-1">
              {LINKS.map((link) => (
                <SidebarLink key={link.href} link={link} active={location.pathname === link.href} onClick={onClose} />
              ))}
            </nav>

            <div className="my-4 h-px bg-white/10" />

            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">My Stuff</p>
            <nav className="space-y-1">
              {PERSONAL_LINKS.map((link) => (
                <SidebarLink key={link.href} link={link} active={location.pathname === link.href} onClick={onClose} />
              ))}
            </nav>

            <div className="my-4 h-px bg-white/10" />

            <nav className="space-y-1">
              {SYSTEM_LINKS.map((link) => (
                <SidebarLink key={link.href} link={link} active={location.pathname === link.href} onClick={onClose} />
              ))}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function SidebarLink({
  link,
  active,
  onClick,
}: {
  link: { label: string; href: string; icon: React.ElementType };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = link.icon;
  return (
    <Link
      to={link.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-ring",
        active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className="h-4.5 w-4.5" />
      {link.label}
    </Link>
  );
}
