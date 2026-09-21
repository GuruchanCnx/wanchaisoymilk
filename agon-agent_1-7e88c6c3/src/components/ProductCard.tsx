import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { Product } from '../types';
import { useLang } from '../contexts/LanguageContext';
import StatusChip from './StatusChip';
import { baht } from '../lib/format';

export default function ProductCard({ product, onTap }: { product: Product; onTap: () => void }) {
  const { lang } = useLang();
  const soldOut = product.sold_out || product.stock <= 0;
  return (
    <motion.button
      onClick={onTap}
      disabled={soldOut || !product.available}
      whileTap={{ scale: 0.97 }}
      className="group text-left rounded-2xl bg-cream-soft border-2 border-forest/10 overflow-hidden shadow-sm hover:shadow-md hover:border-forest/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
    >
      <div className="relative aspect-square overflow-hidden bg-beige">
        <img
          src={product.image_url}
          alt={lang === 'th' ? product.name_th : product.name_en}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {soldOut && <div className="absolute inset-0 bg-cream/60 backdrop-blur-[1px] flex items-center justify-center">
          <div className="px-3 py-1.5 rounded-full bg-chili text-cream text-sm font-bold">{lang === 'th' ? 'หมดแล้ว' : 'Sold out'}</div>
        </div>}
        <div className="absolute top-2 left-2">
          <StatusChip available={product.available} sold_out={product.sold_out} next_batch_time={product.next_batch_time} stock={product.stock} />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-thai font-semibold text-ink text-base leading-tight">{lang === 'th' ? product.name_th : product.name_en}</div>
            <div className="text-xs text-ink-muted mt-0.5">{lang === 'th' ? product.name_en : product.name_th}</div>
          </div>
          <div className="font-display italic font-bold text-forest text-lg leading-none whitespace-nowrap">{baht(product.price)}</div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-ink-muted">{lang === 'th' ? 'แตะเพื่อสั่ง' : 'Tap to order'}</div>
          <div className="h-8 w-8 rounded-full bg-forest text-cream flex items-center justify-center group-hover:bg-terracotta transition">
            <Plus className="h-4 w-4" />
          </div>
        </div>
      </div>
    </motion.button>
  );
}
