import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Channel } from "@/types";
import { ChannelCard } from "./ChannelCard";
import { Skeleton } from "@/components/ui/skeleton";

interface ChannelCarouselProps {
  title: string;
  channels: Channel[];
  isLoading?: boolean;
  viewAllHref?: string;
  icon?: React.ReactNode;
}

export function ChannelCarousel({ title, channels, isLoading, viewAllHref, icon }: ChannelCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (!isLoading && channels.length === 0) return null;

  return (
    <section className="relative">
      <div className="mb-3 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white sm:text-xl">
          {icon}
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {viewAllHref && (
            <Link to={viewAllHref} className="text-xs font-semibold text-white/60 hover:text-brand-400 transition-colors">
              View All
            </Link>
          )}
          <div className="hidden sm:flex gap-1">
            <button
              onClick={() => scroll("left")}
              className="rounded-full bg-white/5 p-1.5 text-white/60 hover:bg-white/15 hover:text-white transition-colors focus-ring"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="rounded-full bg-white/5 p-1.5 text-white/60 hover:bg-white/15 hover:text-white transition-colors focus-ring"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:px-6 lg:px-8 snap-x snap-mandatory"
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[180px] shrink-0 space-y-2 sm:w-[220px]">
                <Skeleton className="aspect-video w-full rounded-xl" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))
          : channels.map((ch, i) => (
              <div key={ch.id} className="w-[160px] shrink-0 snap-start sm:w-[200px] lg:w-[220px]">
                <ChannelCard channel={ch} index={i} variant="grid" />
              </div>
            ))}
      </div>
    </section>
  );
}
