import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  onSnapshot,
  updateDoc,
  getDocFromServer,
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged,
  User,
} from 'firebase/auth';
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
let auth: Auth | null = null;
let messaging: Messaging | null = null;
const googleProvider = new GoogleAuthProvider();

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  // Use user's provisioned Firestore database ID directly
  const clientDbId =
    firebaseConfig.firestoreDatabaseId ||
    'ai-studio-wanchaisoymilk-2125599d-2848-42d7-b69f-4b82b3e45dc6';
  db = getFirestore(app, clientDbId);
  auth = getAuth(app);
} catch (e) {
  console.warn('[Firebase Client] Init error:', e);
}

// Test live connection to Firestore on boot as specified in the Firebase Skill
async function testFirestoreConnection() {
  if (!db || typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log(
      `%c[Firestore Live] Connected successfully to database: ${firebaseConfig.firestoreDatabaseId}`,
      'color: #10b981; font-weight: bold;'
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Please check your Firebase configuration: client is offline.');
    }
  }
}

if (typeof window !== 'undefined') {
  // Test in background without blocking UI
  setTimeout(testFirestoreConnection, 100);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  AUTH = 'auth',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType | string;
  path: string | null;
  statusCode?: number;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    providerId?: string | null;
  };
  timestamp: string;
}

export type AuthErrorListener = (errInfo: FirestoreErrorInfo) => void;
const authErrorListeners = new Set<AuthErrorListener>();

export function subscribeToAuthErrors(listener: AuthErrorListener) {
  authErrorListeners.add(listener);
  return () => {
    authErrorListeners.delete(listener);
  };
}

/**
 * Attempt silent session token refresh using Firebase Auth
 * Returns the fresh JWT token string on success, or null on failure.
 */
export async function attemptSilentTokenRefresh(): Promise<string | null> {
  if (!auth?.currentUser) {
    return null;
  }
  try {
    const freshToken = await auth.currentUser.getIdToken(true);
    console.info(
      `%c[Auth Guard] Silently refreshed session token for ${auth.currentUser.email || auth.currentUser.uid}.`,
      'color: #10b981; font-weight: bold;'
    );
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('auth:token-refreshed', {
          detail: {
            token: freshToken,
            userId: auth.currentUser.uid,
            email: auth.currentUser.email,
          },
        })
      );
    }
    return freshToken;
  } catch (refreshErr) {
    console.warn('[Auth Guard] Silent token refresh failed:', refreshErr);
    return null;
  }
}

/**
 * Global Firebase Error Handler:
 * Intercepts 401 Unauthorized codes and permission-denied errors,
 * logs detailed request context for debugging, and silently refreshes
 * the session token when possible before prompting SessionExpiredModal.
 */
export function handleFirebaseError(
  error: unknown,
  operationType: OperationType | string = OperationType.WRITE,
  path: string | null = null,
  statusCode?: number,
  options?: { forcePromptModal?: boolean }
): FirestoreErrorInfo {
  const errMsg = error instanceof Error ? error.message : String(error);
  const is401 =
    statusCode === 401 ||
    errMsg.includes('401') ||
    errMsg.toLowerCase().includes('unauthorized') ||
    errMsg.includes('auth/id-token-expired') ||
    errMsg.includes('auth/user-token-expired') ||
    errMsg.includes('auth/invalid-user-token') ||
    errMsg.includes('auth/unauthenticated') ||
    (errMsg.includes('permission-denied') && !auth?.currentUser);

  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    operationType,
    path,
    statusCode: is401 ? 401 : statusCode || 500,
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || false,
      isAnonymous: currentUser?.isAnonymous || false,
      providerId: currentUser?.providerData?.[0]?.providerId || null,
    },
    timestamp: new Date().toISOString(),
  };

  // Structured diagnostic console output
  console.groupCollapsed(
    `%c[Firebase Error Handler] ${is401 ? '🚨 401 UNAUTHORIZED' : '⚠️ Firebase Error'} - ${operationType.toUpperCase()} ${path || ''}`,
    is401
      ? 'background: #fee2e2; color: #b91c1c; font-weight: bold; padding: 2px 6px; border-radius: 4px;'
      : 'background: #fef3c7; color: #92400e; font-weight: bold; padding: 2px 6px; border-radius: 4px;'
  );
  console.warn('[Firebase Error Handler Detail]:', errInfo);
  console.info('Current Firebase User:', currentUser ? { uid: currentUser.uid, email: currentUser.email } : 'None (Anonymous/Signed Out)');
  console.info('Target Path / Operation:', { path, operationType });
  console.groupEnd();

  if (is401) {
    const notifySessionExpired = () => {
      authErrorListeners.forEach((fn) => {
        try {
          fn(errInfo);
        } catch (e) {
          console.warn('Error listener exception:', e);
        }
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth:session-expired', {
            detail: errInfo,
          })
        );
      }
    };

    if (options?.forcePromptModal) {
      // Intentionally prompting modal (e.g. simulation or after failed refresh)
      notifySessionExpired();
    } else if (currentUser) {
      // Attempt silent refresh first to spare user from an unnecessary modal
      attemptSilentTokenRefresh().then((refreshedToken) => {
        if (!refreshedToken) {
          // Silent refresh failed -> prompt modal as last resort
          notifySessionExpired();
        } else {
          console.info(
            '%c[Auth Guard] 401 handled by silent token refresh. SessionExpiredModal suppressed.',
            'color: #10b981;'
          );
        }
      });
    } else {
      // No logged in user -> prompt modal
      notifySessionExpired();
    }
  }

  return errInfo;
}

/**
 * Wrapper for API fetch requests that automatically intercepts 401 Unauthorized codes,
 * silently attempts token refresh and request retry before surfacing SessionExpiredModal.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const targetUrl = typeof input === 'string' ? input : input.toString();
  try {
    const res = await fetch(input, init);
    if (res.status === 401) {
      // 1. Try silent token refresh first
      if (auth?.currentUser) {
        try {
          const freshToken = await attemptSilentTokenRefresh();
          if (freshToken) {
            // Retry the request with the refreshed token in Authorization header
            const retryInit = { ...init };
            const headers = new Headers(retryInit.headers || {});
            headers.set('Authorization', `Bearer ${freshToken}`);
            retryInit.headers = headers;

            const retryRes = await fetch(input, retryInit);
            if (retryRes.status !== 401) {
              console.info(
                `%c[authFetch] Request to ${targetUrl} recovered from 401 via silent token refresh!`,
                'color: #10b981; font-weight: bold;'
              );
              return retryRes;
            }
          }
        } catch (silentErr) {
          console.warn('[authFetch] Silent token retry failed:', silentErr);
        }
      }

      // 2. If silent refresh failed or user is not logged in, prompt modal
      let bodyText = '';
      try {
        const cloned = res.clone();
        bodyText = await cloned.text();
      } catch {}
      handleFirebaseError(
        new Error(`HTTP 401 Unauthorized: ${bodyText || 'Session expired or authentication credentials required'}`),
        OperationType.AUTH,
        targetUrl,
        401,
        { forcePromptModal: true }
      );
    }
    return res;
  } catch (err: any) {
    if (err?.message && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
      handleFirebaseError(err, OperationType.AUTH, targetUrl, 401);
    }
    throw err;
  }
}

export {
  app,
  db,
  auth,
  googleProvider,
  doc,
  onSnapshot,
  updateDoc,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged,
};
export type { User };

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

let sharedAudioCtx: AudioContext | null = null;

export function initAudioContext() {
  if (typeof window === 'undefined') return;
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
  } catch {}
}

if (typeof window !== 'undefined') {
  const warmAudio = () => {
    initAudioContext();
  };
  window.addEventListener('click', warmAudio, { once: true, passive: true });
  window.addEventListener('touchstart', warmAudio, { once: true, passive: true });
}

/**
 * Play gentle warm chime sound when order status transitions to preparing
 */
export function playPreparingChime() {
  try {
    initAudioContext();
    const ctx = sharedAudioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(440.0, now);
    osc.frequency.setValueAtTime(554.37, now + 0.15);
    osc.frequency.setValueAtTime(659.25, now + 0.3);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.75);
  } catch (e) {
    console.warn('Audio preparing chime error:', e);
  }
}

/**
 * Play gentle chime sound when order status is ready
 */
export function playReadyChime() {
  try {
    initAudioContext();
    const ctx = sharedAudioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Arpeggio chime: 523Hz (C5) -> 659Hz (E5) -> 784Hz (G5) -> 1046Hz (C6)
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.12);
    osc.frequency.setValueAtTime(783.99, now + 0.24);
    osc.frequency.setValueAtTime(1046.5, now + 0.36);

    gain.gain.setValueAtTime(0.35, now);
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

export { runFirestoreDiagnostic } from './firestore-diagnostic';
