import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, X, Download, Share2, Copy, Check, Sparkles, Smartphone } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { triggerHaptic } from '../lib/haptics';

interface MenuQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MenuQrModal({ isOpen, onClose }: MenuQrModalProps) {
  const { lang } = useLang();
  const [copied, setCopied] = useState(false);

  // Dynamic store menu URL
  const menuUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : 'https://wanchai.soy';
  
  // High-resolution SVG QR code representation encoded cleanly
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(
    menuUrl
  )}&bgcolor=FAF6EE&color=1B3B2B&qzone=2&margin=1`;

  const handleCopy = () => {
    triggerHaptic('medium');
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    triggerHaptic('medium');
    const a = document.createElement('a');
    a.href = qrSvgUrl;
    a.download = `wanchai-soy-menu-qr.png`;
    a.target = '_blank';
    a.click();
  };

  const handleShare = async () => {
    triggerHaptic('tap');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'วันใจ Soy — เมนูหน้าร้านออนไลน์',
          text: 'สแกนดูเมนูน้ำเต้าหู้ นมสด ปาท่องโก๋ แล้วกดสั่งล่วงหน้าได้ทันที',
          url: menuUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-forest/60 backdrop-blur-md flex items-center justify-center p-4 duo-modal-overlay"
        onClick={() => {
          triggerHaptic('tap');
          onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-cream w-full max-w-sm rounded-4xl overflow-hidden shadow-2xl border-4 border-forest p-6 flex flex-col items-center text-center duo-segment-center"
        >
          {/* Header */}
          <div className="w-full flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest/10 text-forest text-xs font-bold font-thai">
              <Sparkles className="h-3.5 w-3.5 text-honey" />
              <span>{lang === 'th' ? 'สแกนสั่งที่หน้าร้าน' : 'Table / Counter QR'}</span>
            </div>
            <button
              onClick={() => {
                triggerHaptic('tap');
                onClose();
              }}
              className="h-8 w-8 rounded-full bg-forest/10 flex items-center justify-center text-forest hover:bg-forest/20 transition active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h3 className="font-display italic font-bold text-2xl text-forest">
            {lang === 'th' ? 'เมนูออนไลน์วันใจ Soy' : 'Wanchai Soy Online Menu'}
          </h3>
          <p className="text-xs text-ink-muted mt-1 px-2">
            {lang === 'th'
              ? 'สแกน QR Code นี้เพื่อเปิดดูเมนู ปรับแต่งความหวาน และสั่งล่วงหน้าทันที'
              : 'Scan to open our live menu, customize sweetness & order on mobile directly.'}
          </p>

          {/* QR Code Container */}
          <div className="mt-4 p-4 rounded-3xl bg-white border-2 border-forest/20 shadow-md relative group">
            <img
              src={qrSvgUrl}
              alt="Wanchai Soy Menu QR"
              className="w-52 h-52 object-contain rounded-xl"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-10 w-10 rounded-xl bg-forest text-cream flex items-center justify-center shadow-lg border-2 border-cream">
                <span className="font-display italic font-bold text-xl leading-none">w</span>
              </div>
            </div>
          </div>

          <div className="mt-2 text-[11px] font-mono text-ink-muted truncate max-w-full px-2">
            {menuUrl}
          </div>

          {/* Action Buttons */}
          <div className="mt-5 grid grid-cols-3 gap-2 w-full">
            <button
              onClick={handleCopy}
              className="h-10 rounded-2xl bg-forest/10 hover:bg-forest/15 text-forest text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (lang === 'th' ? 'คัดลอก' : 'Copy')}</span>
            </button>

            <button
              onClick={handleDownload}
              className="h-10 rounded-2xl bg-forest/10 hover:bg-forest/15 text-forest text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>{lang === 'th' ? 'บันทึก' : 'Save'}</span>
            </button>

            <button
              onClick={handleShare}
              className="h-10 rounded-2xl bg-forest text-cream hover:bg-forest-dark text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              <Share2 className="h-4 w-4" />
              <span>{lang === 'th' ? 'แชร์' : 'Share'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
