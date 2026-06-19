/**
 * Firebase singleton — lazy-initialized on first access.
 *
 * WHY LAZY: Every component in the Layout tree (AnnouncementBanner →
 * siteSettingsStore, LoadingBar → channelStore, AnalyticsBeacon →
 * analytics) statically imported `firebase.ts` before this change,
 * which pulled the entire ~350 kB Firebase bundle into the initial
 * page-load chunk. Now firebase/app is only imported at module-eval time;
 * the heavy `firebase/auth` and `firebase/firestore` modules are fetched
 * on the first call to `getFirebaseAuth()` / `getFirestoreDb()`, which
 * happens after the UI has already rendered — so the app shell appears
 * fast and Firebase loads in the background.
 *
 * Public surface area is identical to the old file so all existing callers
 * work unchanged (no call-site edits needed).
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const HARDCODED_CONFIG = {
  apiKey: "AIzaSyAf9hgFAOWv9cREdbqe5Kr4C4SjFqFmC_E",
  authDomain: "ip-tv-daf16.firebaseapp.com",
  projectId: "ip-tv-daf16",
  storageBucket: "ip-tv-daf16.firebasestorage.app",
  messagingSenderId: "255660646443",
  appId: "1:255660646443:web:42ca0b5c909f19cb000a6e",
  measurementId: "G-LNXMBXP4W4",
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || HARDCODED_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || HARDCODED_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || HARDCODED_CONFIG.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || HARDCODED_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || HARDCODED_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || HARDCODED_CONFIG.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || HARDCODED_CONFIG.measurementId,
};

export const isFirebaseConfigured = true;

// Lazy singletons — initialized on first access, not at module-eval time.
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function getApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

export function getFirestoreDb(): Firestore {
  if (!_db) _db = getFirestore(getApp());
  return _db;
}

// Backward-compat getters — callers that do `import { firebaseAuth, firestoreDb }`
// still work without any changes because these are accessed at call time, not
// at import time (they're getters on the module, not values).
export const firebaseApp = { get current() { return getApp(); } };

// These two are kept as simple function-call aliases so existing callers that
// already spread-destructure them (`const { firestoreDb } = await import(...)`)
// continue to work. Plain `export const firestoreDb = getFirestoreDb()` would
// evaluate eagerly at import time, which is what we're trying to avoid.
export const firebaseAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getFirebaseAuth() as any)[prop];
  },
});

export const firestoreDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getFirestoreDb() as any)[prop];
  },
});
