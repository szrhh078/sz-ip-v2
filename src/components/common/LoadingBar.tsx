import { useChannelStore } from "@/store/channelStore";
import { motion, AnimatePresence } from "framer-motion";

export function LoadingBar() {
  const isLoading = useChannelStore((s) => s.isLoading);
  const progress = useChannelStore((s) => s.loadingProgress);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 h-0.5"
        >
          <motion.div
            className="h-full gradient-brand"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.max(progress, 5)}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
