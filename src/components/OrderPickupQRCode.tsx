import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Share2,
  Sparkles,
  Sun,
  ShieldCheck,
  X,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';
import { shortId } from '../lib/format';
import type { Order } from '../types';

interface OrderPickupQRCodeProps {
  order: Order;
  className?: string;
}

export default function OrderPickupQRCode({ order, className = '' }: OrderPickupQRCodeProps) {
  const { lang } = useLang();
  const { showToast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isMaxBright, setIsMaxBright] = useState(false);

  // Construct absolute unique order link for staff POS scanning
  const orderUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/order/${order.id}`
    : `/order/${order.id}`;

  useEffect(() => {
    // Generate high-resolution, contrast-rich QR code
    QRCode.toDataURL(orderUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: '#1c3329', // Deep Forest Brand Color
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H', // High error tolerance for quick scanning under sun/glare
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('QR Generation error:', err));
  }, [orderUrl]);

  const copyOrderLink = async () => {
    triggerHaptic('tap');
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(orderUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showToast(
          lang === 'th' ? 'คัดลอกลิงก์ออเดอร์แล้ว' : 'Order Link Copied',
          lang === 'th' ? 'แชร์ลิงก์นี้ให้เพื่อนหรือคนรับของได้ทันที' : 'Share this pickup link anytime',
          'success'
        );
      }
    } catch {}
  };

  const handleShare = async () => {
    triggerHaptic('medium');
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Wanchai Soy Milk Order #${order.id}`,
          text: lang === 'th'
            ? `รหัสรับของร้านวันใจ Soy: #${order.id} (${order.customer_name})`
            : `Pickup Code for Wanchai Soy: #${order.id} (${order.customer_name})`,
          url: orderUrl,
        });
      } catch {}
    } else {
      copyOrderLink();
    }
  };

  const downloadQrImage = () => {
    triggerHaptic('tap');
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `wanchai_pickup_order_${order.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(
      lang === 'th' ? 'บันทึกรูป QR Code แล้ว' : 'QR Image Saved',
      lang === 'th' ? 'บันทึกรูปลงในเครื่องสำหรับแสดงที่หน้าร้าน' : 'Image saved to your device',
      'success'
    );
  };

  return (
    <>
      <div
        className={`rounded-3xl liquid-glass border border-white/80 p-4 sm:p-5 shadow-sm text-center relative overflow-hidden transition-all ${
          isMaxBright ? 'bg-white shadow-xl ring-4 ring-amber-400' : ''
        } ${className}`}
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between pb-3 border-b border-forest/10 mb-3.5">
          <div className="flex items-center gap-2 text-left">
            <div className="h-8 w-8 rounded-xl bg-forest text-cream flex items-center justify-center shadow-xs">
              <QrCode className="h-4 w-4 text-honey" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display italic font-bold text-forest text-sm sm:text-base">
                  {lang === 'th' ? 'QR Code สแกนรับสินค้า' : 'Pickup Verification QR'}
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-honey/20 text-forest text-[9px] font-mono font-black uppercase">
                  Scan to Pick
                </span>
              </div>
              <p className="text-[10px] text-ink-muted">
                {lang === 'th'
                  ? 'แสดงหน้าจอนี้ให้พนักงานหน้าร้านสแกนรับสินค้า'
                  : 'Present to cashier for instant contactless identification'}
              </p>
            </div>
          </div>

          {/* Zoom & Brightness Quick Toggles */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsMaxBright(!isMaxBright);
              }}
              title={lang === 'th' ? 'เร่งความสว่างสำหรับสแกน' : 'Max Contrast for Scanning'}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition active:scale-95 ${
                isMaxBright
                  ? 'bg-amber-400 text-forest shadow-xs'
                  : 'bg-forest/10 hover:bg-forest/20 text-forest'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                setIsZoomed(true);
              }}
              title={lang === 'th' ? 'ขยายเต็มจอ' : 'Fullscreen QR'}
              className="h-8 w-8 rounded-full bg-forest/10 hover:bg-forest/20 text-forest flex items-center justify-center transition active:scale-95"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* QR Code Presentation Box */}
        <div className="relative inline-block mx-auto my-1">
          <div
            onClick={() => {
              triggerHaptic('tap');
              setIsZoomed(true);
            }}
            className="p-3 bg-white rounded-2xl border-2 border-forest/15 shadow-md hover:shadow-lg transition cursor-pointer group relative"
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code for Order #${order.id}`}
                className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg mx-auto"
              />
            ) : (
              <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center bg-forest/5 rounded-lg animate-pulse">
                <QrCode className="h-10 w-10 text-forest/30 animate-spin" />
              </div>
            )}

            {/* Tap to Zoom Overlay Hint */}
            <div className="absolute inset-0 bg-forest/80 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-cream text-xs font-bold gap-1 p-2">
              <Maximize2 className="h-6 w-6 text-honey" />
              <span>{lang === 'th' ? 'แตะเพื่อขยายใหญ่' : 'Tap to enlarge'}</span>
            </div>
          </div>

          {/* Order ID Pill Tag */}
          <div className="mt-2.5 flex items-center justify-center gap-1.5 font-mono text-xs font-bold text-forest">
            <span>{lang === 'th' ? 'รหัสออเดอร์:' : 'Order ID:'}</span>
            <span className="px-2 py-0.5 rounded-lg bg-forest text-cream font-mono text-xs">
              {shortId(order.id)}
            </span>
            <span className="text-ink-muted font-normal text-[11px]">
              ({order.customer_name})
            </span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="mt-3.5 pt-3 border-t border-forest/10 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={copyOrderLink}
            className="h-8.5 px-3 rounded-full bg-forest/10 hover:bg-forest/20 text-forest text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-forest" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (lang === 'th' ? 'คัดลอกลิงก์' : 'Copy Link')}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="h-8.5 px-3 rounded-full bg-forest/10 hover:bg-forest/20 text-forest text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>{lang === 'th' ? 'แชร์รหัส' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={downloadQrImage}
            className="h-8.5 px-3 rounded-full bg-forest text-cream hover:bg-forest-dark text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 text-honey" />
            <span>{lang === 'th' ? 'บันทึกรูป QR' : 'Save Image'}</span>
          </button>
        </div>
      </div>

      {/* Fullscreen Magnified QR Code Modal */}
      <AnimatePresence>
        {isZoomed && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsZoomed(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-4xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl relative border-4 border-amber-400"
            >
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 text-ink flex items-center justify-center transition active:scale-90"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-honey/20 text-amber-900 text-xs font-bold uppercase mb-3">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>{lang === 'th' ? 'แสดงเพื่อสแกนรับสินค้า' : 'Show to Cashier / Staff'}</span>
              </div>

              <h3 className="font-display italic font-bold text-2xl text-forest leading-tight">
                Order #{order.id}
              </h3>
              <p className="text-xs text-ink-muted mb-4 font-thai">
                {order.customer_name} · {order.pickup_time || 'ASAP'}
              </p>

              {/* Ultra Sharp Large QR Code */}
              <div className="p-3 bg-white border-2 border-forest/20 rounded-2xl shadow-inner mx-auto inline-block">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt={`Enlarged QR Code #${order.id}`}
                    className="w-64 h-64 sm:w-72 sm:h-72 object-contain mx-auto"
                  />
                )}
              </div>

              <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-thai leading-relaxed">
                {lang === 'th'
                  ? '✨ พนักงานหน้าร้านสามารถใช้แท็บเล็ต POS สแกน QR โค้ดนี้เพื่อตรวจสอบและส่งมอบออเดอร์ได้ทันที'
                  : '✨ Staff can scan this QR with the POS camera scanner to instantly confirm order pickup.'}
              </div>

              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="mt-5 w-full h-11 rounded-full bg-forest text-cream font-bold text-xs hover:bg-forest-dark transition active:scale-95 shadow-md"
              >
                {lang === 'th' ? 'ปิดหน้าต่าง' : 'Done'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
