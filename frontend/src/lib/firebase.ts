// src/lib/firebase.ts
import { FirebaseApp, initializeApp } from "firebase/app";
import {
  Messaging,
  getMessaging,
  getToken,
  isSupported,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "messagingSenderId",
  "appId",
] as const;

export const isFirebaseConfigured = requiredFirebaseKeys.every(
  (key) => Boolean(String(firebaseConfig[key] ?? "").trim())
);

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
}

export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  if (!isFirebaseConfigured || !app) {
    return null;
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return null;
  }

  if (!messaging) {
    messaging = getMessaging(app);
  }

  return messaging;
};

/**
 * Function to request permission and get the FCM Token
 */
export const requestForToken = async () => {
  try {
    if (!("Notification" in window)) {
      return null;
    }

    const messagingInstance = await getFirebaseMessaging();
    if (!messagingInstance) {
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return null;
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      return null;
    }

    return (
      (await getToken(messagingInstance, { vapidKey }).catch(() => null)) ||
      null
    );
  } catch {
    return null;
  }
};
