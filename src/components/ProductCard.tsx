import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { Product } from '../types';
import { useLang } from '../contexts/LanguageContext';
import StatusChip from './StatusChip';
import { baht } from '../lib/format';

export default function ProductCard({ product, onTap }: { product: Product; onTap: () => void }) {
  const { lang } = useLang();
  const soldOut = product.sold_out || product.stock <= 0;
  const isLowStock = !soldOut && product.stock > 0 && product.stock <= 10;

  return (
    <motion.button
      onClick={onTap}
      disabled={soldOut || !product.available}
      whileTap={soldOut ? {} : { scale: 0.97 }}
      className={`group text-left rounded-3xl liquid-glass border overflow-hidden shadow-xs transition-all ${
        soldOut
          ? 'border-white/40 opacity-70 cursor-not-allowed'
          : isLowStock
          ? 'border-amber-400/50 hover:border-amber-500 hover:shadow-lg'
          : 'border-white/70 hover:shadow-lg hover:border-forest/30'
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-forest/5">
        <img
          src={product.image_url}
          alt={lang === 'th' ? product.name_th : product.name_en}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-transform duration-500 ${
            soldOut ? 'grayscale contrast-75' : 'group-hover:scale-105'
          }`}
        />
        {soldOut && (
          <div className="absolute inset-0 bg-forest-dark/45 backdrop-blur-[3px] flex flex-col items-center justify-center p-3 text-center">
            <div className="px-3.5 py-1.5 rounded-full bg-chili text-cream text-xs font-bold shadow-md">
              {lang === 'th' ? 'สินค้าหมด' : 'Out of Stock'}
            </div>
            {product.next_batch_time && (
              <div className="text-[11px] text-cream font-medium mt-1.5 bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                {lang === 'th' ? `รอบถัดไป ${product.next_batch_time}` : `Next batch ${product.next_batch_time}`}
              </div>
            )}
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 max-w-[calc(100%-1.25rem)]">
          <StatusChip
            available={product.available}
            sold_out={product.sold_out}
            next_batch_time={product.next_batch_time}
            stock={product.stock}
          />
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-thai font-bold text-ink text-base leading-tight">
              {lang === 'th' ? product.name_th : product.name_en}
            </div>
            <div className="text-xs text-ink-muted mt-0.5 truncate">
              {lang === 'th' ? product.name_en : product.name_th}
            </div>
            {isLowStock && (
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                <span>⚠️ {lang === 'th' ? `เหลือ ${product.stock} ชิ้นสุดท้าย` : `Only ${product.stock} left`}</span>
              </div>
            )}
          </div>
          <div className="font-display italic font-bold text-forest text-lg leading-none whitespace-nowrap">
            {baht(product.price)}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-[11px] text-ink-muted font-medium">
            {soldOut
              ? lang === 'th' ? 'หมดชั่วคราว' : 'Sold out'
              : lang === 'th' ? 'แตะเพื่อสั่ง' : 'Tap to order'}
          </div>
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center transition shadow-xs ${
              soldOut
                ? 'bg-ink/10 text-ink-muted cursor-not-allowed'
                : isLowStock
                ? 'bg-amber-600 text-cream group-hover:bg-amber-700'
                : 'bg-forest text-cream group-hover:bg-terracotta'
            }`}
          >
            <Plus className="h-4 w-4" />
          </div>
        </div>
      </div>
    </motion.button>
  );
}
