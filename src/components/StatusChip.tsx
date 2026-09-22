import { AlertCircle, Flame, CheckCircle2 } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';

export default function StatusChip({
  available,
  sold_out,
  next_batch_time,
  stock,
}: {
  available: boolean;
  sold_out: boolean;
  next_batch_time?: string;
  stock?: number;
}) {
  const { t, lang } = useLang();
  const isOutOfStock = sold_out || (typeof stock === 'number' && stock <= 0);
  const isLowStock = !isOutOfStock && typeof stock === 'number' && stock > 0 && stock <= 10;

  if (isOutOfStock) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-chili/90 text-cream px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-xs">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>{lang === 'th' ? 'สินค้าหมด (Out of Stock)' : 'Out of Stock'}</span>
        {next_batch_time ? <span className="opacity-90 font-normal">· {t.nextBatch} {next_batch_time}</span> : null}
      </div>
    );
  }

  if (!available) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-ink/75 text-cream px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-xs">
        <span className="h-2 w-2 rounded-full bg-cream/70" />
        <span>{lang === 'th' ? 'พักชั่วคราว' : 'Currently Paused'}</span>
      </div>
    );
  }

  if (isLowStock) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-600/90 text-cream px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-xs animate-pulse">
        <Flame className="h-3.5 w-3.5 text-amber-200" />
        <span>{lang === 'th' ? `เหลือน้อย (Low Stock) · เหลือ ${stock} ชิ้น` : `Low Stock · ${stock} left`}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-forest/90 text-cream px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-xs">
      <CheckCircle2 className="h-3.5 w-3.5 text-cream" />
      <span>{t.availableNow}</span>
      {typeof stock === 'number' && stock > 0 ? (
        <span className="opacity-80 text-[11px] font-normal">· {stock} {lang === 'th' ? 'ชิ้น' : 'left'}</span>
      ) : null}
    </div>
  );
}
