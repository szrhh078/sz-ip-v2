import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User,
} from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

// Local fallback credentials — only used when Firebase is not configured.
// Change these in Settings > Admin Account or directly here before deploying.
const DEFAULT_USERNAME = "shahriar";
const DEFAULT_PASSWORD = "shahriar123";

interface AdminAuthStore {
  username: string;
  passwordHash: string;
  isAuthenticated: boolean;
  isFirebase: boolean;
  authLoading: boolean;

  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => void;
  changeCredentials: (
    currentPassword: string,
    newUsername: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
  _setFirebaseUser: (user: User | null) => void;
}

// Simple non-cryptographic hash sufficient for client-side gating (not for sensitive data)
function hash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36);
}

export const useAdminAuthStore = create<AdminAuthStore>()(
  persist(
    (set, get) => ({
      username: DEFAULT_USERNAME,
      passwordHash: hash(DEFAULT_PASSWORD),
      isAuthenticated: false,
      isFirebase: true, // always true — hardcoded config in firebase.ts
      authLoading: true, // will be set to false by onAuthStateChanged or timeout

      login: async (identifier, password) => {
        if (isFirebaseConfigured && firebaseAuth) {
          try {
            const cred = await signInWithEmailAndPassword(firebaseAuth, identifier.trim(), password);
            set({ isAuthenticated: true, username: cred.user.email || identifier });
            return true;
          } catch {
            return false;
          }
        }

        // Local fallback
        const state = get();
        const ok = identifier.trim() === state.username && hash(password) === state.passwordHash;
        if (ok) set({ isAuthenticated: true });
        return ok;
      },

      logout: () => {
        if (isFirebaseConfigured && firebaseAuth) {
          signOut(firebaseAuth).catch(() => {});
        }
        set({ isAuthenticated: false });
      },

      changeCredentials: async (currentPassword, newUsername, newPassword) => {
        if (isFirebaseConfigured && firebaseAuth) {
          const user = firebaseAuth.currentUser;
          if (!user || !user.email) {
            return { ok: false, error: "Not signed in" };
          }

          try {
            // Firebase requires recent re-authentication for sensitive updates
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
          } catch {
            return { ok: false, error: "Current password is incorrect" };
          }

          try {
            if (newUsername && newUsername.trim() && newUsername.trim() !== user.email) {
              await updateEmail(user, newUsername.trim());
            }
            if (newPassword && newPassword.trim()) {
              await updatePassword(user, newPassword.trim());
            }
            set({ username: firebaseAuth.currentUser?.email || newUsername || user.email });
            return { ok: true };
          } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update credentials";
            return { ok: false, error: message };
          }
        }

        // Local fallback
        const state = get();
        if (hash(currentPassword) !== state.passwordHash) {
          return { ok: false, error: "Current password is incorrect" };
        }
        set({
          username: newUsername.trim() || state.username,
          passwordHash: newPassword ? hash(newPassword) : state.passwordHash,
        });
        return { ok: true };
      },

      _setFirebaseUser: (user) => {
        set({
          isAuthenticated: !!user,
          username: user?.email || get().username,
          authLoading: false,
        });
      },
    }),
    {
      name: "shahriar-tv-admin-auth",
      partialize: (state) => ({
        username: state.username,
        passwordHash: state.passwordHash,
        // isAuthenticated, isFirebase, authLoading intentionally not persisted
      }),
    }
  )
);

// Subscribe to Firebase auth state changes with a 5-second timeout fallback
if (isFirebaseConfigured && firebaseAuth) {
  // Fallback: if Firebase doesn't respond in 5 seconds, stop loading
  const loadingTimeout = setTimeout(() => {
    const state = useAdminAuthStore.getState();
    if (state.authLoading) {
      useAdminAuthStore.setState({ authLoading: false });
    }
  }, 5000);

  onAuthStateChanged(firebaseAuth, (user) => {
    clearTimeout(loadingTimeout);
    useAdminAuthStore.getState()._setFirebaseUser(user);
  });
}
