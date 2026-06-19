import { create } from "zustand";
import { persist } from "zustand/middleware";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { firestoreDb, isFirebaseConfigured } from "@/lib/firebase";

export interface HeroOverride {
  enabled: boolean;
  title: string;
  subtitle: string;
  description: string;
  badgeText: string;
  buttonText: string;
  buttonLink: string;
}

export interface AnnouncementSettings {
  enabled: boolean;
  text: string;
  link?: string;
  linkText?: string;
}

interface SiteSettingsDoc {
  hero: HeroOverride;
  announcement: AnnouncementSettings;
  updatedAt?: number;
}

interface SiteSettingsStore {
  hero: HeroOverride;
  announcement: AnnouncementSettings;

  /** True once the initial Firestore (or local) value has loaded */
  isLoaded: boolean;
  /** True while a publish write is in progress */
  isPublishing: boolean;
  /** Timestamp of the last successful publish */
  lastPublished: number | null;
  /** Set if the most recent publish failed */
  publishError: string | null;
  /** True if there are unsaved local edits not yet published */
  isDirty: boolean;

  setHero: (hero: Partial<HeroOverride>) => void;
  setAnnouncement: (announcement: Partial<AnnouncementSettings>) => void;
  resetHero: () => void;

  /** Loads settings from Firestore (or localStorage cache) and subscribes to live updates */
  init: () => void;
  /** Writes current hero/announcement state to Firestore so it's visible on all devices */
  publish: () => Promise<boolean>;
}

const DEFAULT_HERO: HeroOverride = {
  enabled: false,
  title: "",
  subtitle: "",
  description: "",
  badgeText: "FEATURED",
  buttonText: "Watch Now",
  buttonLink: "",
};

const DEFAULT_ANNOUNCEMENT: AnnouncementSettings = {
  enabled: false,
  text: "",
  link: "",
  linkText: "",
};

const SETTINGS_DOC_PATH = ["siteSettings", "main"] as const;

let unsubscribe: (() => void) | null = null;
let initialized = false;

export const useSiteSettingsStore = create<SiteSettingsStore>()(
  persist(
    (set, get) => ({
      hero: DEFAULT_HERO,
      announcement: DEFAULT_ANNOUNCEMENT,
      isLoaded: !isFirebaseConfigured, // local-only mode is "loaded" immediately
      isPublishing: false,
      lastPublished: null,
      publishError: null,
      isDirty: false,

      setHero: (hero) => set((state) => ({ hero: { ...state.hero, ...hero }, isDirty: true })),
      setAnnouncement: (announcement) =>
        set((state) => ({ announcement: { ...state.announcement, ...announcement }, isDirty: true })),
      resetHero: () => set({ hero: DEFAULT_HERO, isDirty: true }),

      init: () => {
        if (initialized) return;
        initialized = true;

        if (!isFirebaseConfigured || !firestoreDb) {
          set({ isLoaded: true });
          return;
        }

        const ref = doc(firestoreDb, ...SETTINGS_DOC_PATH);

        // Subscribe to live updates so all open tabs/devices reflect published changes
        unsubscribe = onSnapshot(
          ref,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as SiteSettingsDoc;
              set({
                hero: { ...DEFAULT_HERO, ...data.hero },
                announcement: { ...DEFAULT_ANNOUNCEMENT, ...data.announcement },
                isLoaded: true,
                isDirty: false,
                lastPublished: data.updatedAt || null,
              });
            } else {
              set({ isLoaded: true });
            }
          },
          () => {
            // Permission or network error — fall back to local cache, still mark loaded
            set({ isLoaded: true });
          }
        );

        // Also do a one-time fetch in case onSnapshot is slow to fire initially
        getDoc(ref)
          .then((snap) => {
            if (snap.exists()) {
              const data = snap.data() as SiteSettingsDoc;
              set({
                hero: { ...DEFAULT_HERO, ...data.hero },
                announcement: { ...DEFAULT_ANNOUNCEMENT, ...data.announcement },
                isLoaded: true,
                isDirty: false,
                lastPublished: data.updatedAt || null,
              });
            } else {
              set({ isLoaded: true });
            }
          })
          .catch(() => set({ isLoaded: true }));
      },

      publish: async () => {
        if (!isFirebaseConfigured || !firestoreDb) {
          // Local-only mode: nothing to publish remotely, just mark as saved
          set({ isDirty: false, lastPublished: Date.now(), publishError: null });
          return true;
        }

        set({ isPublishing: true, publishError: null });
        try {
          const ref = doc(firestoreDb, ...SETTINGS_DOC_PATH);
          const { hero, announcement } = get();
          await setDoc(ref, { hero, announcement, updatedAt: Date.now() });
          set({ isPublishing: false, isDirty: false, lastPublished: Date.now() });
          return true;
        } catch (err) {
          set({
            isPublishing: false,
            publishError: err instanceof Error ? err.message : "Failed to publish",
          });
          return false;
        }
      },
    }),
    {
      name: "shahriar-tv-site-settings",
      partialize: (state) => ({
        hero: state.hero,
        announcement: state.announcement,
      }),
    }
  )
);

// Auto-initialize on module load (subscribes to Firestore if configured)
useSiteSettingsStore.getState().init();

// Expose cleanup for potential hot-reload scenarios (not required in production)
export function _unsubscribeSiteSettings() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
    initialized = false;
  }
}
