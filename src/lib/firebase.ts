import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { getMessaging, Messaging, isSupported, getToken, onMessage } from 'firebase/messaging';

// Embedded client config from firebase-applet-config.json
export const firebaseConfig = {
  projectId: 'seismic-shell-6f6jr',
  appId: '1:491688574409:web:872c246cd6755a7397fc18',
  apiKey: 'AIzaSyAw8rXEYUygVT0jQV7zr6cbcjjbpJBSwL4',
  authDomain: 'seismic-shell-6f6jr.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-wanchaisoymilk-2125599d-2848-42d7-b69f-4b82b3e45dc6',
  storageBucket: 'seismic-shell-6f6jr.firebasestorage.app',
  messagingSenderId: '491688574409',
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let messaging: Messaging | null = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
} catch (e) {
  console.warn('[Firebase Client] Init error:', e);
}

export { app, db, doc, onSnapshot, updateDoc };

/**
 * Register service worker and request FCM push notification token
 */
export async function requestFCMToken(): Promise<{ token: string | null; error?: string }> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { token: null, error: 'Notifications not supported by this browser.' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { token: null, error: 'Permission denied' };
    }

    const supported = await isSupported();
    if (!supported || !app) {
      // Fallback: Browser notification permitted even if FCM native is restricted in iframe
      return { token: `local-token-${Date.now()}` };
    }

    if (!messaging) {
      messaging = getMessaging(app);
    }

    // Register service worker if available
    let swReg: ServiceWorkerRegistration | undefined = undefined;
    if ('serviceWorker' in navigator) {
      try {
        swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      } catch (swErr) {
        console.warn('SW registration failed:', swErr);
      }
    }

    try {
      const currentToken = await getToken(messaging, {
        serviceWorkerRegistration: swReg,
      });
      return { token: currentToken || `device-token-${Date.now()}` };
    } catch (tokenErr) {
      console.warn('FCM getToken fallback:', tokenErr);
      return { token: `fcm-fallback-${Date.now()}` };
    }
  } catch (err: any) {
    console.warn('Push notification request error:', err);
    return { token: null, error: err?.message || 'Failed to request token' };
  }
}

/**
 * Play gentle chime sound when order status is ready
 */
export function playReadyChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Arpeggio chime: 523Hz (C5) -> 659Hz (E5) -> 784Hz (G5) -> 1046Hz (C6)
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.12);
    osc.frequency.setValueAtTime(783.99, now + 0.24);
    osc.frequency.setValueAtTime(1046.5, now + 0.36);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.95);
  } catch (e) {
    console.warn('Audio chime error:', e);
  }
}

/**
 * Display native browser push notification
 */
export function showPushNotification(title: string, options?: NotificationOptions) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/images/soy-milk.jpg',
        badge: '/images/soy-milk.jpg',
        ...options,
      });
    } catch (e) {
      console.warn('Notification constructor error:', e);
    }
  }
}
