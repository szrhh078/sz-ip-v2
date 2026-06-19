import { useRef, useMemo, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Channel, ViewMode } from "@/types";
import { ChannelCard } from "./ChannelCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tv2 } from "lucide-react";

interface ChannelGridProps {
  channels: Channel[];
  viewMode?: ViewMode;
  isLoading?: boolean;
  emptyMessage?: string;
}

// How many columns per view mode (matches Tailwind grid cols)
function getColumns(viewMode: ViewMode): number {
  if (typeof window === "undefined") return 4;
  const w = window.innerWidth;
  if (viewMode === "compact") {
    if (w >= 1280) return 10;
    if (w >= 1024) return 8;
    if (w >= 768) return 6;
    if (w >= 640) return 4;
    return 3;
  }
  if (viewMode === "list") return 1;
  // grid
  if (w >= 1280) return 6;
  if (w >= 1024) return 5;
  if (w >= 768) return 4;
  if (w >= 640) return 3;
  return 2;
}

function getRowHeight(viewMode: ViewMode): number {
  if (viewMode === "list") return 72;
  if (viewMode === "compact") return 90;
  return 220; // grid: aspect-video card + label
}

const VIRTUAL_THRESHOLD = 60; // only virtualise when above this many channels

export const ChannelGrid = memo(function ChannelGrid({
  channels,
  viewMode = "grid",
  isLoading,
  emptyMessage,
}: ChannelGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const cols = getColumns(viewMode);
  const rowHeight = getRowHeight(viewMode);

  // Group channels into rows
  const rows = useMemo(() => {
    if (viewMode === "list") return channels.map((ch) => [ch]);
    const result: Channel[][] = [];
    for (let i = 0; i < channels.length; i += cols) {
      result.push(channels.slice(i, i + cols));
    }
    return result;
  }, [channels, cols, viewMode]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight + 12, // row height + gap
    overscan: 5,
    enabled: rows.length > VIRTUAL_THRESHOLD,
  });

  if (isLoading && channels.length === 0) {
    return <ChannelGridSkeleton viewMode={viewMode} />;
  }

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-300">
          <Tv2 className="h-8 w-8 text-white/30" />
        </div>
        <p className="text-lg font-semibold text-white/70">{emptyMessage || "No channels found"}</p>
        <p className="mt-1 text-sm text-white/40">Try adjusting your search or filters</p>
      </div>
    );
  }

  // For small lists, render normally (no virtualiser overhead)
  if (rows.length <= VIRTUAL_THRESHOLD) {
    return <NormalGrid channels={channels} viewMode={viewMode} cols={cols} />;
  }

  // Virtual scrolling for large lists
  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ height: "calc(100vh - 200px)", minHeight: 400 }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowChannels = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <RowRenderer viewMode={viewMode} cols={cols} rowChannels={rowChannels} rowIndex={virtualRow.index} />
            </div>
          );
        })}
      </div>
    </div>
  );
});

// Memoized row to prevent re-renders during scroll
const RowRenderer = memo(function RowRenderer({
  viewMode,
  cols,
  rowChannels,
  rowIndex,
}: {
  viewMode: ViewMode;
  cols: number;
  rowChannels: Channel[];
  rowIndex: number;
}) {
  if (viewMode === "list") {
    return (
      <div className="divide-y divide-white/5">
        {rowChannels.map((ch, i) => (
          <ChannelCard key={ch.id} channel={ch} index={rowIndex + i} variant="list" />
        ))}
      </div>
    );
  }

  const gridClass =
    viewMode === "compact"
      ? `grid gap-3 mb-3`
      : `grid gap-4 mb-4`;

  return (
    <div className={gridClass} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {rowChannels.map((ch, i) => (
        <ChannelCard
          key={ch.id}
          channel={ch}
          index={rowIndex * cols + i}
          variant={viewMode === "compact" ? "compact" : "grid"}
        />
      ))}
    </div>
  );
});

// Normal (non-virtual) grid for small lists
function NormalGrid({ channels, viewMode }: { channels: Channel[]; viewMode: ViewMode; cols: number }) {
  if (viewMode === "list") {
    return (
      <div className="flex flex-col divide-y divide-white/5">
        {channels.map((ch, i) => (
          <ChannelCard key={ch.id} channel={ch} index={i} variant="list" />
        ))}
      </div>
    );
  }

  const gridClass =
    viewMode === "compact"
      ? "grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10"
      : "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

  return (
    <div className={gridClass}>
      {channels.map((ch, i) => (
        <ChannelCard
          key={ch.id}
          channel={ch}
          index={i}
          variant={viewMode === "compact" ? "compact" : "grid"}
        />
      ))}
    </div>
  );
}

function ChannelGridSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (viewMode === "compact") {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      ))}
    </div>
  );
}
