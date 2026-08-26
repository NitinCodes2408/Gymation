import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const rawApiKey =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.VITE_FIREBASE_API_KEY ||
  "";

const rawAuthDomain =
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
  process.env.VITE_FIREBASE_AUTH_DOMAIN ||
  "";

const rawProjectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  "";

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    rawApiKey &&
    rawApiKey.trim() !== "" &&
    rawApiKey !== "dummy-api-key-for-build" &&
    rawAuthDomain &&
    rawProjectId
  );
};

// Safe fallback for SSR / Next.js static page generation when environment variables are not yet injected
const firebaseConfig = {
  apiKey: rawApiKey || "AIzaSyDummyKeyForBuildOnly00000000000000",
  authDomain: rawAuthDomain || "gymation-app.firebaseapp.com",
  projectId: rawProjectId || "gymation-app",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    "",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    process.env.VITE_FIREBASE_APP_ID ||
    "",
};

// Initialize Firebase App singleton
export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

export default app;
