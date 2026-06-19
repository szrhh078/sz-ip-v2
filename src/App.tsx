import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";

// Route-level code splitting: each page is fetched on demand instead of all
// being bundled into one ~550kB chunk shipped to every visitor on first
// load. AdminPage (~1000 lines, rarely visited by regular users) was the
// single biggest contributor — this keeps it out of the initial download
// entirely, which matters most on slow connections / low-end Android.
const HomePage = lazy(() => import("@/pages/HomePage").then((m) => ({ default: m.HomePage })));
const LiveTVPage = lazy(() => import("@/pages/LiveTVPage").then((m) => ({ default: m.LiveTVPage })));
const ChannelsPage = lazy(() => import("@/pages/ChannelsPage").then((m) => ({ default: m.ChannelsPage })));
const CategoryPage = lazy(() => import("@/pages/CategoryPage").then((m) => ({ default: m.CategoryPage })));
const WatchPage = lazy(() => import("@/pages/WatchPage").then((m) => ({ default: m.WatchPage })));
const SearchPage = lazy(() => import("@/pages/SearchPage").then((m) => ({ default: m.SearchPage })));
const FavoritesPage = lazy(() => import("@/pages/FavoritesPage").then((m) => ({ default: m.FavoritesPage })));
const PinnedPage = lazy(() => import("@/pages/PinnedPage").then((m) => ({ default: m.PinnedPage })));
const HistoryPage = lazy(() => import("@/pages/HistoryPage").then((m) => ({ default: m.HistoryPage })));
const SchedulePage = lazy(() => import("@/pages/SchedulePage").then((m) => ({ default: m.SchedulePage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const AdminPage = lazy(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

function PageLoadingFallback() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/live" element={<LiveTVPage />} />
            <Route path="/channels" element={<ChannelsPage />} />
            <Route path="/category/:category" element={<CategoryPage />} />
            <Route path="/watch/:channelId" element={<WatchPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/pinned" element={<PinnedPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
