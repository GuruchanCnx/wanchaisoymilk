import { useState, useEffect, useCallback } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged,
  subscribeToAuthErrors,
  handleFirebaseError,
  OperationType,
  User,
  FirestoreErrorInfo,
  db,
  doc,
} from '../lib/firebase';
import { getDocFromServer } from 'firebase/firestore';

export interface AuthDiagnosticLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: any;
}

export function useAuthDiagnostic() {
  const [currentUser, setCurrentUser] = useState<User | null>(auth?.currentUser || null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [tokenExpiration, setTokenExpiration] = useState<Date | null>(null);
  const [lastAuthError, setLastAuthError] = useState<FirestoreErrorInfo | null>(null);
  const [authLogs, setAuthLogs] = useState<AuthDiagnosticLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const addLog = useCallback(
    (level: AuthDiagnosticLog['level'], message: string, details?: any) => {
      const entry: AuthDiagnosticLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        details,
      };
      setAuthLogs((prev) => [entry, ...prev.slice(0, 49)]);

      const style =
        level === 'error'
          ? 'color: #ef4444; font-weight: bold;'
          : level === 'warn'
          ? 'color: #f59e0b; font-weight: bold;'
          : level === 'success'
          ? 'color: #10b981; font-weight: bold;'
          : 'color: #3b82f6; font-weight: bold;';

      console.log(`%c[Auth Diagnostic] ${message}`, style, details || '');
    },
    []
  );

  // Monitor Firebase Auth state changes
  useEffect(() => {
    if (!auth) {
      addLog('warn', 'Firebase Auth service is not initialized');
      return;
    }

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        addLog('success', `User Authenticated: ${user.email || user.displayName || user.uid}`, {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          isAnonymous: user.isAnonymous,
          providers: user.providerData.map((p) => p.providerId),
        });
      } else {
        addLog('info', 'Auth state: No active session (User signed out or unauthenticated)');
        setIdToken(null);
        setTokenExpiration(null);
      }
    });

    // Monitor Token changes and expiration
    const unsubToken = onIdTokenChanged(auth, async (user) => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          setIdToken(tokenResult.token);
          const expDate = new Date(tokenResult.expirationTime);
          setTokenExpiration(expDate);

          const minutesLeft = Math.round((expDate.getTime() - Date.now()) / 60000);
          addLog('info', `JWT ID Token updated. Valid for ~${minutesLeft} mins (Expires: ${expDate.toLocaleTimeString()})`, {
            issuedAt: tokenResult.issuedAtTime,
            expiresAt: tokenResult.expirationTime,
            authTime: tokenResult.authTime,
          });
        } catch (tokenErr: any) {
          addLog('error', 'Failed to retrieve Firebase ID token result', tokenErr);
          if (tokenErr?.code === 'auth/id-token-expired' || tokenErr?.code?.includes('token')) {
            handleFirebaseError(tokenErr, OperationType.AUTH, 'firebase.auth.getIdTokenResult', 401);
          }
        }
      }
    });

    // Subscribe to internal 401 error interceptor
    const unsubError = subscribeToAuthErrors((errInfo) => {
      setLastAuthError(errInfo);
      addLog('error', `🚨 401 Intercepted: ${errInfo.operationType} on ${errInfo.path || 'unknown path'}`, {
        error: errInfo.error,
        authContext: errInfo.authInfo,
        timestamp: errInfo.timestamp,
      });
    });

    // Also listen to window auth:session-expired event
    const handleWindowAuthExpired = (e: Event) => {
      const customEvt = e as CustomEvent<FirestoreErrorInfo>;
      if (customEvt.detail) {
        setLastAuthError(customEvt.detail);
      }
    };
    window.addEventListener('auth:session-expired', handleWindowAuthExpired);

    // Listen to silent token refresh events
    const handleWindowTokenRefreshed = (e: Event) => {
      const customEvt = e as CustomEvent<{ token: string; userId: string; email: string }>;
      if (customEvt.detail) {
        setIdToken(customEvt.detail.token);
        addLog('success', `Silent session token refresh succeeded (User: ${customEvt.detail.email || customEvt.detail.userId})`);
      }
    };
    window.addEventListener('auth:token-refreshed', handleWindowTokenRefreshed);

    return () => {
      unsubAuth();
      unsubToken();
      unsubError();
      window.removeEventListener('auth:session-expired', handleWindowAuthExpired);
      window.removeEventListener('auth:token-refreshed', handleWindowTokenRefreshed);
    };
  }, [addLog]);

  // Re-authenticate via Google popup
  const loginWithGoogle = useCallback(async () => {
    if (!auth) {
      addLog('warn', 'Auth not initialized');
      return null;
    }
    addLog('info', 'Initiating Google sign-in popup...');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      addLog('success', `Signed in successfully as ${result.user.email}`);
      setLastAuthError(null);
      return result.user;
    } catch (err: any) {
      addLog('error', `Sign-in popup notice: ${err.message}`);
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, not an unauthenticated credential error
        return null;
      }
      handleFirebaseError(err, OperationType.AUTH, 'auth/google-sign-in');
      return null;
    }
  }, [addLog]);

  // Force-refresh the session ID token
  const refreshToken = useCallback(async () => {
    if (!auth?.currentUser) {
      addLog('warn', 'Cannot refresh token: No active user session');
      return null;
    }
    setIsRefreshing(true);
    addLog('info', 'Force-refreshing Firebase ID token...');
    try {
      const refreshedToken = await auth.currentUser.getIdToken(true);
      const tokenResult = await auth.currentUser.getIdTokenResult();
      setIdToken(refreshedToken);
      const expDate = new Date(tokenResult.expirationTime);
      setTokenExpiration(expDate);
      addLog('success', `Token refreshed successfully! New expiry: ${expDate.toLocaleTimeString()}`);
      return refreshedToken;
    } catch (err: any) {
      addLog('error', `Token refresh notice: ${err.message}`);
      handleFirebaseError(err, OperationType.AUTH, 'auth/refresh-token', 401);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [addLog]);

  // Sign out
  const signOutUser = useCallback(async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      // Also clear admin local storage if present
      localStorage.removeItem('wanchai_admin_user');
      addLog('info', 'User signed out from Firebase & local session');
    } catch (err: any) {
      addLog('error', `Sign-out error: ${err.message}`);
    }
  }, [addLog]);

  // Simulate a 401 error to verify UI handling and test diagnostic listeners
  const simulate401Error = useCallback(() => {
    addLog('warn', 'Simulating synthetic 401 Unauthorized event for testing...');
    return handleFirebaseError(
      new Error('HTTP 401 Unauthorized: The request requires user authentication or your session token has expired.'),
      OperationType.AUTH,
      '/api/admin/restricted-resource',
      401,
      { forcePromptModal: true }
    );
  }, [addLog]);

  // Test Firestore DB connection with permission error catcher
  const testFirestorePing = useCallback(async () => {
    if (!db) {
      addLog('error', 'Firestore database instance is null');
      return false;
    }
    addLog('info', 'Testing Firestore live connection...');
    try {
      const startTime = performance.now();
      await getDocFromServer(doc(db, 'test', 'connection'));
      const duration = Math.round(performance.now() - startTime);
      addLog('success', `Firestore connection verified (${duration}ms latency)`);
      return true;
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('permission-denied') || msg.includes('offline')) {
        addLog('warn', `Firestore ping notice: ${msg}`);
      } else {
        addLog('error', `Firestore ping error: ${msg}`);
      }
      return false;
    }
  }, [addLog]);

  // Run full credential and connection diagnostic
  const runConfigDiagnostic = useCallback(async () => {
    addLog('info', 'Running full credentials & Firestore connectivity diagnostic...');
    try {
      const { runFirestoreDiagnostic } = await import('../lib/firestore-diagnostic');
      const rep = await runFirestoreDiagnostic();
      if (rep.connection.isLive) {
        addLog('success', `Diagnostic passed: ${rep.summary}`, rep);
      } else {
        addLog('warn', `Diagnostic notice: ${rep.summary}`, rep);
      }
      return rep;
    } catch (err: any) {
      addLog('error', `Diagnostic execution failed: ${err?.message || err}`);
      return null;
    }
  }, [addLog]);

  const clearAuthError = useCallback(() => {
    setLastAuthError(null);
  }, []);

  return {
    currentUser,
    isAuthenticated: Boolean(currentUser),
    idToken,
    tokenExpiration,
    lastAuthError,
    authLogs,
    isRefreshing,
    loginWithGoogle,
    refreshToken,
    signOutUser,
    simulate401Error,
    testFirestorePing,
    runConfigDiagnostic,
    clearAuthError,
  };
}
