import { useLang } from '../contexts/LanguageContext';

export default function StatusChip({ available, sold_out, next_batch_time, stock }: { available: boolean; sold_out: boolean; next_batch_time?: string; stock?: number }) {
  const { t, lang } = useLang();
  if (sold_out || (typeof stock === 'number' && stock <= 0)) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-chili/10 text-chili px-3 py-1 text-xs font-semibold">
        <span className="h-2 w-2 rounded-full bg-chili" />
        {t.soldOut}{next_batch_time ? ` · ${t.nextBatch} ${next_batch_time}` : ''}
      </div>
    );
  }
  if (!available) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-ink/10 text-ink-muted px-3 py-1 text-xs font-semibold">
        <span className="h-2 w-2 rounded-full bg-ink-muted" />
        {lang === 'th' ? 'พักชั่วคราว' : 'Paused'}
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-forest/10 text-forest px-3 py-1 text-xs font-semibold">
      <span className="h-2 w-2 rounded-full bg-forest pulse-dot" />
      {t.availableNow}
      {typeof stock === 'number' && stock > 0 && stock < 20 ? <span className="text-terracotta">· {stock}</span> : null}
    </div>
  );
}
