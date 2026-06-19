import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, X } from "lucide-react";
import { useState } from "react";
import { useSiteSettingsStore } from "@/store/siteSettingsStore";

export function AnnouncementBanner() {
  const { announcement, isLoaded } = useSiteSettingsStore();
  const [dismissed, setDismissed] = useState(false);

  if (!isLoaded || !announcement.enabled || !announcement.text.trim() || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        className="relative z-30 w-full border-b border-brand-500/30 bg-gradient-to-r from-brand-900/80 via-brand-800/60 to-brand-900/80 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/20 border border-brand-500/30">
            <Megaphone className="h-3.5 w-3.5 text-brand-300" />
          </div>
          <p className="flex-1 text-sm font-medium text-white/90">{announcement.text}</p>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded-full p-1 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
