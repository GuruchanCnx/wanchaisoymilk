import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardPaste,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Info,
  Package,
  Layers,
  HelpCircle,
} from 'lucide-react';
import type { Product } from '../types';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';
import { baht } from '../lib/format';

interface BatchInventoryUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onBatchUpdated: () => Promise<void>;
}

interface ParsedBatchRow {
  rawLine: string;
  matchedProduct: Product | null;
  parsedNameOrId: string;
  parsedQuantity: number | null;
  parsedPrice?: number | null;
  isMatched: boolean;
  error?: string;
  calculatedStock: number;
  calculatedPrice: number;
}

export default function BatchInventoryUpdateModal({
  isOpen,
  onClose,
  products,
  onBatchUpdated,
}: BatchInventoryUpdateModalProps) {
  const { lang } = useLang();
  const { showToast } = useToast();

  const [rawText, setRawText] = useState('');
  const [updateMode, setUpdateMode] = useState<'set' | 'add'>('set');
  const [updatePrice, setUpdatePrice] = useState(true);
  const [autoUnmarkSoldOut, setAutoUnmarkSoldOut] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // Helper function to match text to a Product
  const findProductMatch = useCallback((query: string): Product | null => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    // 1. Direct Numeric ID match
    const numId = parseInt(q, 10);
    if (!isNaN(numId) && String(numId) === q) {
      const match = products.find((p) => p.id === numId);
      if (match) return match;
    }

    // 2. Direct Slug match
    const slugMatch = products.find((p) => p.slug.toLowerCase() === q);
    if (slugMatch) return slugMatch;

    // 3. Exact Thai or English name match
    const exactName = products.find(
      (p) =>
        p.name_th.trim().toLowerCase() === q ||
        p.name_en.trim().toLowerCase() === q
    );
    if (exactName) return exactName;

    // 4. Substring / Fuzzy match
    const partialName = products.find(
      (p) =>
        p.name_th.toLowerCase().includes(q) ||
        p.name_en.toLowerCase().includes(q) ||
        q.includes(p.name_th.toLowerCase()) ||
        q.includes(p.name_en.toLowerCase())
    );
    if (partialName) return partialName;

    // 5. Common shorthand keyword matchers
    if (q.includes('เต้าหู้') || q.includes('soymilk') || q.includes('soy milk')) {
      return products.find((p) => p.slug === 'soy-milk') || null;
    }
    if (q.includes('นมวัว') || q.includes('cow') || q.includes('หนองโพ')) {
      return products.find((p) => p.slug === 'cow-milk') || null;
    }
    if (q.includes('น้ำขิง') || q.includes('ginger')) {
      return products.find((p) => p.slug === 'ginger-tea') || null;
    }
    if (q.includes('ปาท่องโก๋') || q.includes('patongko') || q.includes('dough')) {
      return products.find((p) => p.slug === 'patongko') || null;
    }
    if (q.includes('เต้าฮวย') || q.includes('pudding') || q.includes('douhua')) {
      return products.find((p) => p.slug === 'douhua-ginger') || null;
    }
    if (q.includes('สังขยา') || q.includes('pandan') || q.includes('custard')) {
      return products.find((p) => p.slug === 'pandan-dip') || null;
    }

    return null;
  }, [products]);

  // Live intelligent parser of pasted text
  const parsedRows: ParsedBatchRow[] = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

    return lines.map((line) => {
      // Split on tabs, commas, pipes, or colons
      let tokens: string[] = [];
      if (line.includes('\t')) {
        tokens = line.split('\t').map((s) => s.trim());
      } else if (line.includes(',')) {
        tokens = line.split(',').map((s) => s.trim());
      } else if (line.includes('|')) {
        tokens = line.split('|').map((s) => s.trim());
      } else if (line.includes(':')) {
        tokens = line.split(':').map((s) => s.trim());
      } else if (line.includes(' - ')) {
        tokens = line.split(' - ').map((s) => s.trim());
      } else {
        // Space separated: could be "Soy Milk 50 20" or "น้ำเต้าหู้ 50"
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          // Check if last token is numeric
          const lastNum = parseFloat(parts[parts.length - 1]);
          if (!isNaN(lastNum)) {
            // Check if second to last is also numeric
            const prevNum = parts.length >= 3 ? parseFloat(parts[parts.length - 2]) : NaN;
            if (!isNaN(prevNum)) {
              const name = parts.slice(0, parts.length - 2).join(' ');
              tokens = [name, String(prevNum), String(lastNum)];
            } else {
              const name = parts.slice(0, parts.length - 1).join(' ');
              tokens = [name, String(lastNum)];
            }
          } else {
            tokens = [line];
          }
        } else {
          tokens = [line];
        }
      }

      if (tokens.length < 2) {
        return {
          rawLine: line,
          matchedProduct: null,
          parsedNameOrId: tokens[0] || line,
          parsedQuantity: null,
          isMatched: false,
          error: lang === 'th' ? 'ไม่พบจำนวนสต็อกในบรรทัด' : 'Missing quantity column',
          calculatedStock: 0,
          calculatedPrice: 0,
        };
      }

      const rawIdentifier = tokens[0];
      const rawQty = tokens[1].replace(/[^0-9.-]/g, '');
      const parsedQty = parseFloat(rawQty);

      let parsedPriceVal: number | null = null;
      if (tokens.length >= 3) {
        const rawP = tokens[2].replace(/[^0-9.-]/g, '');
        const pNum = parseFloat(rawP);
        if (!isNaN(pNum)) parsedPriceVal = pNum;
      }

      const product = findProductMatch(rawIdentifier);

      if (!product) {
        return {
          rawLine: line,
          matchedProduct: null,
          parsedNameOrId: rawIdentifier,
          parsedQuantity: isNaN(parsedQty) ? null : parsedQty,
          parsedPrice: parsedPriceVal,
          isMatched: false,
          error: lang === 'th' ? 'ไม่พบสินค้าที่ตรงกันในระบบ' : 'Product not found in catalog',
          calculatedStock: 0,
          calculatedPrice: parsedPriceVal || 0,
        };
      }

      if (isNaN(parsedQty)) {
        return {
          rawLine: line,
          matchedProduct: product,
          parsedNameOrId: rawIdentifier,
          parsedQuantity: null,
          parsedPrice: parsedPriceVal,
          isMatched: false,
          error: lang === 'th' ? 'จำนวนสต็อกไม่ถูกต้อง' : 'Invalid quantity number',
          calculatedStock: product.stock ?? 0,
          calculatedPrice: parsedPriceVal ?? product.price,
        };
      }

      // Calculate new stock based on mode
      const currentStock = Number(product.stock) || 0;
      const targetStock = updateMode === 'add' ? currentStock + parsedQty : parsedQty;
      const finalStock = Math.max(0, Math.round(targetStock));
      const finalPrice = parsedPriceVal !== null && updatePrice ? Math.max(0, parsedPriceVal) : product.price;

      return {
        rawLine: line,
        matchedProduct: product,
        parsedNameOrId: rawIdentifier,
        parsedQuantity: parsedQty,
        parsedPrice: parsedPriceVal,
        isMatched: true,
        calculatedStock: finalStock,
        calculatedPrice: finalPrice,
      };
    });
  }, [rawText, findProductMatch, updateMode, updatePrice, lang]);

  const validMatchedRows = parsedRows.filter((r) => r.isMatched && r.matchedProduct);
  const unmatchedRows = parsedRows.filter((r) => !r.isMatched);

  // Copy current products as a TSV template for user convenience
  const copyCatalogTemplate = () => {
    triggerHaptic('tap');
    const header = 'Product Name\tStock Quantity\tPrice (THB)\n';
    const lines = products
      .map((p) => `${p.name_th}\t${p.stock ?? 30}\t${p.price}`)
      .join('\n');
    navigator.clipboard.writeText(header + lines);
    setCopiedTemplate(true);
    showToast(
      lang === 'th' ? 'คัดลอกตารางตัวอย่างแล้ว' : 'Copied Inventory Template',
      lang === 'th' ? 'นำไปวางใน Excel หรือ Google Sheets เพื่อแก้ไขได้ทันที' : 'Paste into Excel or Google Sheets to edit',
      'info'
    );
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  // Load sample text
  const loadExample = () => {
    triggerHaptic('selection');
    const example = `น้ำเต้าหู้แท้ทรงเครื่อง\t50\t20
นมวัวสดหนองโพ\t45\t25
น้ำขิงต้มสด\t35\t25
ปาท่องโก๋การบินไทย\t70\t15
เต้าฮวยน้ำขิง\t30\t30
สังขยาใบเตยสด\t40\t20`;
    setRawText(example);
  };

  // Execute batch update
  const handleApplyBatchUpdate = async () => {
    if (validMatchedRows.length === 0) return;

    triggerHaptic('medium');
    setIsSubmitting(true);

    try {
      const batchPayload = validMatchedRows.map((r) => {
        const p = r.matchedProduct!;
        const newStock = r.calculatedStock;
        const isSoldOut = autoUnmarkSoldOut ? newStock <= 0 : p.sold_out;

        const updateObj: Record<string, any> = {
          id: p.id,
          stock: newStock,
          sold_out: isSoldOut,
        };

        if (updatePrice && r.parsedPrice !== null && r.parsedPrice !== undefined) {
          updateObj.price = r.calculatedPrice;
        }

        return updateObj;
      });

      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: batchPayload }),
      });

      if (res.ok) {
        showToast(
          lang === 'th' ? 'อัปเดตสต็อกเป็นชุดสำเร็จ' : 'Batch Inventory Updated',
          lang === 'th'
            ? `อัปเดตข้อมูลสำเร็จทั้งหมด ${validMatchedRows.length} รายการ`
            : `Successfully updated ${validMatchedRows.length} products`,
          'success'
        );
        triggerHaptic('success');
        await onBatchUpdated();
        onClose();
        setRawText('');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(
          lang === 'th' ? 'เกิดข้อผิดพลาดในการอัปเดต' : 'Batch Update Failed',
          err.error || 'Server error',
          'alert'
        );
      }
    } catch (e: any) {
      console.warn('Batch update error', e);
      showToast(
        lang === 'th' ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์' : 'Network Error',
        e.message || '',
        'alert'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md overflow-y-auto">
        {/* Backdrop Dismiss */}
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-4xl max-h-[92vh] rounded-3xl bg-cream border border-forest/20 shadow-2xl flex flex-col overflow-hidden z-10 my-auto"
          role="dialog"
          aria-labelledby="batch-inventory-title"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-white/70 border-b border-forest/15 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-forest text-cream flex items-center justify-center shadow-md">
                <ClipboardPaste className="h-5 w-5 text-honey" />
              </div>
              <div>
                <h3 id="batch-inventory-title" className="font-display italic font-bold text-lg sm:text-xl text-forest leading-tight">
                  {lang === 'th' ? 'วางข้อมูลสต็อกเพื่ออัปเดตเป็นชุด (Batch Paste)' : 'Batch Paste Inventory Update'}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {lang === 'th'
                    ? 'คัดลอกจาก Excel, Google Sheets, หรือโน้ตข้อความ มาวางเพื่ออัปเดตจำนวนและราคาพร้อมกัน'
                    : 'Paste rows from Excel, Sheets, CSV, or text notes to bulk-update quantities'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full bg-forest/10 hover:bg-forest/20 text-forest flex items-center justify-center transition active:scale-95"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Action Bar: Templates & Samples */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyCatalogTemplate}
                  className="h-8.5 px-3 rounded-xl bg-forest/10 hover:bg-forest hover:text-cream text-forest text-xs font-bold flex items-center gap-1.5 transition active:scale-95 border border-forest/20 shadow-2xs"
                >
                  {copiedTemplate ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{lang === 'th' ? 'คัดลอกตารางสต็อกปัจจุบันไป Excel' : 'Copy Catalog to Excel'}</span>
                </button>

                <button
                  type="button"
                  onClick={loadExample}
                  className="h-8.5 px-3 rounded-xl bg-white/80 hover:bg-forest/10 text-forest text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border border-forest/15 shadow-2xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-honey" />
                  <span>{lang === 'th' ? 'ใส่ตัวอย่างทดลอง' : 'Load Sample Data'}</span>
                </button>
              </div>

              {rawText && (
                <button
                  type="button"
                  onClick={() => setRawText('')}
                  className="text-xs text-ink-muted hover:text-chili underline"
                >
                  {lang === 'th' ? 'ล้างข้อความ' : 'Clear'}
                </button>
              )}
            </div>

            {/* Paste Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="batch-paste-textarea" className="font-bold text-forest flex items-center gap-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-forest" />
                  <span>{lang === 'th' ? 'วางข้อมูลตารางที่นี่ (รองรับ Tab / Comma / รูปแบบข้อความ):' : 'Paste table data here (TSV, CSV, Colon, or Text):'}</span>
                </label>
                <span className="text-ink-muted text-[11px] font-mono">
                  {lang === 'th' ? 'รูปแบบ: [ชื่อสินค้า/ID] [จำนวน] [ราคาถ้ามี]' : 'Format: [Name or ID] [Stock] [Price]'}
                </span>
              </div>

              <textarea
                id="batch-paste-textarea"
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={
                  lang === 'th'
                    ? `น้ำเต้าหู้แท้ทรงเครื่อง\t50\t20\nนมวัวสดหนองโพ\t45\t25\nปาท่องโก๋การบินไทย\t60\t15\nเต้าฮวยน้ำขิง: 30`
                    : `Traditional Soy Milk\t50\t20\nFresh Cow Milk\t45\t25\nDeep Fried Dough\t60\t15\nGinger Douhua: 30`
                }
                className="w-full rounded-2xl bg-white/90 border border-forest/20 p-3.5 font-mono text-xs sm:text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-forest/30 shadow-inner"
              />
            </div>

            {/* Mode & Options Switches */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/60 border border-forest/15">
              {/* Update Mode */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-forest">
                  {lang === 'th' ? 'วิธีอัปเดตจำนวนสต็อก:' : 'Stock Quantity Mode:'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setUpdateMode('set');
                    }}
                    className={`flex-1 h-9 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      updateMode === 'set'
                        ? 'bg-forest text-cream shadow-xs'
                        : 'bg-white/70 text-forest hover:bg-forest/10 border border-forest/15'
                    }`}
                  >
                    <span>{lang === 'th' ? 'ตั้งค่าสต็อกใหม่ (Set)' : 'Set New Stock'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setUpdateMode('add');
                    }}
                    className={`flex-1 h-9 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      updateMode === 'add'
                        ? 'bg-forest text-cream shadow-xs'
                        : 'bg-white/70 text-forest hover:bg-forest/10 border border-forest/15'
                    }`}
                  >
                    <span>{lang === 'th' ? '+ บวกเพิ่มเดิม (Add)' : '+ Add to Current'}</span>
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-col justify-center space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-forest cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={updatePrice}
                    onChange={(e) => setUpdatePrice(e.target.checked)}
                    className="rounded border-forest/30 text-forest focus:ring-forest h-4 w-4"
                  />
                  <span>
                    {lang === 'th' ? 'อัปเดตราคาด้วยหากมีระบุในตาราง' : 'Update price if provided in table'}
                  </span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-forest cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoUnmarkSoldOut}
                    onChange={(e) => setAutoUnmarkSoldOut(e.target.checked)}
                    className="rounded border-forest/30 text-forest focus:ring-forest h-4 w-4"
                  />
                  <span>
                    {lang === 'th'
                      ? 'ปลดสถานะ "สินค้าหมด" อัตโนมัติหากสต็อก > 0'
                      : 'Auto unmark Sold Out when stock > 0'}
                  </span>
                </label>
              </div>
            </div>

            {/* Parsed Live Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-forest" />
                    <h4 className="font-display italic font-bold text-sm sm:text-base text-forest">
                      {lang === 'th' ? 'ตัวอย่างผลลัพธ์ที่จะอัปเดต (Preview Diff)' : 'Live Preview Diff'}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono">
                      {validMatchedRows.length} {lang === 'th' ? 'รายการตรงกัน' : 'matched'}
                    </span>
                    {unmatchedRows.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-chili/15 text-chili font-bold font-mono">
                        {unmatchedRows.length} {lang === 'th' ? 'ไม่พบสินค้า' : 'unmatched'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-forest/20 overflow-hidden bg-white/80 shadow-xs max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-forest text-cream sticky top-0 text-[11px] font-bold">
                      <tr>
                        <th className="py-2 px-3">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                        <th className="py-2 px-3">{lang === 'th' ? 'ข้อความที่ระบุ' : 'Input Key'}</th>
                        <th className="py-2 px-3">{lang === 'th' ? 'สินค้าที่ตรวจพบ' : 'Matched Product'}</th>
                        <th className="py-2 px-3 text-right">{lang === 'th' ? 'สต็อกเดิม ➔ ใหม่' : 'Stock Diff'}</th>
                        {updatePrice && (
                          <th className="py-2 px-3 text-right">{lang === 'th' ? 'ราคาเดิม ➔ ใหม่' : 'Price Diff'}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-forest/10 font-mono">
                      {parsedRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-forest/5 transition ${
                            !row.isMatched ? 'bg-chili/5 text-chili' : ''
                          }`}
                        >
                          <td className="py-2 px-3 whitespace-nowrap">
                            {row.isMatched ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>OK</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-chili font-bold text-[11px]" title={row.error}>
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>{row.error}</span>
                              </span>
                            )}
                          </td>

                          <td className="py-2 px-3 font-semibold text-ink truncate max-w-[120px]">
                            {row.parsedNameOrId}
                          </td>

                          <td className="py-2 px-3 font-sans">
                            {row.matchedProduct ? (
                              <div>
                                <span className="font-bold text-forest">
                                  {lang === 'th' ? row.matchedProduct.name_th : row.matchedProduct.name_en}
                                </span>
                                <span className="ml-1.5 text-[10px] text-ink-muted">
                                  #{row.matchedProduct.id}
                                </span>
                              </div>
                            ) : (
                              <span className="text-ink-muted italic">---</span>
                            )}
                          </td>

                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            {row.matchedProduct ? (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-ink-muted">{row.matchedProduct.stock ?? 0}</span>
                                <ArrowRight className="h-3 w-3 text-forest" />
                                <span className="font-bold text-forest bg-forest/10 px-1.5 py-0.5 rounded">
                                  {row.calculatedStock}
                                </span>
                                {row.calculatedStock <= 0 && (
                                  <span className="text-[10px] text-chili font-bold ml-1">
                                    (Out)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span>-</span>
                            )}
                          </td>

                          {updatePrice && (
                            <td className="py-2 px-3 text-right whitespace-nowrap">
                              {row.matchedProduct && row.parsedPrice !== null && row.parsedPrice !== undefined ? (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-ink-muted">฿{row.matchedProduct.price}</span>
                                  <ArrowRight className="h-3 w-3 text-forest" />
                                  <span className="font-bold text-honey-dark">
                                    ฿{row.calculatedPrice}
                                  </span>
                                </div>
                              ) : row.matchedProduct ? (
                                <span className="text-ink-muted">฿{row.matchedProduct.price}</span>
                              ) : (
                                <span>-</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 bg-white/70 border-t border-forest/15 flex items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-ink-muted hidden sm:block">
              {validMatchedRows.length > 0 ? (
                <span>
                  {lang === 'th'
                    ? `พร้อมอัปเดต ${validMatchedRows.length} รายการ`
                    : `Ready to apply updates to ${validMatchedRows.length} products`}
                </span>
              ) : (
                <span>{lang === 'th' ? 'วางข้อมูลเพื่อเริ่มต้น' : 'Paste text above to preview'}</span>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-xl border border-forest/20 text-forest text-xs font-bold hover:bg-forest/10 transition active:scale-95"
              >
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={validMatchedRows.length === 0 || isSubmitting}
                onClick={handleApplyBatchUpdate}
                className={`h-10 px-5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition active:scale-95 ${
                  validMatchedRows.length > 0 && !isSubmitting
                    ? 'bg-forest hover:bg-forest-dark text-cream'
                    : 'bg-forest/30 text-cream/70 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-honey" />
                    <span>{lang === 'th' ? 'กำลังบันทึก...' : 'Applying Batch...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-honey" />
                    <span>
                      {lang === 'th'
                        ? `ยืนยันอัปเดต ${validMatchedRows.length} รายการ`
                        : `Apply Update (${validMatchedRows.length} items)`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
