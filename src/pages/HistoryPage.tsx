import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Clock, Trash2, Tv2 } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useChannelStore } from "@/store/channelStore";
import { useUserStore } from "@/store/userStore";
import { useAllChannels } from "@/hooks/useAllChannels";
import { formatTimeAgo } from "@/lib/utils";

export function HistoryPage() {
  const { loadChannels } = useChannelStore();
  const { channels } = useAllChannels();
  const { history, clearHistory } = useUserStore();

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const enriched = useMemo(() => {
    return history.map((entry) => ({
      entry,
      channel: channels.find((c) => c.id === entry.channelId),
    }));
  }, [history, channels]);

  return (
    <div>
      <PageHeader
        title="Watch History"
        subtitle={`${history.length} channel${history.length !== 1 ? "s" : ""} in your history`}
        icon={<Clock className="h-5 w-5 text-white" />}
        action={
          history.length > 0 ? (
            <Button variant="secondary" size="sm" onClick={clearHistory}>
              <Trash2 className="h-4 w-4" /> Clear All
            </Button>
          ) : undefined
        }
      />

      <div className="px-4 sm:px-6 lg:px-8">
        {enriched.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-300">
              <Clock className="h-8 w-8 text-white/30" />
            </div>
            <p className="text-lg font-semibold text-white/70">No watch history yet</p>
            <p className="mt-1 text-sm text-white/40">Channels you watch will appear here</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-white/5">
            {enriched.map(({ entry, channel }, i) => (
              <motion.div
                key={`${entry.channelId}-${entry.watchedAt}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
              >
                {channel ? (
                  <Link to={`/watch/${channel.id}`} className="flex items-center gap-4 rounded-xl p-3 hover:bg-white/5 transition-colors">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-300 flex items-center justify-center">
                      {entry.channelLogo ? (
                        <img src={entry.channelLogo} alt="" className="h-full w-full object-contain p-1" />
                      ) : (
                        <Tv2 className="h-6 w-6 text-white/30" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{entry.channelName}</p>
                      <p className="truncate text-xs text-white/50">{entry.group}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-white/40">{formatTimeAgo(entry.watchedAt)}</p>
                      {entry.duration > 0 && (
                        <Badge variant="outline" className="mt-1">
                          {Math.floor(entry.duration / 60)}m watched
                        </Badge>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 p-3 opacity-50">
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-surface-300 flex items-center justify-center">
                      <Tv2 className="h-6 w-6 text-white/30" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{entry.channelName}</p>
                      <p className="text-xs text-white/40">Channel no longer available</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
