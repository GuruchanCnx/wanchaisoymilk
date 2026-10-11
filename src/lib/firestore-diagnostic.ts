import { doc, getDocFromServer } from 'firebase/firestore';
import { db, firebaseConfig } from './firebase';

export interface ConfigCredentialStatus {
  key: string;
  value: string;
  valid: boolean;
  notes: string;
}

export interface FirestoreDiagnosticReport {
  timestamp: string;
  configValidation: {
    isValid: boolean;
    credentials: ConfigCredentialStatus[];
    issues: string[];
  };
  connection: {
    status: 'connected' | 'permission-denied-verified' | 'offline' | 'error';
    latencyMs?: number;
    details: string;
    isLive: boolean;
  };
  summary: string;
}

/**
 * Diagnostic utility that validates credentials against firebase-applet-config.json
 * and tests the live connection to Firestore, logging structured results to the console.
 */
export async function runFirestoreDiagnostic(options?: {
  silentConsole?: boolean;
}): Promise<FirestoreDiagnosticReport> {
  const timestamp = new Date().toISOString();
  const issues: string[] = [];

  // 1. Verify credentials from firebase-applet-config.json
  const credentials: ConfigCredentialStatus[] = [
    {
      key: 'projectId',
      value: firebaseConfig.projectId || '',
      valid: Boolean(firebaseConfig.projectId && firebaseConfig.projectId.length > 2),
      notes: firebaseConfig.projectId ? 'Configured' : 'Missing projectId',
    },
    {
      key: 'firestoreDatabaseId',
      value: firebaseConfig.firestoreDatabaseId || '',
      valid: Boolean(firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.length > 0),
      notes: firebaseConfig.firestoreDatabaseId ? 'Target Database Defined' : 'Missing firestoreDatabaseId',
    },
    {
      key: 'apiKey',
      value: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.slice(0, 8)}...` : '',
      valid: Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIza')),
      notes: firebaseConfig.apiKey?.startsWith('AIza') ? 'Valid Google API Key format' : 'Invalid or missing API key',
    },
    {
      key: 'authDomain',
      value: firebaseConfig.authDomain || '',
      valid: Boolean(firebaseConfig.authDomain && firebaseConfig.authDomain.includes('firebaseapp.com')),
      notes: firebaseConfig.authDomain ? 'Valid authDomain' : 'Missing authDomain',
    },
    {
      key: 'appId',
      value: firebaseConfig.appId ? `${firebaseConfig.appId.slice(0, 10)}...` : '',
      valid: Boolean(firebaseConfig.appId && firebaseConfig.appId.length > 5),
      notes: firebaseConfig.appId ? 'Registered Web Client App ID' : 'Missing appId',
    },
    {
      key: 'storageBucket',
      value: firebaseConfig.storageBucket || '',
      valid: Boolean(firebaseConfig.storageBucket && firebaseConfig.storageBucket.length > 0),
      notes: firebaseConfig.storageBucket ? 'Storage Bucket Configured' : 'Missing storageBucket',
    },
  ];

  credentials.forEach((c) => {
    if (!c.valid) {
      issues.push(`Credential Check Failed: ${c.key} - ${c.notes}`);
    }
  });

  const credentialsValid = issues.length === 0;

  // 2. Validate live connection to Firestore
  let connStatus: FirestoreDiagnosticReport['connection']['status'] = 'error';
  let latencyMs: number | undefined;
  let connDetails = '';
  let isLive = false;

  if (!db) {
    connStatus = 'error';
    connDetails = 'Firestore instance is not initialized in client app.';
    issues.push('Database instance db is null.');
  } else {
    try {
      const start = performance.now();
      // Ping doc from server to verify live round-trip network connectivity
      await getDocFromServer(doc(db, 'test', 'connection'));
      latencyMs = Math.round(performance.now() - start);
      connStatus = 'connected';
      connDetails = `Live Firestore connection verified successfully (Roundtrip: ${latencyMs}ms). Database '${firebaseConfig.firestoreDatabaseId}' reachable.`;
      isLive = true;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const errCode = err?.code || '';

      if (errMsg.includes('permission-denied') || errCode === 'permission-denied') {
        // Security rule rejection proves Firestore server connection is online and actively enforcing rules!
        connStatus = 'permission-denied-verified';
        connDetails = 'Firestore connection verified: Security rules actively evaluating and enforcing access control on /test/connection.';
        isLive = true;
      } else if (errMsg.includes('client is offline') || errMsg.includes('unavailable') || errCode === 'unavailable') {
        connStatus = 'offline';
        connDetails = 'Client is offline or network to Firebase is currently unreachable.';
        issues.push('Network connectivity to Firebase unavailable.');
      } else {
        connStatus = 'error';
        connDetails = `Firestore connection test returned: ${errMsg}`;
        issues.push(connDetails);
      }
    }
  }

  const report: FirestoreDiagnosticReport = {
    timestamp,
    configValidation: {
      isValid: credentialsValid,
      credentials,
      issues,
    },
    connection: {
      status: connStatus,
      latencyMs,
      details: connDetails,
      isLive,
    },
    summary: isLive
      ? `✅ Firestore credentials and live connection are healthy (${connStatus}).`
      : `⚠️ Firestore connection or config issue detected: ${issues.join('; ')}`,
  };

  // Structured console output
  if (!options?.silentConsole && typeof console !== 'undefined') {
    const isSuccess = isLive && credentialsValid;
    const headerStyle = isSuccess
      ? 'background: #2B4D3E; color: #FFFFFF; font-weight: bold; padding: 3px 8px; border-radius: 4px;'
      : 'background: #b91c1c; color: #FFFFFF; font-weight: bold; padding: 3px 8px; border-radius: 4px;';

    console.groupCollapsed(
      `%c[Firestore Diagnostic] ${isSuccess ? '✅ Healthy' : '⚠️ Warning'} - Database: ${firebaseConfig.firestoreDatabaseId || 'default'}`,
      headerStyle
    );

    console.log('%cCredentials Validation Table (firebase-applet-config.json):', 'font-weight: bold;');
    console.table(
      credentials.map((c) => ({
        Credential: c.key,
        Status: c.valid ? '✅ VALID' : '❌ INVALID',
        Value: c.value,
        Notes: c.notes,
      }))
    );

    console.log(
      `%cConnection Status: %c${connStatus.toUpperCase()} ${latencyMs ? `(${latencyMs}ms)` : ''}`,
      'font-weight: bold;',
      isSuccess ? 'color: #10b981; font-weight: bold;' : 'color: #f59e0b; font-weight: bold;'
    );
    console.info('[Diagnostic Details]:', connDetails);

    if (issues.length > 0) {
      console.warn('[Identified Issues / Recommendations]:', issues);
    }

    console.groupEnd();
  }

  return report;
}

// Auto-run in browser in background on boot once
if (typeof window !== 'undefined') {
  setTimeout(() => {
    runFirestoreDiagnostic().catch((e) => {
      console.warn('[Firestore Diagnostic auto-run notice]:', e);
    });
  }, 350);
}
