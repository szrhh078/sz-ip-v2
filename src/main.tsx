import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startAutoRefresh } from '@/store/channelStore'
import { startAutoUpdateEngine } from '@/lib/autoUpdateEngine'

// Existing: 30-min fast refresh for token-expiry sources (unchanged)
startAutoRefresh()

// New: 6-hour full sync engine (channels + EPG hook + logos + cache cleanup)
startAutoUpdateEngine()

// Mobile viewport fix — sets --app-vh to the real visible height and keeps
// it in sync on resize/orientation change. Used as a CSS fallback alongside
// native `dvh` units so window sizing matches the actual device viewport
// (fixes the address-bar show/hide mismatch on mobile browsers).
function syncAppViewportHeight() {
  const vh = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--app-vh', `${vh}px`);
}
syncAppViewportHeight();
window.addEventListener('resize', syncAppViewportHeight);
window.addEventListener('orientationchange', syncAppViewportHeight);
window.visualViewport?.addEventListener('resize', syncAppViewportHeight);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
