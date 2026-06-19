import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, icon, action }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex flex-wrap items-center justify-between gap-4 px-4 pt-6 sm:px-6 lg:px-8"
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-brand shadow-lg shadow-brand-600/30">
            {icon}
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-white/50">{subtitle}</p>}
        </div>
      </div>
      {action}
    </motion.div>
  );
}
