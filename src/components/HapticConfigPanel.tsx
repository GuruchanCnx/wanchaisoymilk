import { useState, useEffect } from 'react';
import {
  Vibrate,
  Zap,
  Sliders,
  Sparkles,
  RotateCcw,
  Save,
  Check,
  Smartphone,
  Volume2,
  CheckCircle2,
  Radio,
  Keyboard,
  Activity,
} from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import {
  getHapticConfig,
  saveHapticConfig,
  resetHapticConfig,
  triggerPosDialHaptic,
  triggerHaptic,
  HAPTIC_PRESETS,
  type HapticConfig,
} from '../lib/haptics';

export default function HapticConfigPanel() {
  const { lang } = useLang();
  const { showToast } = useToast();

  const [config, setConfig] = useState<HapticConfig>(() => getHapticConfig());
  const [activeDigit, setActiveDigit] = useState<string | null>(null);
  const [hasVibrateSupport, setHasVibrateSupport] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && !('vibrate' in navigator)) {
      setHasVibrateSupport(false);
    }
  }, []);

  const handleApplyPreset = (presetKey: string) => {
    const p = HAPTIC_PRESETS[presetKey];
    if (p) {
      const next = { ...p.config, preset: presetKey as any };
      setConfig(next);
      saveHapticConfig(next);
      triggerPosDialHaptic('digit');
      showToast(
        lang === 'th' ? `ใช้งานพรีเซ็ต "${p.label_th}" แล้ว` : `Preset Applied: ${p.label_en}`,
        lang === 'th' ? 'การสั่นของแป้นคิดเงิน POS ถูกปรับตามที่เลือก' : 'POS dial pad tactile pattern updated.',
        'success'
      );
    }
  };

  const handleSave = () => {
    saveHapticConfig(config);
    triggerHaptic('success');
    showToast(
      lang === 'th' ? 'บันทึกการตั้งค่าการสั่นเรียบร้อย' : 'Haptic Settings Saved',
      lang === 'th' ? `ระยะสั่นแป้นคิดเงิน: ${config.dialDurationMs}ms (${config.intensity})` : `Dial pad feedback: ${config.dialDurationMs}ms`,
      'success'
    );
  };

  const handleReset = () => {
    const def = resetHapticConfig();
    setConfig(def);
    triggerHaptic('medium');
    showToast(
      lang === 'th' ? 'คืนค่าเริ่มต้นสำเร็จ' : 'Reset to Defaults',
      lang === 'th' ? 'การสั่นกลับสู่ค่ามาตรฐานเชียงใหม่ 25ms' : 'Restored standard tactile settings',
      'info'
    );
  };

  const handleTestKeypad = (digit: string) => {
    setActiveDigit(digit);
    if (digit === 'del') {
      triggerPosDialHaptic('backspace');
    } else if (digit === 'add') {
      triggerPosDialHaptic('custom_add');
    } else if (digit === 'pay') {
      triggerHaptic('success');
    } else {
      triggerPosDialHaptic('digit');
    }
    setTimeout(() => setActiveDigit(null), 200);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-forest text-cream shadow-md border border-forest-light relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-honey/20 text-honey flex items-center justify-center shrink-0">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-honey/20 text-honey text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                <span>Tactile Response & Haptic Customizer</span>
              </div>
              <h2 className="font-display italic font-bold text-2xl text-cream mt-1">
                {lang === 'th'
                  ? 'ปรับแต่งการสั่นตอบสนองแป้นคิดเงิน POS (Haptics)'
                  : 'POS Dial Pad Haptic Feedback Configuration'}
              </h2>
              <p className="text-xs text-cream/80 mt-1 max-w-xl">
                {lang === 'th'
                  ? 'ปรับแต่งระยะเวลาการสั่น (Duration), จังหวะสัมผัส (Pattern) และความแรง (Intensity) ของแป้นกดคิดเงินหน้าร้าน ให้สัมผัสชัดเจนเหมือนเครื่องคิดเงินจริง ป้องกันการกดพลาดของผู้สูงอายุ'
                  : 'Customize vibration duration, tactile patterns, and intensity for POS cashiers and touch screens.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const next = { ...config, enabled: !config.enabled };
                setConfig(next);
                saveHapticConfig(next);
                if (next.enabled) triggerPosDialHaptic('digit');
              }}
              className={`h-11 px-5 rounded-full font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-sm ${
                config.enabled
                  ? 'bg-honey text-forest ring-2 ring-honey-dark'
                  : 'bg-cream/20 text-cream hover:bg-cream/30'
              }`}
            >
              <Zap className="h-4 w-4" />
              <span>{config.enabled ? (lang === 'th' ? 'ระบบสั่น: เปิด (ACTIVE)' : 'Haptics: ON') : (lang === 'th' ? 'ระบบสั่น: ปิด (OFF)' : 'Haptics: OFF')}</span>
            </button>
          </div>
        </div>

        {!hasVibrateSupport && (
          <div className="mt-3 text-[11px] bg-amber-900/60 border border-amber-400/30 px-3 py-1.5 rounded-xl text-amber-200">
            ⚠️ อุปกรณ์หรือบราวเซอร์นี้อาจจำกัดสิทธิ์การสั่นฮาร์ดแวร์ (Navigator Vibrate API) การตั้งค่าจะทำงานเต็มรูปแบบบนโทรศัพท์มือถือและแท็บเล็ต POS
          </div>
        )}
      </div>

      {/* Preset Selector */}
      <div className="p-5 rounded-3xl liquid-glass border border-forest/15 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-terracotta" />
            <h3 className="font-display italic font-bold text-lg text-forest">
              {lang === 'th' ? 'ชุดรูปแบบการสั่นสำเร็จรูป (Presets)' : 'Tactile Haptic Presets'}
            </h3>
          </div>
          <span className="text-xs text-ink-muted">
            {lang === 'th' ? 'เลือกรูปแบบที่เหมาะกับเครื่องของคุณ' : 'Quick select configuration'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(HAPTIC_PRESETS).map(([key, item]) => {
            const isSelected = config.preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleApplyPreset(key)}
                className={`p-4 rounded-2xl text-left border transition flex flex-col justify-between h-32 active:scale-98 ${
                  isSelected
                    ? 'bg-forest text-cream border-forest shadow-md ring-2 ring-forest-light'
                    : 'bg-white/70 hover:bg-white text-forest border-forest/10 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">
                      {lang === 'th' ? item.label_th : item.label_en}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-honey" />}
                  </div>
                  <p className={`text-xs mt-1 leading-snug ${isSelected ? 'text-cream/80' : 'text-ink-muted'}`}>
                    {item.description_th}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono mt-2">
                  <span className={`px-2 py-0.5 rounded-md ${isSelected ? 'bg-cream/15 text-honey' : 'bg-forest/10 text-forest'}`}>
                    {item.config.dialDurationMs}ms
                  </span>
                  <span className={`capitalize ${isSelected ? 'text-cream/70' : 'text-ink-muted'}`}>
                    {item.config.dialPattern} · {item.config.intensity}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed Fine-Tuning Controls & Live Test Pad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-3xl liquid-glass border border-forest/15 shadow-sm space-y-4">
            <h3 className="font-display italic font-bold text-lg text-forest flex items-center gap-2">
              <Sliders className="h-4 w-4 text-terracotta" />
              <span>{lang === 'th' ? 'ปรับแต่งค่าความสั่นละเอียด (Fine-tuning)' : 'Detailed Parameters'}</span>
            </h3>

            {/* Dial Pad Keypad Duration Slider */}
            <div className="space-y-1.5 bg-white/60 p-3.5 rounded-2xl border border-forest/10">
              <div className="flex items-center justify-between text-xs font-bold text-forest">
                <span>{lang === 'th' ? 'ระยะเวลาสั่นปุ่มตัวเลข (Dial Key Duration)' : 'Dial Keypad Duration'}</span>
                <span className="font-mono text-terracotta bg-terracotta/10 px-2 py-0.5 rounded-md text-sm">
                  {config.dialDurationMs} ms
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={config.dialDurationMs}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const next = { ...config, dialDurationMs: val, preset: 'custom' as any };
                  setConfig(next);
                  triggerPosDialHaptic('digit');
                }}
                className="w-full accent-terracotta cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink-muted font-mono">
                <span>5ms (แผ่วเบา)</span>
                <span>25ms (มาตรฐาน)</span>
                <span>55ms (ผู้สูงอายุ)</span>
                <span>100ms (สูงสุด)</span>
              </div>
            </div>

            {/* Dial Pattern Picker */}
            <div className="space-y-1.5 bg-white/60 p-3.5 rounded-2xl border border-forest/10">
              <label className="text-xs font-bold text-forest block">
                {lang === 'th' ? 'จังหวะการสั่น (Tactile Pattern)' : 'Dial Tactile Pattern'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'single', label: 'จังหวะเดียว (Single)', desc: '1 pulse' },
                  { id: 'double', label: 'ดับเบิ้ลคลิก (Double)', desc: '2 pulses' },
                  { id: 'tick', label: 'คลิกกลไก (Tick)', desc: 'Ultra-fast' },
                  { id: 'heavy', label: 'กระแทกหนัก (Heavy)', desc: 'Deep pulse' },
                ].map((pt) => (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => {
                      const next = { ...config, dialPattern: pt.id as any, preset: 'custom' as any };
                      setConfig(next);
                      triggerPosDialHaptic('digit');
                    }}
                    className={`p-2.5 rounded-xl text-left border text-xs transition ${
                      config.dialPattern === pt.id
                        ? 'bg-forest text-cream border-forest font-bold'
                        : 'bg-white hover:bg-forest/5 text-forest border-forest/15'
                    }`}
                  >
                    <div className="font-semibold">{pt.label}</div>
                    <div className="text-[10px] opacity-75">{pt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity Level */}
            <div className="space-y-1.5 bg-white/60 p-3.5 rounded-2xl border border-forest/10">
              <label className="text-xs font-bold text-forest block">
                {lang === 'th' ? 'ระดับความแรง (Intensity Multiplier)' : 'Vibration Intensity'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'soft', label: 'เบา (Soft)', mult: '70%' },
                  { id: 'normal', label: 'ปกติ (Normal)', mult: '100%' },
                  { id: 'strong', label: 'หนักแน่น (Strong)', mult: '140%' },
                  { id: 'ultra', label: 'สูงสุด (Ultra)', mult: '190%' },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      const next = { ...config, intensity: lvl.id as any, preset: 'custom' as any };
                      setConfig(next);
                      triggerPosDialHaptic('digit');
                    }}
                    className={`p-2 rounded-xl text-center border text-xs transition ${
                      config.intensity === lvl.id
                        ? 'bg-amber-600 text-cream border-amber-600 font-bold'
                        : 'bg-white hover:bg-forest/5 text-forest border-forest/15'
                    }`}
                  >
                    <div>{lvl.label}</div>
                    <div className="text-[10px] opacity-80 font-mono">{lvl.mult}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Add to Ticket & Payment Confirmation Durations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 bg-white/60 p-3 rounded-xl border border-forest/10">
                <div className="flex justify-between text-xs font-bold text-forest">
                  <span>{lang === 'th' ? 'เพิ่มเมนูเข้าบิล' : 'Add Item Duration'}</span>
                  <span className="font-mono text-terracotta">{config.addDurationMs}ms</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={config.addDurationMs}
                  onChange={(e) => {
                    const next = { ...config, addDurationMs: parseInt(e.target.value, 10), preset: 'custom' as any };
                    setConfig(next);
                    triggerHaptic('medium');
                  }}
                  className="w-full accent-forest cursor-pointer"
                />
              </div>

              <div className="space-y-1 bg-white/60 p-3 rounded-xl border border-forest/10">
                <div className="flex justify-between text-xs font-bold text-forest">
                  <span>{lang === 'th' ? 'ชำระเงินสำเร็จ' : 'Payment Success'}</span>
                  <span className="font-mono text-honey-dark">{config.payDurationMs}ms</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="10"
                  value={config.payDurationMs}
                  onChange={(e) => {
                    const next = { ...config, payDurationMs: parseInt(e.target.value, 10), preset: 'custom' as any };
                    setConfig(next);
                    triggerHaptic('success');
                  }}
                  className="w-full accent-honey cursor-pointer"
                />
              </div>
            </div>

            {/* Action Save & Reset Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 h-11 rounded-2xl bg-forest text-cream font-bold text-xs flex items-center justify-center gap-2 hover:bg-forest-dark transition active:scale-95 shadow-sm"
              >
                <Save className="h-4 w-4" />
                <span>{lang === 'th' ? 'บันทึกการตั้งค่าการสั่น' : 'Save Haptic Configuration'}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-11 px-4 rounded-2xl bg-cream border border-forest/20 text-forest font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-forest/5 transition active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{lang === 'th' ? 'คืนค่าเดิม' : 'Reset'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Interactive POS Test Keypad (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-forest-dark text-cream p-5 rounded-3xl border border-cream/15 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-cream/10 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-honey" />
                <h4 className="font-display italic font-bold text-base text-honey">
                  {lang === 'th' ? 'แป้นทดสอบการสั่นสด (Live Pad)' : 'Live Haptic Test Pad'}
                </h4>
              </div>
              <span className="text-[10px] bg-honey/20 text-honey px-2 py-0.5 rounded-full font-mono">
                {config.dialDurationMs}ms · {config.dialPattern}
              </span>
            </div>

            <p className="text-xs text-cream/70">
              {lang === 'th'
                ? 'แตะปุ่มด้านล่างเพื่อทดสอบแรงสั่นของจริงบนมือของคุณทันที:'
                : 'Tap keys below to feel tactile vibrations on your current hardware:'}
            </p>

            {/* Interactive Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00', 'del'].map((key) => {
                const isPressed = activeDigit === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTestKeypad(key)}
                    className={`h-12 rounded-2xl font-mono text-lg font-bold flex items-center justify-center transition select-none ${
                      isPressed
                        ? 'bg-honey text-forest scale-95 shadow-inner'
                        : 'bg-cream/10 text-cream hover:bg-cream/20 active:scale-95'
                    }`}
                  >
                    {key === 'del' ? '⌫' : key}
                  </button>
                );
              })}
            </div>

            {/* Test Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cream/10">
              <button
                type="button"
                onClick={() => handleTestKeypad('add')}
                className="h-10 rounded-xl bg-forest border border-cream/20 hover:bg-forest-light text-cream font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition"
              >
                <span>+ เพิ่มเมนู ({config.addDurationMs}ms)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestKeypad('pay')}
                className="h-10 rounded-xl bg-honey text-forest font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition hover:bg-honey-dark"
              >
                <Check className="h-3.5 w-3.5" />
                <span>ชำระสำเร็จ ({config.payDurationMs}ms)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
