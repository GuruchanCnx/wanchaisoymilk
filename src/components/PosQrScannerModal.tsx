import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  X,
  Camera,
  RotateCcw,
  Check,
  ChefHat,
  Package,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Search,
  ExternalLink,
  Flame,
  ArrowRight,
  Flashlight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Order } from '../types';
import { baht, shortId, timeAgo } from '../lib/format';
import { triggerHaptic } from '../lib/haptics';

interface PosQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onUpdateOrderStatus: (id: number, patch: Partial<Order>) => Promise<void>;
  lang: 'th' | 'en';
}

export default function PosQrScannerModal({
  isOpen,
  onClose,
  orders,
  onUpdateOrderStatus,
  lang,
}: PosQrScannerModalProps) {
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualIdInput, setManualIdInput] = useState('');
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  // Play audio beep upon successful scan
  const playScanBeep = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {}
  };

  // Parse order ID from QR string or URL
  const parseOrderId = (qrText: string): number | null => {
    const trimmed = qrText.trim();

    // Check if it's an order URL: e.g. /order/1024 or https://.../order/1024
    const urlMatch = trimmed.match(/\/order\/(\d+)/i);
    if (urlMatch && urlMatch[1]) {
      return Number(urlMatch[1]);
    }

    // Check for JSON: {"orderId": 1024} or {"id": 1024}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        const id = parsed.orderId || parsed.id;
        if (id && !isNaN(Number(id))) return Number(id);
      } catch {}
    }

    // Check direct pattern like "#1024" or "order:1024" or "1024"
    const directMatch = trimmed.match(/(?:order[:#\s]*)?(\d+)/i);
    if (directMatch && directMatch[1]) {
      return Number(directMatch[1]);
    }

    return null;
  };

  // Find or fetch the order
  const processFoundOrderId = async (idNum: number) => {
    playScanBeep();
    triggerHaptic('success');

    // First check local orders list
    const found = orders.find((o) => Number(o.id) === idNum);
    if (found) {
      setScannedOrder(found);
      return;
    }

    // Otherwise fetch from API
    try {
      const res = await fetch(`/api/orders?id=${idNum}`);
      if (res.ok) {
        const data = await res.json();
        const o = Array.isArray(data) ? data[0] : data;
        if (o && o.id) {
          setScannedOrder(o);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch scanned order:', e);
    }

    setScannerError(
      lang === 'th'
        ? `ไม่พบข้อมูลออเดอร์ #${idNum} ในระบบ`
        : `Order #${idNum} not found in the system`
    );
  };

  // Start Camera QR Scanner
  const startScanner = async () => {
    setScannerError(null);
    setScannerActive(false);

    const elementId = 'pos-qr-reader';
    const container = document.getElementById(elementId);
    if (!container) return;

    try {
      if (html5QrCodeRef.current && isScanningRef.current) {
        await html5QrCodeRef.current.stop();
        isScanningRef.current = false;
      }

      const qrScanner = new Html5Qrcode(elementId);
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Success callback
          const orderId = parseOrderId(decodedText);
          if (orderId) {
            processFoundOrderId(orderId);
          } else {
            setScannerError(
              lang === 'th'
                ? `QR Code ไม่ถูกต้อง: ${decodedText.slice(0, 30)}`
                : `Unrecognized QR: ${decodedText.slice(0, 30)}`
            );
          }
        },
        (errorMessage) => {
          // Scan failure in individual frame (normal while searching)
        }
      );

      isScanningRef.current = true;
      setScannerActive(true);
    } catch (err: any) {
      console.warn('Camera scanner start error:', err);
      isScanningRef.current = false;
      setScannerActive(false);
      setScannerError(
        err?.message?.includes('Permission')
          ? lang === 'th'
            ? 'กรุณาอนุญาตให้เข้าถึงกล้อง เพื่อสแกน QR Code'
            : 'Please grant camera permission to scan QR code'
          : lang === 'th'
          ? 'ไม่สามารถเปิดกล้องได้ สามารถพิมพ์รหัสออเดอร์ด้านล่างได้ทันที'
          : 'Unable to start camera. You can type order ID below'
      );
    }
  };

  // Stop scanner
  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && isScanningRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        isScanningRef.current = false;
      }
    } catch {}
    setScannerActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      setScannedOrder(null);
      setManualIdInput('');
      setScannerError(null);
      // Small delay to allow DOM to render
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facingMode]);

  // Handle Manual Order Search
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseOrderId(manualIdInput);
    if (id) {
      processFoundOrderId(id);
    } else {
      setScannerError(lang === 'th' ? 'กรุณาระบุเลขที่ออเดอร์' : 'Please enter an order ID');
    }
  };

  // Handle Status Update from Sheet
  const handleStatusTransition = async (nextStatus: Order['status']) => {
    if (!scannedOrder) return;
    setIsUpdating(true);
    triggerHaptic('medium');

    try {
      await onUpdateOrderStatus(Number(scannedOrder.id), { status: nextStatus });
      setScannedOrder((prev) => (prev ? { ...prev, status: nextStatus } : null));
      triggerHaptic('success');
    } catch (e) {
      console.warn('Update order error:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="POS Camera QR Scanner"
    >
      <div className="relative w-full max-w-lg bg-forest-dark border-2 border-cream/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] text-cream">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-cream/15 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-honey text-forest flex items-center justify-center shadow-md">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display italic font-bold text-lg sm:text-xl text-cream leading-tight">
                {lang === 'th' ? 'สแกน QR ออเดอร์ลูกค้า' : 'Scan Customer Order QR'}
              </h3>
              <p className="text-[11px] text-cream/70 font-thai">
                {lang === 'th' ? 'สแกนใบเสร็จหรือหน้าจอมือถือลูกค้า' : 'Scan digital or printed receipt QR'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Camera Switcher (Front/Back) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
              }}
              className="h-9 w-9 rounded-full bg-cream/10 hover:bg-cream/20 text-cream flex items-center justify-center transition active:scale-95"
              title={lang === 'th' ? 'สลับกล้องหน้า/หลัง' : 'Switch Camera'}
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setSoundEnabled(!soundEnabled);
              }}
              className="h-9 w-9 rounded-full bg-cream/10 hover:bg-cream/20 text-cream flex items-center justify-center transition active:scale-95"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                onClose();
              }}
              className="h-9 w-9 rounded-full bg-cream/10 hover:bg-cream/20 text-cream flex items-center justify-center transition active:scale-95"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Scanner Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Active Scanned Order Card (If Found) */}
          <AnimatePresence>
            {scannedOrder && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="rounded-3xl bg-cream text-forest p-4 sm:p-5 shadow-xl border-2 border-honey"
              >
                {/* Order Header */}
                <div className="flex items-start justify-between pb-3 border-b border-forest/15">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-forest">
                        #{scannedOrder.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full uppercase ${
                          scannedOrder.status === 'ready'
                            ? 'bg-emerald-600 text-white'
                            : scannedOrder.status === 'preparing'
                            ? 'bg-terracotta text-cream'
                            : scannedOrder.status === 'done'
                            ? 'bg-forest/20 text-forest'
                            : 'bg-honey text-forest'
                        }`}
                      >
                        {scannedOrder.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-ink mt-0.5">
                      {scannedOrder.customer_name || (lang === 'th' ? 'ลูกค้าหน้าร้าน' : 'Walk-up Customer')}
                      {scannedOrder.phone ? ` · ${scannedOrder.phone}` : ''}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-display italic font-bold text-xl text-forest">
                      {baht(scannedOrder.total)}
                    </div>
                    <div className="text-[10px] text-ink-muted">
                      {scannedOrder.payment_method === 'cash' ? 'เงินสด (Cash)' : 'PromptPay QR'}
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="my-3 space-y-1.5 max-h-36 overflow-y-auto text-xs">
                  {scannedOrder.items?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1 border-b border-forest/10 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-md bg-forest/10 text-forest font-bold font-mono flex items-center justify-center text-[11px]">
                          {item.qty}x
                        </span>
                        <div>
                          <div className="font-bold text-forest text-xs">
                            {lang === 'th' ? item.name_th : item.name_en || item.name_th}
                          </div>
                          <div className="text-[10px] text-ink-muted">
                            {item.vessel === 'bag'
                              ? 'ถุง'
                              : item.vessel === 'cup'
                              ? 'แก้ว'
                              : item.vessel === 'own'
                              ? 'แก้วตัวเอง'
                              : 'ขวด'}{' '}
                            · {item.sweetness === 'none' ? 'ไม่หวาน' : item.sweetness === 'less' ? 'หวานน้อย' : 'หวานปกติ'}
                            {item.temp === 'hot' ? ' (ร้อน)' : item.temp === 'cold' ? ' (เย็น)' : ''}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono font-semibold">
                        ฿{(item.unit_price || item.base_price || 0) * (item.qty || 1)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Fast POS Pipeline Status Buttons */}
                <div className="pt-3 border-t border-forest/15 grid grid-cols-3 gap-2">
                  {/* Button 1: Start Boiling / Preparing */}
                  <button
                    type="button"
                    disabled={isUpdating || scannedOrder.status === 'preparing'}
                    onClick={() => handleStatusTransition('preparing')}
                    className={`h-11 rounded-2xl text-xs font-bold flex flex-col items-center justify-center transition active:scale-95 shadow-xs ${
                      scannedOrder.status === 'preparing'
                        ? 'bg-amber-100 text-amber-800 border-2 border-amber-400'
                        : 'bg-honey text-forest hover:bg-honey-dark'
                    }`}
                  >
                    <ChefHat className="h-4 w-4" />
                    <span className="text-[10px] mt-0.5">
                      {scannedOrder.status === 'preparing'
                        ? (lang === 'th' ? 'กำลังต้มสด' : 'Preparing')
                        : (lang === 'th' ? 'เริ่มต้มสด' : 'Start Boiling')}
                    </span>
                  </button>

                  {/* Button 2: Mark Ready */}
                  <button
                    type="button"
                    disabled={isUpdating || scannedOrder.status === 'ready'}
                    onClick={() => handleStatusTransition('ready')}
                    className={`h-11 rounded-2xl text-xs font-bold flex flex-col items-center justify-center transition active:scale-95 shadow-xs ${
                      scannedOrder.status === 'ready'
                        ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500'
                        : 'bg-terracotta text-cream hover:bg-terracotta-dark'
                    }`}
                  >
                    <Package className="h-4 w-4" />
                    <span className="text-[10px] mt-0.5">
                      {scannedOrder.status === 'ready'
                        ? (lang === 'th' ? 'พร้อมรับแล้ว' : 'Ready')
                        : (lang === 'th' ? 'ต้มเสร็จ/พร้อมรับ' : 'Mark Ready')}
                    </span>
                  </button>

                  {/* Button 3: Mark Done */}
                  <button
                    type="button"
                    disabled={isUpdating || scannedOrder.status === 'done'}
                    onClick={() => handleStatusTransition('done')}
                    className={`h-11 rounded-2xl text-xs font-bold flex flex-col items-center justify-center transition active:scale-95 shadow-xs ${
                      scannedOrder.status === 'done'
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-forest text-cream hover:bg-forest-dark'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    <span className="text-[10px] mt-0.5">
                      {scannedOrder.status === 'done'
                        ? (lang === 'th' ? 'ส่งมอบแล้ว' : 'Done')
                        : (lang === 'th' ? 'ส่งมอบลูกค้า' : 'Complete')}
                    </span>
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setScannedOrder(null);
                      startScanner();
                    }}
                    className="text-xs text-forest font-semibold underline hover:text-terracotta flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>{lang === 'th' ? 'สแกนออเดอร์อื่นต่อ' : 'Scan Next Order'}</span>
                  </button>

                  <a
                    href={`/order/${scannedOrder.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-ink-muted hover:text-forest flex items-center gap-1"
                  >
                    <span>{lang === 'th' ? 'เปิดหน้ารายละเอียด' : 'Full Page'}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Camera Viewfinder Box */}
          <div className="relative rounded-3xl overflow-hidden bg-black border border-cream/20 shadow-inner flex flex-col items-center justify-center min-h-[260px] sm:min-h-[280px]">
            {/* Target element for html5-qrcode */}
            <div id="pos-qr-reader" className="w-full h-full" />

            {/* Viewfinder Reticle Overlay */}
            {scannerActive && !scannedOrder && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 border-2 border-honey/60 rounded-3xl relative">
                  {/* Corner accents */}
                  <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-honey rounded-tl-xl" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-honey rounded-tr-xl" />
                  <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-honey rounded-bl-xl" />
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-honey rounded-br-xl" />

                  {/* Animated Scanning Laser Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-honey to-transparent animate-pulse shadow-[0_0_8px_#E8B44A] absolute top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            {!scannerActive && (
              <div className="p-6 text-center z-10">
                <Camera className="h-10 w-10 text-cream/40 mx-auto mb-2 animate-pulse" />
                <p className="text-xs text-cream/70 font-thai">
                  {lang === 'th' ? 'กำลังเริ่มต้นกล้องเพื่อสแกน...' : 'Initializing device camera...'}
                </p>
                <button
                  type="button"
                  onClick={startScanner}
                  className="mt-3 px-4 py-1.5 rounded-full bg-honey text-forest text-xs font-bold shadow-md hover:bg-honey-dark"
                >
                  {lang === 'th' ? 'ลองเปิดกล้องอีกครั้ง' : 'Retry Camera'}
                </button>
              </div>
            )}
          </div>

          {/* Error Notice */}
          {scannerError && (
            <div className="p-3 rounded-2xl bg-chili/20 border border-chili/40 text-cream flex items-center gap-2 text-xs">
              <AlertCircle className="h-4 w-4 text-chili shrink-0" />
              <span>{scannerError}</span>
            </div>
          )}

          {/* Manual Input Fallback */}
          <form
            onSubmit={handleManualSearch}
            className="rounded-2xl bg-black/40 border border-cream/15 p-3 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50 pointer-events-none" />
              <input
                type="text"
                value={manualIdInput}
                onChange={(e) => setManualIdInput(e.target.value)}
                placeholder={
                  lang === 'th'
                    ? 'หรือพิมพ์เลขที่ออเดอร์ เช่น 1024...'
                    : 'Or enter order ID e.g. 1024...'
                }
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-forest-dark border border-cream/20 text-cream text-xs font-mono focus:outline-none focus:border-honey placeholder:text-cream/40"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-4 rounded-xl bg-honey text-forest font-bold text-xs flex items-center gap-1 hover:bg-honey-dark transition active:scale-95 shrink-0"
            >
              <span>{lang === 'th' ? 'ค้นหา' : 'Find'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-cream/15 bg-black/30 flex items-center justify-between text-xs text-cream/70">
          <span className="font-thai">
            {lang === 'th' ? 'รองรับ QR จากมือถือลูกค้า และใบเสร็จกระดาษ' : 'Supports phone screen & paper QR'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-cream/10 hover:bg-cream/20 text-cream text-xs font-bold transition"
          >
            {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
