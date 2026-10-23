import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Activity,
  RotateCw,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Terminal,
  Database,
  UserCheck,
  Key,
  X,
  Bug,
} from 'lucide-react';
import { useAuthDiagnostic } from '../hooks/useAuthDiagnostic';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';
import { firebaseConfig } from '../lib/firebase';

export default function AuthDiagnosticPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { lang } = useLang();
  const { showToast } = useToast();

  const {
    currentUser,
    isAuthenticated,
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
  } = useAuthDiagnostic();

  const handleCopyReport = () => {
    triggerHaptic('tap');
    const report = {
      timestamp: new Date().toISOString(),
      firebaseConfig: {
        projectId: firebaseConfig.projectId,
        firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
        authDomain: firebaseConfig.authDomain,
      },
      auth: {
        isAuthenticated,
        uid: currentUser?.uid || null,
        email: currentUser?.email || null,
        provider: currentUser?.providerData?.[0]?.providerId || null,
        tokenExpiration: tokenExpiration?.toISOString() || null,
        hasToken: Boolean(idToken),
      },
      last401Error: lastAuthError,
      recentLogs: authLogs.slice(0, 10),
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    showToast(
      lang === 'th' ? 'คัดลอกรายงานการวินิจฉัยแล้ว' : 'Diagnostic Report Copied',
      lang === 'th' ? 'นำข้อมูลไปตรวจสอบใน Console หรือส่งให้ทีมซัพพอร์ตได้' : 'Diagnostic payload copied to clipboard.',
      'info'
    );
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Discreet Diagnostic Trigger Button on bottom-left (desktop only to prevent mobile nav obstruction) */}
      <div className="hidden sm:block fixed bottom-4 left-4 z-20">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('tap');
            setIsOpen(!isOpen);
          }}
          title={lang === 'th' ? 'ระบบวินิจฉัย Auth & Firestore' : 'Auth & Firestore Diagnostic Tool'}
          className={`h-9 px-3 rounded-full shadow-lg flex items-center gap-1.5 text-xs font-mono font-bold transition active:scale-95 border backdrop-blur-md ${
            lastAuthError
              ? 'bg-chili text-white border-red-300 animate-pulse'
              : isAuthenticated
              ? 'bg-forest/90 text-cream border-emerald-400/30 hover:bg-forest'
              : 'bg-black/70 text-cream/90 border-white/20 hover:bg-black/90'
          }`}
        >
          <Bug className="h-3.5 w-3.5 text-honey" />
          <span className="hidden sm:inline">Auth Tool</span>
          {lastAuthError && <span className="h-2 w-2 rounded-full bg-yellow-300 animate-ping inline-block" />}
        </button>
      </div>

      {/* Floating Diagnostic Modal Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl max-h-[88vh] rounded-3xl bg-cream border border-forest/20 shadow-2xl flex flex-col overflow-hidden z-10"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-forest to-forest-dark text-cream flex items-center justify-between border-b border-white/20">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-honey">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display italic font-bold text-lg leading-tight">
                      Firebase Auth & 401 Diagnostics
                    </h3>
                    <div className="text-[11px] text-cream/80 font-mono">
                      DB: {firebaseConfig.firestoreDatabaseId}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1 transition"
                    title="Copy full JSON report"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{copied ? 'Copied' : 'Dump'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
                {/* Auth State Card */}
                <div className="rounded-2xl liquid-glass p-3.5 border border-forest/15">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-forest" />
                      <span className="text-xs font-bold uppercase tracking-wider text-forest">
                        Current Authentication State
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isAuthenticated
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {isAuthenticated ? 'Authenticated' : 'Anonymous / Guest'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-white/60 p-2 rounded-xl">
                      <span className="text-ink-muted block text-[10px]">User UID:</span>
                      <span className="text-forest font-bold truncate block">
                        {currentUser?.uid || 'None'}
                      </span>
                    </div>
                    <div className="bg-white/60 p-2 rounded-xl">
                      <span className="text-ink-muted block text-[10px]">Email:</span>
                      <span className="text-ink font-bold truncate block">
                        {currentUser?.email || 'banheruka@gmail.com (Store Owner)'}
                      </span>
                    </div>
                    <div className="bg-white/60 p-2 rounded-xl sm:col-span-2 flex items-center justify-between">
                      <div>
                        <span className="text-ink-muted block text-[10px]">Token Expiration:</span>
                        <span className="text-forest font-bold">
                          {tokenExpiration ? tokenExpiration.toLocaleTimeString() : 'N/A (Standard Token)'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={refreshToken}
                        disabled={isRefreshing}
                        className="h-7 px-2.5 rounded-lg bg-forest/10 hover:bg-forest/20 text-forest text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <RotateCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Last Caught 401 Error Alert (if present) */}
                {lastAuthError && (
                  <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs">
                    <div className="flex items-center gap-2 text-chili font-bold mb-1">
                      <AlertOctagon className="h-4 w-4" />
                      <span>Last Intercepted 401 Unauthorized Error</span>
                    </div>
                    <div className="font-mono text-ink text-[11px] bg-white/70 p-2 rounded-xl border border-red-100">
                      <div><strong className="text-chili">Path:</strong> {lastAuthError.path || 'Unknown'}</div>
                      <div><strong className="text-chili">Op:</strong> {lastAuthError.operationType}</div>
                      <div><strong className="text-chili">Time:</strong> {new Date(lastAuthError.timestamp).toLocaleTimeString()}</div>
                      <div className="text-ink-muted mt-1 truncate">{lastAuthError.error}</div>
                    </div>
                  </div>
                )}

                {/* Diagnostic Control Actions */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5" />
                    <span>Diagnostic Test Actions</span>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={runConfigDiagnostic}
                      className="h-10 px-3 rounded-xl bg-forest text-cream text-xs font-bold hover:bg-forest-dark transition flex items-center justify-center gap-1.5 shadow-xs"
                      title="Validate credentials in firebase-applet-config.json and live Firestore"
                    >
                      <Database className="h-3.5 w-3.5 text-honey" />
                      <span>Validate Config & DB</span>
                    </button>

                    <button
                      type="button"
                      onClick={simulate401Error}
                      className="h-10 px-3 rounded-xl bg-terracotta text-cream text-xs font-bold hover:bg-terracotta-dark transition flex items-center justify-center gap-1.5 shadow-xs"
                      title="Trigger synthetic 401 to test SessionExpiredModal"
                    >
                      <AlertOctagon className="h-3.5 w-3.5" />
                      <span>Test 401 Modal</span>
                    </button>

                    <button
                      type="button"
                      onClick={testFirestorePing}
                      className="h-10 px-3 rounded-xl bg-forest/80 text-cream text-xs font-bold hover:bg-forest transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Activity className="h-3.5 w-3.5" />
                      <span>Ping Firestore</span>
                    </button>

                    <button
                      type="button"
                      onClick={loginWithGoogle}
                      className="h-10 px-3 rounded-xl bg-cream border border-forest/30 text-forest text-xs font-bold hover:bg-forest/10 transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Shield className="h-3.5 w-3.5 text-honey" />
                      <span>Google Auth</span>
                    </button>
                  </div>
                </div>

                {/* Console Activity Log Feed */}
                <div className="rounded-2xl bg-forest-dark/95 text-cream p-3.5 font-mono text-[11px] shadow-inner">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                    <span className="flex items-center gap-1.5 text-honey font-bold">
                      <Terminal className="h-3.5 w-3.5" />
                      <span>Live Auth Event Stream</span>
                    </span>
                    <span className="text-[10px] text-white/50">{authLogs.length} events logged</span>
                  </div>

                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {authLogs.length === 0 ? (
                      <div className="text-white/40 italic">Monitoring session activity...</div>
                    ) : (
                      authLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-white/40 text-[10px] shrink-0">{log.timestamp}</span>
                          <span
                            className={
                              log.level === 'error'
                                ? 'text-red-400 font-bold'
                                : log.level === 'warn'
                                ? 'text-amber-300'
                                : log.level === 'success'
                                ? 'text-emerald-300'
                                : 'text-cream/80'
                            }
                          >
                            {log.message}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
