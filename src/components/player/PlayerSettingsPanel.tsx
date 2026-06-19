import {
  RotateCw, Lock, PlayCircle, Maximize as FitIcon,
  Cpu, Gauge, Hand, Wifi, Database,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  usePlayerSettingsStore,
  type FitMode,
  type PreferredEngine,
  type BufferSize,
} from "@/store/playerSettingsStore";
import type { PlayerEngine } from "@/hooks/useHlsPlayer";
import type { PlayerState } from "@/types";

interface PlayerSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Live diagnostics shown read-only at the bottom — proof the engine/
   *  network monitoring is actually doing something, not just toggles. */
  activeEngine: PlayerEngine | null;
  networkQuality: PlayerState["networkQuality"];
  bufferHealth: number;
  orientationLockSupported: boolean;
}

const FIT_OPTIONS: { value: FitMode; label: string }[] = [
  { value: "smart", label: "Smart (auto)" },
  { value: "contain", label: "Contain" },
  { value: "cover", label: "Cover" },
  { value: "fill", label: "Fill" },
];

const ENGINE_OPTIONS: { value: PreferredEngine; label: string }[] = [
  { value: "auto", label: "Auto (recommended)" },
  { value: "hls.js", label: "HLS.js" },
  { value: "shaka", label: "Shaka" },
  { value: "mpegts", label: "mpegts.js" },
  { value: "native", label: "Native" },
];

const BUFFER_OPTIONS: { value: BufferSize; label: string }[] = [
  { value: "low", label: "Low (lower latency, less safety margin)" },
  { value: "auto", label: "Auto (recommended)" },
  { value: "high", label: "High (smoother on shaky connections)" },
];

export function PlayerSettingsPanel({
  open,
  onOpenChange,
  activeEngine,
  networkQuality,
  bufferHealth,
  orientationLockSupported,
}: PlayerSettingsPanelProps) {
  const settings = usePlayerSettingsStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Player Settings</DialogTitle>
          <DialogDescription>Changes apply to this and future channels. Takes effect on next load/retry.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Section title="Playback" icon={<PlayCircle className="h-3.5 w-3.5" />}>
            <Row label="Auto Play" description="Start playback automatically when a channel loads">
              <Switch checked={settings.autoPlay} onCheckedChange={settings.setAutoPlay} />
            </Row>
            <Row
              label="Auto Rotate"
              description={
                orientationLockSupported
                  ? "Off = lock player orientation when device rotates. On = follow device rotation in fullscreen."
                  : "Off = lock orientation (Android/desktop). Not available on iOS Safari — Apple doesn't expose this to web apps."
              }
            >
              <Switch checked={settings.autoRotate} onCheckedChange={settings.setAutoRotate} />
            </Row>
            <Row label="Auto Next Channel" description="On unrecoverable stream error, jump to the next channel in this group">
              <Switch checked={settings.autoNextChannel} onCheckedChange={settings.setAutoNextChannel} />
            </Row>
          </Section>

          <Section title="Video" icon={<FitIcon className="h-3.5 w-3.5" />}>
            <Row label="Fit Mode" description="How video fills the player. Smart picks Cover/Contain based on aspect ratio.">
              <SegmentedControl
                options={FIT_OPTIONS}
                value={settings.fitMode}
                onChange={settings.setFitMode}
              />
            </Row>
          </Section>

          <Section title="Player Engine" icon={<Cpu className="h-3.5 w-3.5" />}>
            <Row label="Preferred Engine" description="Tried first. Auto picks the best engine per stream type.">
              <select
                value={settings.preferredEngine}
                onChange={(e) => settings.setPreferredEngine(e.target.value as PreferredEngine)}
                className="rounded-lg border border-white/10 bg-surface-200 px-3 py-1.5 text-sm text-white focus-ring"
              >
                {ENGINE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Row>
            <Row label="Enable Fallback Chain" description="Automatically try the next engine if one fails">
              <Switch checked={settings.enableFallbackChain} onCheckedChange={settings.setEnableFallbackChain} />
            </Row>
            <Row label="Low Latency Mode" description="Smaller live buffer for less delay — can buffer more often on weak connections">
              <Switch checked={settings.lowLatencyMode} onCheckedChange={settings.setLowLatencyMode} />
            </Row>
          </Section>

          <Section title="Gestures" icon={<Hand className="h-3.5 w-3.5" />}>
            <Row label="Fullscreen Gestures" description="Double-tap edges to seek, pinch to zoom, swipe for brightness/volume">
              <Switch checked={settings.gesturesEnabled} onCheckedChange={settings.setGesturesEnabled} />
            </Row>
          </Section>

          <Section title="Performance" icon={<Gauge className="h-3.5 w-3.5" />}>
            <Row label="Buffer Size" description="More buffer = smoother on flaky networks, slightly higher latency">
              <select
                value={settings.bufferSize}
                onChange={(e) => settings.setBufferSize(e.target.value as BufferSize)}
                className="rounded-lg border border-white/10 bg-surface-200 px-3 py-1.5 text-sm text-white focus-ring"
              >
                {BUFFER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Row>
            <Row
              label="Hardware Acceleration"
              description="Hint only — browsers decide GPU decoding themselves; this can't force it on/off"
            >
              <Switch checked={settings.hardwareAcceleration} onCheckedChange={settings.setHardwareAcceleration} />
            </Row>
          </Section>

          {/* Live diagnostics — read-only, proves the monitoring is real */}
          <div className="rounded-xl bg-surface-200 p-3 space-y-1.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">
              <Database className="h-3 w-3" /> Live Diagnostics
            </p>
            <DiagRow icon={<Cpu className="h-3.5 w-3.5" />} label="Active engine" value={activeEngine || "—"} />
            <DiagRow icon={<Wifi className="h-3.5 w-3.5" />} label="Network" value={networkQuality} />
            <DiagRow icon={<RotateCw className="h-3.5 w-3.5" />} label="Buffer ahead" value={`${bufferHealth.toFixed(1)}s`} />
            <DiagRow
              icon={<Lock className="h-3.5 w-3.5" />}
              label="Rotation lock API"
              value={orientationLockSupported ? "Supported" : "Unsupported on this browser"}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50">
        {icon} {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-0.5 text-xs text-white/40">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
            value === o.value ? "gradient-brand text-white" : "bg-surface-200 text-white/60 hover:text-white"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DiagRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-white/50">{icon} {label}</span>
      <span className="font-mono text-white/80">{value}</span>
    </div>
  );
}
