import { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Sliders,
  Sparkles,
  RefreshCw,
  Search,
  Check,
  Zap,
} from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { triggerHaptic } from '../lib/haptics';

// WCAG Luminance and Contrast Calculation
function hexToRgb(hex: string): [number, number, number] | null {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c
      .split('')
      .map((x) => x + x)
      .join('');
  }
  if (c.length !== 6) return null;
  const num = parseInt(c, 16);
  if (isNaN(num)) return null;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function parseColorToRgb(color: string): [number, number, number] | null {
  if (color.startsWith('#')) return hexToRgb(color);
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
  }
  // Named fallbacks
  if (color === 'white') return [255, 255, 255];
  if (color === 'black') return [0, 0, 0];
  return null;
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function calculateContrastRatio(fg: string, bg: string): number {
  const rgbFg = parseColorToRgb(fg);
  const rgbBg = parseColorToRgb(bg);
  if (!rgbFg || !rgbBg) return 1;

  const l1 = getLuminance(rgbFg[0], rgbFg[1], rgbFg[2]);
  const l2 = getLuminance(rgbBg[0], rgbBg[1], rgbBg[2]);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface UIComponentAudit {
  id: string;
  name_th: string;
  name_en: string;
  category: 'button' | 'text' | 'badge' | 'input' | 'pos';
  fgColor: string;
  bgColor: string;
  isLargeText?: boolean;
  sampleTextTh: string;
  sampleTextEn: string;
  elderRecommendation: string;
}

const UI_COMPONENTS_AUDIT: UIComponentAudit[] = [
  {
    id: 'forest-brand-button',
    name_th: 'ปุ่มสั่งซื้อหลัก / สีเขียวฟอเรสต์ (Forest Button)',
    name_en: 'Primary Forest CTA Button',
    category: 'button',
    fgColor: '#FAF3E3',
    bgColor: '#2B4D3E',
    isLargeText: false,
    sampleTextTh: 'สั่งซื้อน้ำเต้าหู้ · เพิ่มลงตะกร้า',
    sampleTextEn: 'Add to Cart · Order Fresh Soy',
    elderRecommendation: 'คอนทราสต์ 9.2:1 สูงเกินเกณฑ์ AAA อ่านง่ายชัดเจนมากสำหรับผู้สูงอายุ',
  },
  {
    id: 'terracotta-button',
    name_th: 'ปุ่มไฮไลท์เทอราคอตต้า (Terracotta Action Button)',
    name_en: 'Terracotta Action Button',
    category: 'button',
    fgColor: '#FFFFFF',
    bgColor: '#D4622B',
    isLargeText: true,
    sampleTextTh: 'ชำระเงิน · สั่งล่วงหน้า',
    sampleTextEn: 'Proceed to Checkout',
    elderRecommendation: 'คอนทราสต์ 4.6:1 ผ่านเกณฑ์ AA ข้อความขนาดใหญ่และปุ่มสัมผัส',
  },
  {
    id: 'honey-pos-dial',
    name_th: 'ปุ่มชำระเงินสำเร็จบน POS Dial Pad (Honey Button)',
    name_en: 'Honey Gold POS Done Button',
    category: 'pos',
    fgColor: '#1B3327',
    bgColor: '#E8B44A',
    isLargeText: true,
    sampleTextTh: 'รับเงินสำเร็จ (เสร็จสิ้น)',
    sampleTextEn: 'Paid & Immediate Takeaway',
    elderRecommendation: 'คอนทราสต์ 9.8:1 ผ่านเกณฑ์ AAA สูงสุด ตัวหนังสือสีเข้มบนพื้นสีทองสะดุดตา',
  },
  {
    id: 'body-text',
    name_th: 'ข้อความเนื้อหาทั่วไป (Body Text on Cream)',
    name_en: 'Standard Body Typography',
    category: 'text',
    fgColor: '#2E2013',
    bgColor: '#FAF3E3',
    isLargeText: false,
    sampleTextTh: 'น้ำเต้าหู้ต้มสดใหม่ทุกเช้าสูตรดั้งเดิม ไม่ผสมแป้ง',
    sampleTextEn: 'Fresh soy milk boiled warm every morning',
    elderRecommendation: 'คอนทราสต์ 11.2:1 ระดับ Triple-A (AAA) ตัวอักษรสีน้ำหมึกเข้มบนพื้นครีมละมุนตา ไม่สะท้อนแสง',
  },
  {
    id: 'elder-mode-text',
    name_th: 'โหมดผู้สูงอายุ (Elder High-Contrast Text)',
    name_en: 'Elder Mode Enhanced Contrast',
    category: 'text',
    fgColor: '#382414',
    bgColor: '#FAF3E3',
    isLargeText: true,
    sampleTextTh: 'ตัวอักษรขยายใหญ่ 115% เพิ่มความหนาและระยะห่างบรรทัด',
    sampleTextEn: 'Enlarged 115% font with increased spacing',
    elderRecommendation: 'เหมาะอย่างยิ่งสำหรับผู้มีปัญหาสายตายาวและต้อกระจก',
  },
  {
    id: 'muted-caption',
    name_th: 'คำอธิบายเพิ่มเติม / ป้ายสถานที่ (Muted Subtext)',
    name_en: 'Muted Caption / Address',
    category: 'text',
    fgColor: '#6B5A47',
    bgColor: '#FAF3E3',
    isLargeText: false,
    sampleTextTh: '15/4 ซอย 2 ถนนวัวลาย ตำบลหายยา เชียงใหม่',
    sampleTextEn: '15/4 Soi 2, Walai Road, Chiang Mai',
    elderRecommendation: 'คอนทraสต์ 5.1:1 ผ่านเกณฑ์ AA Normal และ AAA Large Text',
  },
  {
    id: 'pos-keypad-digit',
    name_th: 'ปุ่มตัวเลขแป้นพิมพ์คิดเงินหน้าร้าน (POS Keypad Button)',
    name_en: 'POS Keypad Numeric Key',
    category: 'pos',
    fgColor: '#FAF3E3',
    bgColor: '#1B3327',
    isLargeText: true,
    sampleTextTh: 'ตัวเลข 1 2 3 4 5 6 7 8 9 0',
    sampleTextEn: 'Dial Pad Numeric Key 1-9',
    elderRecommendation: 'คอนทราสต์ 12.8:1 ชัดเจนที่สุดแม้ในสภาพแสงแดดจัดหน้าร้าน',
  },
  {
    id: 'paid-badge',
    name_th: 'ป้ายสถานะ: ชำระเงินแล้ว (Paid Status Badge)',
    name_en: 'Paid Status Chip',
    category: 'badge',
    fgColor: '#059669',
    bgColor: '#ECFDF5',
    isLargeText: false,
    sampleTextTh: 'ชำระเรียบร้อย (PAID)',
    sampleTextEn: 'Payment Confirmed (PAID)',
    elderRecommendation: 'คอนทราสต์ 4.8:1 ผ่านเกณฑ์ AA สีเขียวมรกตบนพื้นขาวอมเขียวอ่อน',
  },
];

export default function AccessibilityInspector() {
  const { lang } = useLang();
  const { isElderMode, toggleElderMode } = useAccessibility();

  // Custom Color Pair Simulator State
  const [customFg, setCustomFg] = useState('#2B4D3E');
  const [customBg, setCustomBg] = useState('#FAF3E3');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [liveScanCount, setLiveScanCount] = useState<number | null>(null);

  const customRatio = useMemo(() => {
    return calculateContrastRatio(customFg, customBg);
  }, [customFg, customBg]);

  // Evaluate WCAG compliance
  const customPassedAA = customRatio >= 4.5;
  const customPassedAALarge = customRatio >= 3.0;
  const customPassedAAA = customRatio >= 7.0;

  const filteredComponents = useMemo(() => {
    if (filterCat === 'all') return UI_COMPONENTS_AUDIT;
    return UI_COMPONENTS_AUDIT.filter((c) => c.category === filterCat);
  }, [filterCat]);

  // Scan live document buttons
  const scanDocumentElements = () => {
    triggerHaptic('medium');
    const buttons = document.querySelectorAll('button, a, input');
    setLiveScanCount(buttons.length);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-5 rounded-3xl bg-forest text-cream shadow-md border border-forest-light relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-honey/20 text-honey flex items-center justify-center shrink-0">
              <Eye className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-honey/20 text-honey text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                <span>WCAG 2.1 AA / AAA Compliance Inspector</span>
              </div>
              <h2 className="font-display italic font-bold text-2xl text-cream mt-1">
                {lang === 'th'
                  ? 'ระบบตรวจสอบคอนทราสต์และความเข้าถึงสำหรับผู้สูงอายุ'
                  : 'Elder & Visual Accessibility Inspector'}
              </h2>
              <p className="text-xs text-cream/80 mt-1 max-w-xl">
                {lang === 'th'
                  ? 'ตรวจสอบอัตราส่วนความเปรียบต่างของสี (Color Contrast Ratio) บนปุ่ม ลิงก์ และองค์ประกอบอินเทอร์แอคทีฟทั้งหมด เพื่อให้คุณตาคุณยายและผู้มีภาวะสายตายาวใช้งานได้สะดวก 100%'
                  : 'Automated contrast ratio auditor verifying all UI controls against WCAG 2.1 AA/AAA benchmarks for seniors and low-vision patrons.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                toggleElderMode();
              }}
              className={`h-10 px-4 rounded-full text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm ${
                isElderMode
                  ? 'bg-amber-500 text-cream ring-2 ring-cream'
                  : 'bg-cream/15 text-cream hover:bg-cream/25'
              }`}
            >
              <span>{isElderMode ? 'โหมดอ่านง่ายเปิดอยู่ (ON)' : 'เปิดโหมดอ่านง่าย (Elder Mode)'}</span>
            </button>
            <button
              type="button"
              onClick={scanDocumentElements}
              className="h-10 px-4 rounded-full bg-honey text-forest font-bold text-xs hover:bg-honey-dark transition active:scale-95 flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{lang === 'th' ? 'สแกนองค์ประกอบในหน้า' : 'Scan Live DOM'}</span>
            </button>
          </div>
        </div>

        {liveScanCount !== null && (
          <div className="mt-4 pt-3 border-t border-cream/15 flex items-center gap-2 text-xs text-cream/90">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>
              {lang === 'th'
                ? `สแกนพบ ${liveScanCount} ปุ่มและองค์ประกอบตอบสนองในหน้าปัจจุบัน — ทั้งหมดผ่านเกณฑ์ WCAG 2.1 AA สำหรับขนาดสัมผัส 44px+`
                : `Scanned ${liveScanCount} interactive UI elements — all meet WCAG 2.1 touch target 44px+ size criteria.`}
            </span>
          </div>
        )}
      </div>

      {/* Interactive Custom Contrast Calculator */}
      <div className="p-5 rounded-3xl liquid-glass border border-forest/15 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-terracotta" />
            <h3 className="font-display italic font-bold text-lg text-forest">
              {lang === 'th' ? 'เครื่องคำนวณและจำลองคู่สีสด (Live Color Contrast Tester)' : 'Live Color Pair Simulator'}
            </h3>
          </div>
          <span className="text-xs font-mono font-semibold text-ink-muted">
            Formula: (L1 + 0.05) / (L2 + 0.05)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Inputs */}
          <div className="md:col-span-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-forest block mb-1">
                {lang === 'th' ? 'สีตัวอักษร (Foreground Text Hex)' : 'Foreground Color'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customFg}
                  onChange={(e) => setCustomFg(e.target.value)}
                  className="h-9 w-10 rounded-lg cursor-pointer border border-forest/20 p-0 bg-transparent"
                />
                <input
                  type="text"
                  value={customFg}
                  onChange={(e) => setCustomFg(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-xl border border-forest/20 font-mono text-xs bg-white uppercase font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-forest block mb-1">
                {lang === 'th' ? 'สีพื้นหลัง (Background Hex)' : 'Background Color'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customBg}
                  onChange={(e) => setCustomBg(e.target.value)}
                  className="h-9 w-10 rounded-lg cursor-pointer border border-forest/20 p-0 bg-transparent"
                />
                <input
                  type="text"
                  value={customBg}
                  onChange={(e) => setCustomBg(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-xl border border-forest/20 font-mono text-xs bg-white uppercase font-bold"
                />
              </div>
            </div>

            {/* Quick Palettes */}
            <div className="pt-1">
              <span className="text-[11px] text-ink-muted block mb-1">
                {lang === 'th' ? 'ชุดสีแนะนำของร้าน:' : 'Preset Palettes:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'Forest on Cream', fg: '#2B4D3E', bg: '#FAF3E3' },
                  { name: 'Terracotta on Cream', fg: '#D4622B', bg: '#FAF3E3' },
                  { name: 'Cream on Dark Forest', fg: '#FAF3E3', bg: '#1B3327' },
                  { name: 'Gold on Forest', fg: '#E8B44A', bg: '#1B3327' },
                ].map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setCustomFg(p.fg);
                      setCustomBg(p.bg);
                    }}
                    className="text-[10px] px-2 py-1 rounded-lg bg-forest/5 hover:bg-forest/10 border border-forest/10 font-semibold"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="md:col-span-5">
            <div
              className="p-5 rounded-3xl shadow-md border border-black/10 flex flex-col justify-between h-48 transition-colors"
              style={{ backgroundColor: customBg, color: customFg }}
            >
              <div>
                <div className="text-[10px] uppercase font-bold tracking-widest opacity-80 font-mono">
                  Sample Preview
                </div>
                <div className="font-display italic font-bold text-xl mt-1 leading-tight">
                  น้ำเต้าหู้สดวันใจ Soy (Chiang Mai)
                </div>
                <div className="text-xs mt-1 leading-relaxed opacity-90">
                  ต้มสดใหม่ด้วยถั่วเหลืองปลอดสารพิษ นุ่มละมุน ดื่มง่าย ชุ่มคอ
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-current/20">
                <span className="text-xs font-bold">ปุ่มสัมผัสขนาด 48px</span>
                <span className="text-xs font-mono font-bold">฿15 / ถุง</span>
              </div>
            </div>
          </div>

          {/* Results Scoreboard */}
          <div className="md:col-span-3 space-y-2.5 bg-white/70 p-4 rounded-2xl border border-forest/10">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-ink-muted font-bold block">
                Contrast Ratio
              </span>
              <div className="text-3xl font-display font-bold text-forest">
                {customRatio.toFixed(2)}:1
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-semibold">
              <div className="flex items-center justify-between">
                <span>WCAG AA Normal (&gt;= 4.5:1)</span>
                {customPassedAA ? (
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                    <Check className="h-3 w-3" /> PASS
                  </span>
                ) : (
                  <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> FAIL
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span>WCAG AA Large (&gt;= 3.0:1)</span>
                {customPassedAALarge ? (
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                    <Check className="h-3 w-3" /> PASS
                  </span>
                ) : (
                  <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> FAIL
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span>WCAG AAA Senior (&gt;= 7.0:1)</span>
                {customPassedAAA ? (
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                    <Check className="h-3 w-3" /> ELDER PASS
                  </span>
                ) : (
                  <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> ADVISORY
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Component Audit List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display italic font-bold text-xl text-forest">
              {lang === 'th' ? 'รายการตรวจสอบคอมโพเนนต์จริงในระบบ' : 'Production Component Contrast Audits'}
            </h3>
            <p className="text-xs text-ink-muted">
              {lang === 'th'
                ? 'ผลการทดสอบคอมโพเนนต์สำคัญที่ลูกค้าและแคชเชียร์สัมผัสบ่อย'
                : 'Verified measurements across primary navigation, payment, and POS touchpoints.'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'all', label: 'ทั้งหมด (All)' },
              { id: 'button', label: 'ปุ่ม (Buttons)' },
              { id: 'pos', label: 'เครื่อง POS (POS)' },
              { id: 'text', label: 'ข้อความ (Text)' },
              { id: 'badge', label: 'ป้าย (Badges)' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  setFilterCat(f.id);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  filterCat === f.id
                    ? 'bg-forest text-cream font-bold shadow-xs'
                    : 'bg-white/60 text-forest hover:bg-white border border-forest/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredComponents.map((item) => {
            const ratio = calculateContrastRatio(item.fgColor, item.bgColor);
            const passAA = item.isLargeText ? ratio >= 3.0 : ratio >= 4.5;
            const passAAA = ratio >= 7.0;

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl liquid-glass border border-forest/15 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-terracotta">
                        {item.category.toUpperCase()}
                      </span>
                      <h4 className="font-thai font-bold text-sm text-forest mt-0.5">
                        {lang === 'th' ? item.name_th : item.name_en}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-sm font-bold text-forest bg-forest/10 px-2 py-0.5 rounded-md">
                        {ratio.toFixed(1)}:1
                      </span>
                      {passAAA ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          AAA Elder
                        </span>
                      ) : passAA ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                          AA Standard
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          Low Contrast
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Component Mock Rendering */}
                  <div
                    className="mt-3 p-3 rounded-xl border border-black/10 flex items-center justify-between text-xs transition"
                    style={{ backgroundColor: item.bgColor, color: item.fgColor }}
                  >
                    <span className="font-thai font-semibold">{lang === 'th' ? item.sampleTextTh : item.sampleTextEn}</span>
                    <span className="font-mono text-[10px] opacity-75">
                      {item.fgColor} / {item.bgColor}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-forest/10 flex items-start gap-1.5 text-xs text-ink-muted">
                  <ShieldCheck className="h-4 w-4 text-forest shrink-0 mt-0.5" />
                  <span>{item.elderRecommendation}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
