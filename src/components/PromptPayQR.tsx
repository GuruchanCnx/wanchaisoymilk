import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  Copy,
  Check,
  Download,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { baht } from '../lib/format';

interface PromptPayQRProps {
  amount: number;
  promptPayId?: string;
  merchantName?: string;
  onConfirmPaid?: () => void;
}

export default function PromptPayQR({
  amount,
  promptPayId = '081-234-5678',
  merchantName = 'วันใจ Soy (Wanchai Soy Milk)',
  onConfirmPaid,
}: {
  amount: number;
  promptPayId?: string;
  merchantName?: string;
  onConfirmPaid?: () => void;
}) {
  const { lang } = useLang();
  const [copied, setCopied] = useState(false);
  const [isPaidChecked, setIsPaidChecked] = useState(false);

  const copyToClipboard = () => {
    const rawNumber = promptPayId.replace(/-/g, '');
    navigator.clipboard?.writeText(rawNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl border-2 border-forest/20 bg-cream-soft overflow-hidden shadow-sm">
      {/* Thai QR Header Banner */}
      <div className="bg-[#003B71] text-white px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center p-1">
            <QrCode className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest uppercase opacity-80">
              Thai QR Payment
            </div>
            <div className="font-bold text-sm tracking-wide">
              พร้อมเพย์ · PromptPay
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] bg-white/15 px-2.5 py-1 rounded-full">
          <ShieldCheck className="h-3.5 w-3.5 text-honey" />
          <span>{lang === 'th' ? 'สแกนได้ทุกธนาคาร' : 'All Thai Banks'}</span>
        </div>
      </div>

      <div className="p-5 sm:p-6 text-center">
        {/* Merchant Info */}
        <div className="mb-3">
          <div className="text-xs uppercase tracking-wider text-ink-muted font-semibold">
            {lang === 'th' ? 'ร้านค้าผู้รับเงิน' : 'Merchant Name'}
          </div>
          <div className="font-thai font-bold text-forest text-lg mt-0.5">
            {merchantName}
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="font-mono text-xs text-ink-muted bg-cream px-2 py-0.5 rounded-md border border-forest/10">
              PromptPay: {promptPayId}
            </span>
            <button
              type="button"
              onClick={copyToClipboard}
              className="text-xs text-forest hover:text-terracotta flex items-center gap-1 font-semibold underline underline-offset-2"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-forest" />
                  <span className="text-forest">{lang === 'th' ? 'คัดลอกแล้ว' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>{lang === 'th' ? 'คัดลอกเลข' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* QR Code Presentation Box */}
        <div className="relative inline-block mx-auto my-2 p-3 bg-white rounded-2xl border-2 border-forest/20 shadow-md">
          <div className="w-52 h-52 sm:w-56 sm:h-56 rounded-xl overflow-hidden bg-white flex items-center justify-center relative">
            <img
              src="/images/qr-payment.jpg"
              alt="PromptPay QR Code"
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback SVG QR pattern if image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* Center PromptPay Emblem */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-9 w-9 rounded-xl bg-white border-2 border-[#003B71] shadow-md flex items-center justify-center p-1">
                <span className="font-bold text-[#003B71] text-xs font-mono">PP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Amount Display */}
        <div className="mt-3 bg-cream rounded-2xl p-3 border border-forest/15 max-w-xs mx-auto">
          <div className="text-[11px] uppercase tracking-wider text-ink-muted font-bold">
            {lang === 'th' ? 'ยอดที่ต้องชำระ' : 'Amount to Pay'}
          </div>
          <div className="font-display italic font-bold text-3xl text-forest mt-0.5">
            {baht(amount)}
          </div>
          <div className="text-[11px] text-ink-muted mt-1">
            {lang === 'th' ? 'ไม่มีค่าธรรมเนียม' : 'Zero transaction fees'}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">
          {lang === 'th' ? (
            <p>
              เปิดแอปธนาคารของคุณ (เช่น <strong>K PLUS, SCB EASY, Krungthai NEXT</strong>) แล้วเลือก{' '}
              <strong>"สแกนเพื่อจ่าย"</strong> ยอดเงินจะตรงกับออเดอร์พอดี
            </p>
          ) : (
            <p>
              Open any mobile banking app (e.g. <strong>K PLUS, SCB EASY, Bangkok Bank</strong>) and choose{' '}
              <strong>"Scan to Pay"</strong>.
            </p>
          )}
        </div>

        {/* Action / Confirmation Toggle */}
        <div className="mt-4 pt-4 border-t border-forest/10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-forest select-none">
            <input
              type="checkbox"
              checked={isPaidChecked}
              onChange={(e) => {
                setIsPaidChecked(e.target.checked);
                if (e.target.checked && onConfirmPaid) {
                  onConfirmPaid();
                }
              }}
              className="h-4 w-4 rounded text-forest focus:ring-forest border-forest/20"
            />
            <span>
              {lang === 'th' ? 'ฉันได้สแกนและโอนเงินเรียบร้อยแล้ว' : 'I have scanned & completed the transfer'}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
