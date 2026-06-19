import { useCallback, useEffect, useRef } from "react";

/**
 * Wraps the Screen Orientation API for the player's rotation-lock feature.
 *
 * Browser reality check (important for correctness, not just decoration):
 * - `screen.orientation.lock()` only works on a small set of browsers
 *   (mostly Android Chrome/Samsung Internet/Firefox) and on most of them it
 *   ONLY works while the page (or an element) is in fullscreen — calling it
 *   outside fullscreen throws or silently no-ops.
 * - iOS Safari (all versions as of this writing) does not implement
 *   `screen.orientation.lock()` at all. There is no public web API to lock
 *   orientation on iOS Safari outside of native apps.
 * - Because of that, this hook always treats lock/unlock as best-effort:
 *   it never throws, never crashes the player, and the caller (VideoPlayer)
 *   additionally enforces "Auto Rotate OFF" by CSS-transforming the video
 *   container as a fallback so the *visual* result is still correct even on
 *   browsers where the native lock call is unavailable.
 */
export function useScreenOrientationLock() {
  const isSupported = typeof window !== "undefined" && !!window.screen?.orientation?.lock;
  const lockedRef = useRef(false);

  const lock = useCallback(async (orientation: OrientationLockType = "landscape") => {
    if (!isSupported) return false;
    try {
      await window.screen.orientation.lock(orientation);
      lockedRef.current = true;
      return true;
    } catch {
      // Most commonly thrown when not in fullscreen, or browser refuses.
      // Never propagate — this is a "nice to have", not critical path.
      return false;
    }
  }, [isSupported]);

  const unlock = useCallback(() => {
    if (!isSupported || !lockedRef.current) return;
    try {
      window.screen.orientation.unlock();
    } catch {
      // ignore
    } finally {
      lockedRef.current = false;
    }
  }, [isSupported]);

  useEffect(() => () => unlock(), [unlock]);

  return { isSupported, lock, unlock };
}
