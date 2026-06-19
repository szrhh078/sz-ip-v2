import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { AnnouncementBanner } from "@/components/common/AnnouncementBanner";
import { LoadingBar } from "@/components/common/LoadingBar";
import { AnalyticsBeacon } from "@/components/common/AnalyticsBeacon";
import { usePlayerUIStore } from "@/store/playerStore";

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // When the player goes immersive-fullscreen (real Fullscreen API on
  // Android/desktop, or the CSS pseudo-fullscreen fallback on iOS Safari),
  // we hide the app chrome so video gets the entire viewport. Real
  // Fullscreen already covers most browsers automatically (the fullscreen
  // element renders in the browser's "top layer," above this fixed chrome),
  // but this explicit flag also handles the iOS pseudo-fullscreen case and
  // any Android WebView quirks where that isn't reliable.
  const isImmersive = usePlayerUIStore((s) => s.isImmersiveFullscreen);

  return (
    <div className="min-h-dvh bg-surface-0">
      <AnalyticsBeacon />
      {!isImmersive && <LoadingBar />}
      {!isImmersive && <Header onMenuToggle={() => setSidebarOpen(true)} />}
      {!isImmersive && <AnnouncementBanner />}
      {!isImmersive && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      <main className={isImmersive ? "" : "pb-20 lg:pb-8"}>
        <Outlet />
      </main>
      {!isImmersive && <BottomNav />}
      {!isImmersive && <MiniPlayer />}
    </div>
  );
}
