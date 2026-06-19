import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone } from "lucide-react";
import { useState } from "react";
import { useSiteSettingsStore } from "@/store/siteSettingsStore";
import { Link } from "react-router-dom";

export function AnnouncementBanner() {
  const announcement = useSiteSettingsStore((s) => s.announcement);
  const isLoaded = useSiteSettingsStore((s) => s.isLoaded);
  const [dismissed, setDismissed] = useState(false);

  if (!isLoaded || !announcement.enabled || !announcement.text.trim() || dismissed) return null;

  const hasLink = announcement.link?.trim();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="gradient-brand px-4 py-2.5">
          <div className="mx-auto flex max-w-screen-2xl items-center gap-3">
            <Megaphone className="h-4 w-4 shrink-0 text-white/80" />
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              {/* Scrolling ticker for long text */}
              <div className="relative flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-white">
                  {announcement.text}
                </p>
              </div>
              {hasLink && (
                <Link
                  to={announcement.link!}
                  className="shrink-0 rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold text-white hover:bg-white/30 transition-colors"
                >
                  {announcement.linkText || "Learn More"}
                </Link>
              )}
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 rounded-full p-1 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="Dismiss announcement"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
