# Shahriar TV — Premium IPTV Streaming Platform

**Your Family Entertainment Hub**

A production-ready, Netflix-style IPTV streaming web application built with React 19, TypeScript, Vite, Tailwind CSS v4, Shadcn-style UI, Framer Motion, HLS.js, React Router, and Zustand.

## Getting Started

```bash
npm install
npm run dev      # start dev server
npm run build    # production build (outputs to dist/)
npm run preview  # preview the production build
```

## Features

### IPTV Engine
- Automatically fetches and parses three M3U playlists (Bangla TV, FIFA, Sports) from GitHub.
- Custom M3U parser (`src/lib/m3uParser.ts`) extracts channel name, logo, group/category, and stream URL.
- Automatic CORS-proxy fallback chain (`src/lib/playlistFetcher.ts`) if direct fetch is blocked.
- Channels are deduplicated, grouped, and cached in `localStorage` for 6 hours with stale-while-revalidate behavior.

### Video Player (`src/components/player/VideoPlayer.tsx` + `src/hooks/useHlsPlayer.ts`)
- Built on HLS.js with native HLS fallback for Safari.
- Auto play, auto-reconnect with exponential backoff (up to 5 attempts), buffer monitoring, error detection & retry UI.
- Fullscreen, Picture-in-Picture, Theater Mode, Mini floating player (draggable).
- Quality selector driven by HLS level manifest.
- Full keyboard shortcuts: Space/K play-pause, M mute, F fullscreen, P PiP, T theater mode, arrow keys for volume/channel switching, Esc exit fullscreen.

### Pages
- **Home** — hero carousel, continue watching, pinned, featured, trending, recently watched, favorites, sports/FIFA/Bangla rows.
- **Live TV / All Channels** — grid/list/compact views with category filters.
- **Category pages** — `/category/bangla`, `/category/sports`, `/category/fifa`.
- **Watch page** — full player with related channels sidebar, next/prev navigation.
- **Search** — instant fuzzy search with scoring, recent searches, category shortcuts.
- **Favorites / Pinned / History** — all persisted to localStorage via Zustand `persist`.
- **Settings** — family mode toggle, PWA install prompt, data management, admin credentials.
- **Admin Dashboard** (`/admin`) — login-gated. Playlist refresh per source, stream health checker (concurrent probes), channel statistics, category distribution chart, homepage hero/headline editor, and custom channel management.

### Design
- Dark theme, glassmorphism, gradient branding (`#e11d48` brand red), Sora/Inter typography.
- Framer Motion animations throughout (fade/slide/scale on scroll & route change).
- Fully responsive: mobile bottom nav + drawer sidebar, desktop top nav.

### PWA
- `vite-plugin-pwa` with auto-update service worker.
- Custom app icons (192/512, maskable variants), apple-touch-icon, manifest.
- Runtime caching: NetworkFirst for `.m3u`/`.m3u8` playlists, CacheFirst for images.

## Admin Access

Admin login (`/admin`, linked from the header shield icon on desktop) is secured with **Firebase Authentication** (Email/Password) when configured, with a local fallback if Firebase isn't set up.

### Firebase setup (recommended)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → create a project (Analytics optional).
2. Add a **Web App** (the `</>` icon) → copy the `firebaseConfig` values shown.
3. Go to **Build → Authentication → Sign-in method** → enable **Email/Password**.
4. Go to **Authentication → Users → Add user** → create your admin login (email + password).
5. Copy `.env.example` to `.env.local` and fill in the values from step 2:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

6. On **Vercel**: add the same `VITE_FIREBASE_*` variables under Project Settings → Environment Variables, then redeploy.

Once configured, `/admin` shows an **Email + Password** form. Sign in with the user you created in step 4. You can change the email/password later from `/settings` → "Admin Account" (requires the current password to confirm — this is a Firebase re-authentication requirement).

### Firestore setup (for the homepage headline/hero — shows on ALL devices)

The admin "Homepage Headline & Hero" editor saves to **Firestore** so the headline appears for every visitor on every device, not just the browser you edited it in. Without this, the headline only saves to the browser you're using.

1. In Firebase Console → **Build → Firestore Database** → "Create database".
2. Pick a location close to your users → start in **Production mode**.
3. Go to the **Rules** tab and replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /siteSettings/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

4. Click **Publish**.

This lets anyone read the headline (so it shows on the public homepage) but only your signed-in Firebase admin account can change it. After enabling this, go to `/admin`, edit the headline, and click **Save & Publish** — it'll now sync to every device within a few seconds.

If Firestore isn't set up, the headline editor still works but only saves to the current browser (shown via a warning banner in the admin panel).

### Local fallback (no Firebase)

If the `VITE_FIREBASE_*` env vars are left empty, the app falls back to a built-in username/password stored (hashed) in the browser:

- **Default username:** `shahriar`
- **Default password:** `shahriar123`

**Change these immediately** via `/settings` → "Admin Account" if you're not using Firebase.

### What you can do from the Admin Dashboard

- Refresh/reload each M3U playlist source independently
- Run a stream health check on a sample of channels
- Edit the **hero headline/announcement** (title, subtitle, description, badge, button) and click **Save & Publish** to push it live to all visitors on every device (requires Firestore — see above)
- Add, edit, and delete **custom channels** (manual name/logo/category/stream URL) — these appear everywhere alongside playlist channels, including under `/category/custom`

## Project Structure

```
src/
  components/
    channel/    — ChannelCard, ChannelGrid, ChannelCarousel
    common/      — Logo, PageHeader, GroupFilter, ViewModeToggle
    layout/      — Header, Sidebar, BottomNav, Layout
    player/      — VideoPlayer, MiniPlayer
    ui/          — shadcn-style primitives (button, dialog, dropdown, etc.)
  hooks/         — useHlsPlayer, useChannelSearch, useStreamHealth, useAllChannels
  lib/           — m3uParser, playlistFetcher, utils
  pages/         — HomePage, WatchPage, LiveTVPage, SearchPage, AdminPage, AdminLoginPage, etc.
  store/         — channelStore, userStore, playerStore, adminAuthStore, siteSettingsStore, customChannelsStore (Zustand)
  types/         — shared TypeScript types
```

## Notes

- All user data (favorites, history, pins, preferences) is stored locally — nothing leaves the browser except playlist fetches and stream requests.
- "Family Access Mode" toggle in Settings is a foundation for content filtering by category.
- If a CORS error occurs fetching the M3U playlists, the app automatically retries through `corsproxy.io`, `allorigins.win`, and `codetabs.com` proxies in sequence.
