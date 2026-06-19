import { useState, useEffect } from "react";
import { Settings, Shield, Smartphone, Trash2, Download, Info, KeyRound, Check, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserStore } from "@/store/userStore";
import { useChannelStore } from "@/store/channelStore";
import { useAdminAuthStore } from "@/store/adminAuthStore";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function SettingsPage() {
  const { familyMode, setFamilyMode, clearHistory, clearSearchHistory } = useUserStore();
  const { sources, lastLoaded } = useChannelStore();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setInstalled(true);
    window.addEventListener("appinstalled", installedHandler);

    // Intentional: one-time check of the browser's actual display mode at
    // mount — this reads an external system (matchMedia), not a derived
    // value from props/state, so there's nothing to memoize here.
    if (window.matchMedia("(display-mode: standalone)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your preferences and app data" icon={<Settings className="h-5 w-5 text-white" />} />

      <div className="mx-auto max-w-2xl space-y-6 px-4 pb-10 sm:px-6 lg:px-8">
        <SettingsSection title="Family & Privacy" icon={<Shield className="h-4 w-4" />}>
          <SettingsRow
            label="Family Access Mode"
            description="Restrict content to family-friendly categories and hide adult/sensitive groups"
          >
            <Switch checked={familyMode} onCheckedChange={setFamilyMode} />
          </SettingsRow>
          <SettingsRow label="Private Browsing" description="Don't save watch history or search history for this session">
            <Switch checked={false} disabled />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Install as App" icon={<Smartphone className="h-4 w-4" />}>
          {/* Android - Chrome install prompt */}
          {installPrompt && !installed && (
            <div className="rounded-xl bg-brand-500/10 border border-brand-500/20 p-4">
              <p className="text-sm font-semibold text-white mb-1">📱 Install on this device</p>
              <p className="text-xs text-white/60 mb-3">Add Shahriar TV to your home screen for a full app experience.</p>
              <Button variant="brand" size="sm" onClick={handleInstall}>
                <Download className="h-4 w-4" /> Install App
              </Button>
            </div>
          )}
          {installed && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400 font-medium">
              ✓ Shahriar TV is installed on this device
            </div>
          )}

          {/* Android Instructions */}
          <InstallGuide
            platform="🤖 Android (Chrome)"
            steps={[
              "Open your Shahriar TV URL in Chrome",
              'Tap the 3-dot menu (⋮) at top right',
              'Tap "Add to Home Screen" or "Install app"',
              'Tap "Install" on the popup',
              "Done! Opens like a real app — no browser bar"
            ]}
          />

          {/* iOS Instructions */}
          <InstallGuide
            platform="🍎 iPhone / iPad (Safari)"
            steps={[
              "Open your Shahriar TV URL in Safari (not Chrome)",
              "Tap the Share button (□ with arrow) at bottom",
              'Scroll down and tap "Add to Home Screen"',
              'Tap "Add" in the top right',
              "Done! Find it on your home screen like any app"
            ]}
            note="Must use Safari on iOS — Chrome on iPhone does not support PWA install."
          />

          {/* Desktop */}
          <InstallGuide
            platform="💻 Desktop (Chrome / Edge)"
            steps={[
              "Open your Shahriar TV URL in Chrome or Edge",
              "Look for the install icon (⊕) in the address bar (right side)",
              'Click it and select "Install"',
              "Shahriar TV opens in its own window like a desktop app"
            ]}
          />
        </SettingsSection>

        <SettingsSection title="Data Management" icon={<Trash2 className="h-4 w-4" />}>
          <SettingsRow label="Clear Watch History" description="Remove all watched channels from your history">
            <Button variant="secondary" size="sm" onClick={clearHistory}>
              Clear
            </Button>
          </SettingsRow>
          <SettingsRow label="Clear Search History" description="Remove all recent search terms">
            <Button variant="secondary" size="sm" onClick={clearSearchHistory}>
              Clear
            </Button>
          </SettingsRow>
        </SettingsSection>

        <AdminAccountSection />

        <SettingsSection title="About" icon={<Info className="h-4 w-4" />}>
          <div className="space-y-2 text-sm text-white/60">
            <p>
              <span className="font-semibold text-white">Shahriar TV</span> — Your Family Entertainment Hub
            </p>
            <p>Version 1.0.0</p>
            <p>
              Playlists last synced:{" "}
              {lastLoaded ? new Date(lastLoaded).toLocaleString() : "Not yet loaded"}
            </p>
            <div className="mt-3 space-y-1">
              {sources.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-surface-200 px-3 py-2">
                  <span className="text-white/80">{s.name}</span>
                  <span
                    className={
                      s.status === "ok"
                        ? "text-emerald-400"
                        : s.status === "error"
                        ? "text-red-400"
                        : "text-white/40"
                    }
                  >
                    {s.status === "ok" ? `${s.channelCount} channels` : s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-white/70">
        {icon}
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
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

function AdminAccountSection() {
  const { isAuthenticated, username, isFirebase, changeCredentials } = useAdminAuthStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setMessage({ type: "error", text: "Enter your current password to confirm changes" });
      return;
    }
    setSubmitting(true);
    const result = await changeCredentials(currentPassword, newUsername || username, newPassword);
    setSubmitting(false);
    if (result.ok) {
      setMessage({ type: "success", text: "Admin credentials updated successfully" });
      setCurrentPassword("");
      setNewUsername("");
      setNewPassword("");
    } else {
      setMessage({ type: "error", text: result.error || "Current password is incorrect" });
    }
  };

  return (
    <SettingsSection title="Admin Account" icon={<KeyRound className="h-4 w-4" />}>
      <p className="text-sm text-white/60">
        Logged in as <span className="font-semibold text-white">{username}</span>. Update your admin{" "}
        {isFirebase ? "email" : "username"} and password below.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
            Current Password
          </label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Required to confirm changes"
            autoComplete="current-password"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
              New {isFirebase ? "Email" : "Username"} (optional)
            </label>
            <Input
              type={isFirebase ? "email" : "text"}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder={username}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
              New Password (optional)
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
            />
          </div>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {message.type === "success" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {message.text}
          </div>
        )}

        <Button type="submit" variant="brand" size="sm" disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </SettingsSection>
  );
}

function InstallGuide({
  platform,
  steps,
  note,
}: {
  platform: string;
  steps: string[];
  note?: string;
}) {
  return (
    <div className="rounded-xl bg-surface-200 p-4 space-y-2">
      <p className="text-sm font-semibold text-white">{platform}</p>
      <ol className="space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-white/70">
            <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full gradient-brand text-[9px] font-bold text-white mt-0.5">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {note && <p className="text-xs text-amber-400/80 mt-2">⚠ {note}</p>}
    </div>
  );
}
