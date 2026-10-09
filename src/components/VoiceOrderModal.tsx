import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Sparkles,
  ShoppingBag,
  Plus,
  CheckCircle2,
  X,
  Volume2,
  AlertCircle,
  HelpCircle,
  Send,
  Trash2,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { useCart, type CartItem } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import type { Product } from '../types';
import { baht } from '../lib/format';
import { triggerHaptic } from '../lib/haptics';

// Web Speech API interface declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

interface ParsedVoiceItem {
  product: Product;
  qty: number;
  vessel: 'bag' | 'cup' | 'bottle' | 'own';
  sweetness: 'none' | 'less' | 'normal' | 'extra';
  temp: 'hot' | 'cold' | 'na';
  extras: string[];
  unit_price: number;
  matchedText: string;
}

interface VoiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

// Audio synthesizer for pleasant voice interaction sounds
function playChime(type: 'start' | 'success' | 'beep') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'start') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'success') {
      // Two-tone cheerful success chord
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch {
    // Ignore audio context autoplay limitations
  }
}

export default function VoiceOrderModal({ isOpen, onClose, products }: VoiceOrderModalProps) {
  const { lang } = useLang();
  const { add } = useCart();
  const { showToast } = useToast();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechLang, setSpeechLang] = useState<'th-TH' | 'en-US'>(lang === 'th' ? 'th-TH' : 'en-US');
  const [supported, setSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recognizedItems, setRecognizedItems] = useState<ParsedVoiceItem[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [addedSuccess, setAddedSuccess] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition support check
  useEffect(() => {
    const win = window as IWindow;
    const SpeechAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechAPI) {
      setSupported(false);
    }
  }, []);

  // Update speech language if app language changes
  useEffect(() => {
    setSpeechLang(lang === 'th' ? 'th-TH' : 'en-US');
  }, [lang]);

  // Natural Language Order Parsing Engine
  const parseSpeechToItems = useCallback(
    (text: string): ParsedVoiceItem[] => {
      if (!text || !text.trim() || products.length === 0) return [];
      const clean = text.toLowerCase();
      const results: ParsedVoiceItem[] = [];

      // Product aliases lookup dictionary
      const aliasMap: { [slug: string]: string[] } = {
        'soy-milk': ['น้ำเต้าหู้', 'เต้าหู้', 'นมถั่วเหลือง', 'soy milk', 'soymilk', 'soy'],
        'cow-milk': ['นมวัว', 'นมสด', 'นมสดแท้', 'นมวัวสด', 'cow milk', 'fresh milk', 'cow'],
        'ginger-tea': ['น้ำขิง', 'ขิงต้ม', 'น้ำขิงร้อน', 'ginger tea', 'ginger', 'ginger drink'],
        'soy-curd': ['เต้าฮวย', 'เต้าฮวยน้ำขิง', 'เต้าฮวยนมสด', 'soy curd', 'tofu pudding', 'curd', 'douhua'],
        'crullers': ['ปาท่องโก๋', 'ปาท่องโก', 'ท่องโก๋', 'crullers', 'patongko', 'fried dough'],
        'steamed-buns': ['ซาลาเปา', 'เปา', 'steamed bun', 'salapao', 'buns', 'bun'],
        'taothung': ['เต้าทึง', 'น้ำลำไย', 'taothung', 'herb drink'],
      };

      // Split phrases by conjunctions: "และ", "แล้วก็", "กับ", "and", "plus", ",", "."
      const phrases = clean
        .split(/(?:แล้วก็|และ|กับ|\band\b|\bplus\b|,|\+)/)
        .map((p) => p.trim())
        .filter(Boolean);

      for (const phrase of phrases) {
        let matchedProduct: Product | null = null;
        let matchedSlug = '';

        // Match against catalog products
        for (const prod of products) {
          const aliases = aliasMap[prod.slug] || [];
          const allKeywords = [
            prod.slug.toLowerCase(),
            prod.name_th.toLowerCase(),
            prod.name_en.toLowerCase(),
            ...aliases,
          ];

          for (const kw of allKeywords) {
            if (phrase.includes(kw)) {
              matchedProduct = prod;
              matchedSlug = prod.slug;
              break;
            }
          }
          if (matchedProduct) break;
        }

        if (matchedProduct) {
          // 1. Extract Quantity
          let qty = 1;
          // Check Thai number words
          const thaiNums: [RegExp, number][] = [
            [/(?:หนึ่ง|นึง|\bone\b)/, 1],
            [/(?:สอง|\btwo\b)/, 2],
            [/(?:สาม|\bthree\b)/, 3],
            [/(?:สี่|\bfour\b)/, 4],
            [/(?:ห้า|\bfive\b)/, 5],
            [/(?:หก|\bsix\b)/, 6],
            [/(?:เจ็ด|\bseven\b)/, 7],
            [/(?:แปด|\beight\b)/, 8],
            [/(?:เก้า|\bnine\b)/, 9],
            [/(?:สิบสอง|\btwelve\b)/, 12],
            [/(?:สิบเอ็ด|\beleven\b)/, 11],
            [/(?:สิบ|\bten\b)/, 10],
          ];

          // Check direct digits e.g. "2 ถุง", "4 ชิ้น", "x 3"
          const digitMatch = phrase.match(/(\d+)/);
          if (digitMatch) {
            const parsedDigit = parseInt(digitMatch[1], 10);
            if (!isNaN(parsedDigit) && parsedDigit > 0 && parsedDigit <= 100) {
              qty = parsedDigit;
            }
          } else {
            for (const [regex, num] of thaiNums) {
              if (regex.test(phrase)) {
                qty = num;
                break;
              }
            }
          }

          // 2. Extract Sweetness
          let sweetness: 'none' | 'less' | 'normal' | 'extra' = 'normal';
          if (/(?:ไม่หวาน|ไม่ใส่น้ำตาล|หวาน 0|no sugar|unsweetened|0%)/.test(phrase)) {
            sweetness = 'none';
          } else if (/(?:หวานน้อย|หวานนิดเดียว|25%|50%|less sweet|less sugar|low sugar)/.test(phrase)) {
            sweetness = 'less';
          } else if (/(?:หวานมาก|หวานๆ|extra sweet|150%)/.test(phrase)) {
            sweetness = 'extra';
          }

          // 3. Extract Vessel
          let vessel: 'bag' | 'cup' | 'bottle' | 'own' = 'bag';
          if (/(?:แก้ว|cup|ใส่แก้ว)/.test(phrase)) {
            vessel = 'cup';
          } else if (/(?:ขวด|bottle|ใส่ขวด)/.test(phrase)) {
            vessel = 'bottle';
          } else if (/(?:ปิ่นโต|ภาชนะตัวเอง|กล่อง|own|bring)/.test(phrase)) {
            vessel = 'own';
          } else if (/(?:ถุง|bag|ใส่ถุง)/.test(phrase)) {
            vessel = 'bag';
          }

          // 4. Extract Temperature
          let temp: 'hot' | 'cold' | 'na' = matchedProduct.category === 'snacks' ? 'na' : 'hot';
          if (/(?:เย็น|ใส่น้ำแข็ง|น้ำแข็ง|cold|iced)/.test(phrase)) {
            temp = 'cold';
          } else if (/(?:ร้อน|อุ่น|hot|warm)/.test(phrase)) {
            temp = 'hot';
          }

          // Price calculation based on modifiers
          let unitPrice = matchedProduct.price;
          if (vessel === 'bottle') unitPrice += 5;
          if (vessel === 'cup') unitPrice += 2;
          if (vessel === 'own') unitPrice = Math.max(5, unitPrice - 2);

          results.push({
            product: matchedProduct,
            qty,
            vessel,
            sweetness,
            temp,
            extras: [],
            unit_price: unitPrice,
            matchedText: phrase,
          });
        }
      }

      return results;
    },
    [products]
  );

  // Stop listening helper
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Start listening helper
  const startListening = useCallback(() => {
    setErrorMessage(null);
    setAddedSuccess(false);

    const win = window as IWindow;
    const SpeechAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechAPI) {
      setSupported(false);
      setErrorMessage(
        lang === 'th'
          ? 'เบราว์เซอร์นี้ยังไม่รองรับ SpeechRecognition กรุณาพิมพ์ข้อความหรือเลือกเมนูตัวอย่างด้านล่าง'
          : 'SpeechRecognition API is not supported in this browser. You can type or use the sample prompts below.'
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechAPI();
      recognition.lang = speechLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        playChime('start');
        triggerHaptic('tap');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalStr += item[0].transcript + ' ';
          } else {
            interimStr += item[0].transcript;
          }
        }

        const fullText = (transcript + ' ' + finalStr).trim();
        if (finalStr.trim()) {
          setTranscript(fullText);
          const parsed = parseSpeechToItems(fullText);
          if (parsed.length > 0) {
            setRecognizedItems(parsed);
            playChime('success');
            triggerHaptic('success');
          }
        }
        setInterimTranscript(interimStr);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage(
            lang === 'th'
              ? 'กรุณาอนุญาตการเข้าถึงไมโครโฟนในเบราว์เซอร์เพื่อสั่งสินค้าด้วยเสียง'
              : 'Microphone permission denied. Please allow microphone access to use voice ordering.'
          );
        } else if (event.error !== 'no-speech') {
          setErrorMessage(`Error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.error('Speech recognition start failed:', err);
      setErrorMessage(err?.message || 'Failed to start microphone');
      setIsListening(false);
    }
  }, [lang, speechLang, transcript, parseSpeechToItems]);

  // Clean up when unmounting or closing
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  // Process text whenever manual text or voice transcript changes
  const handleProcessText = (text: string) => {
    setTranscript(text);
    const parsed = parseSpeechToItems(text);
    setRecognizedItems(parsed);
    if (parsed.length > 0) {
      playChime('success');
      triggerHaptic('tap');
    }
  };

  // Add all recognized items to cart
  const handleAddAllToCart = () => {
    if (recognizedItems.length === 0) return;

    recognizedItems.forEach((item) => {
      const cartItem: CartItem = {
        key: `${item.product.slug}-${item.vessel}-${item.sweetness}-${item.temp}-${Date.now()}-${Math.random()}`,
        product_id: item.product.id,
        slug: item.product.slug,
        name_th: item.product.name_th,
        name_en: item.product.name_en,
        image_url: item.product.image_url,
        base_price: item.product.price,
        vessel: item.vessel,
        sweetness: item.sweetness,
        temp: item.temp,
        extras: item.extras,
        qty: item.qty,
        unit_price: item.unit_price,
        notes: `สั่งด้วยเสียง: "${item.matchedText}"`,
      };
      add(cartItem);
    });

    triggerHaptic('medium');
    playChime('success');
    setAddedSuccess(true);

    const count = recognizedItems.reduce((acc, i) => acc + i.qty, 0);
    showToast(
      lang === 'th' ? `เพิ่ม ${count} รายการลงตะกร้าแล้ว!` : `Added ${count} items to cart!`,
      lang === 'th' ? 'รายการจากการสั่งด้วยเสียงถูกบันทึกลงตะกร้าเรียบร้อย' : 'Items from voice speech added to cart',
      'success'
    );

    setTimeout(() => {
      onClose();
      setAddedSuccess(false);
      setTranscript('');
      setRecognizedItems([]);
    }, 1200);
  };

  // Clear current transcript
  const handleClear = () => {
    setTranscript('');
    setInterimTranscript('');
    setRecognizedItems([]);
    setErrorMessage(null);
    setManualInput('');
    triggerHaptic('tap');
  };

  // Example spoken prompt chips
  const samplePrompts =
    lang === 'th'
      ? [
          'ขอน้ำเต้าหู้ 2 ถุง หวานน้อย',
          'ปาท่องโก๋ 4 ตัว',
          'นมวัวสด 1 ขวด ร้อน',
          'เต้าฮวยน้ำขิง 2 ถุง',
          'น้ำเต้าหู้ 1 แก้ว ไม่หวาน กับ ปาท่องโก๋ 2 ชิ้น',
        ]
      : [
          'Two soy milk bags less sweet',
          'Four patongko fried crullers',
          'One bottle of fresh cow milk',
          'Tofu pudding with ginger tea',
          'One cup soy milk and two buns',
        ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-forest/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto duo-modal-overlay"
        onClick={() => {
          stopListening();
          onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-4xl liquid-glass border border-white/60 p-5 sm:p-6 shadow-2xl text-ink duo-segment-center relative max-h-[92vh] flex flex-col my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-forest/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-chili text-white shadow-lg shadow-chili/30 animate-pulse'
                    : 'bg-forest text-cream shadow-sm'
                }`}
              >
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display italic font-bold text-xl text-forest leading-none">
                    {lang === 'th' ? 'สั่งของด้วยเสียง' : 'Voice Order AI'}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-honey/30 text-amber-900 border border-honey/40">
                    <Sparkles className="h-2.5 w-2.5 mr-1 text-amber-700" />
                    Web Speech
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  {lang === 'th'
                    ? 'แตะไมโครโฟนแล้วพูดสั่งเมนู เช่น "น้ำเต้าหู้ 2 ถุง หวานน้อย"'
                    : 'Tap microphone and speak your order naturally'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Language Switcher for Speech Recognition */}
              <button
                type="button"
                onClick={() => {
                  const nextLang = speechLang === 'th-TH' ? 'en-US' : 'th-TH';
                  setSpeechLang(nextLang);
                  triggerHaptic('tap');
                  if (isListening) {
                    stopListening();
                  }
                }}
                title={lang === 'th' ? 'สลับภาษาที่รับฟังเสียง' : 'Switch Voice Language'}
                className="h-8 px-2.5 rounded-full liquid-pill text-forest text-xs font-bold flex items-center gap-1 hover:bg-forest/10 transition"
              >
                <Globe className="h-3.5 w-3.5 text-forest" />
                <span>{speechLang === 'th-TH' ? 'TH' : 'EN'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  stopListening();
                  onClose();
                }}
                className="h-8 w-8 rounded-full bg-forest/10 hover:bg-forest/15 text-forest flex items-center justify-center transition active:scale-95"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
            {/* Visualizer / Listening Stage */}
            <div className="rounded-3xl bg-white/70 border border-forest/10 p-5 text-center relative overflow-hidden shadow-inner">
              {/* Subtle pulsing background glow while listening */}
              {isListening && (
                <div className="absolute inset-0 bg-radial from-chili/10 via-transparent to-transparent animate-pulse pointer-events-none" />
              )}

              {/* Main Microphone Button */}
              <div className="relative inline-block mb-3">
                {isListening && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-full bg-chili/30 blur-md pointer-events-none"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0.2, 0.8] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-full border-2 border-chili pointer-events-none"
                    />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      stopListening();
                    } else {
                      startListening();
                    }
                  }}
                  className={`relative z-10 h-20 w-20 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl active:scale-90 ${
                    isListening
                      ? 'bg-chili text-white scale-105'
                      : 'bg-forest hover:bg-forest-dark text-cream hover:scale-105'
                  }`}
                  aria-label={isListening ? 'Stop listening' : 'Start speaking'}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-7 w-7 mb-0.5 animate-bounce" />
                      <span className="text-[10px] font-bold tracking-wider uppercase">STOP</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-7 w-7 mb-0.5" />
                      <span className="text-[10px] font-bold tracking-wider uppercase">
                        {lang === 'th' ? 'พูดเลย' : 'SPEAK'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Status indicator with animated audio bars */}
              <div className="flex items-center justify-center gap-1.5 h-6">
                {isListening ? (
                  <>
                    <div className="flex items-center gap-1">
                      {[0.2, 0.4, 0.6, 0.8, 0.5, 0.3, 0.7, 0.4].map((delay, idx) => (
                        <motion.span
                          key={idx}
                          animate={{ height: ['4px', '20px', '6px', '16px'] }}
                          transition={{ repeat: Infinity, duration: 0.7, delay: delay * 0.3 }}
                          className="w-1 bg-chili rounded-full inline-block"
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-chili ml-2">
                      {lang === 'th' ? 'กำลังฟังเสียงของคุณ...' : 'Listening to speech...'}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-ink-muted flex items-center gap-1">
                    <Volume2 className="h-3.5 w-3.5 text-forest" />
                    {lang === 'th' ? 'แตะปุ่มเพื่อเริ่มบันทึกเสียงสั่งอาหาร' : 'Tap the microphone to speak'}
                  </span>
                )}
              </div>

              {/* Live Transcript Display */}
              <div className="mt-3 min-h-[48px] rounded-2xl bg-cream/80 border border-forest/10 p-3 text-left">
                {transcript || interimTranscript ? (
                  <div className="text-sm text-ink leading-relaxed">
                    <span className="font-medium">{transcript}</span>
                    {interimTranscript && (
                      <span className="text-ink-muted italic opacity-75"> {interimTranscript}</span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted/70 italic text-center py-1">
                    {lang === 'th'
                      ? 'เสียงที่พูดจะแสดงที่นี่แบบเรียลไทม์...'
                      : 'Spoken speech transcript will appear here live...'}
                  </p>
                )}
              </div>

              {/* Transcript Actions */}
              {(transcript || interimTranscript) && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[11px] text-chili hover:underline font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    {lang === 'th' ? 'ล้างข้อความ' : 'Clear'}
                  </button>
                </div>
              )}
            </div>

            {/* Error or unsupported banner */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold">{lang === 'th' ? 'แจ้งเตือน' : 'Notice'}</div>
                  <div>{errorMessage}</div>
                </div>
              </div>
            )}

            {/* Recognized Items Section */}
            {recognizedItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-forest">
                    <CheckCircle2 className="h-4 w-4 text-forest" />
                    <span>
                      {lang === 'th'
                        ? `ตรวจพบเมนู (${recognizedItems.length} รายการ)`
                        : `Recognized Items (${recognizedItems.length})`}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-terracotta">
                    {baht(recognizedItems.reduce((acc, i) => acc + i.unit_price * i.qty, 0))}
                  </span>
                </div>

                <div className="space-y-2">
                  {recognizedItems.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-2xl bg-white border border-forest/15 shadow-xs flex items-center gap-3 justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={item.product.image_url}
                          alt={item.product.name_th}
                          className="h-12 w-12 rounded-xl object-cover border border-forest/10 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-forest truncate">
                            {lang === 'th' ? item.product.name_th : item.product.name_en}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1 text-[11px] text-ink-muted mt-0.5">
                            <span className="px-1.5 py-0.2 rounded-md bg-forest/10 text-forest font-semibold">
                              {item.vessel === 'bag'
                                ? lang === 'th'
                                  ? 'ถุง'
                                  : 'Bag'
                                : item.vessel === 'cup'
                                ? lang === 'th'
                                  ? 'แก้ว'
                                  : 'Cup'
                                : item.vessel === 'bottle'
                                ? lang === 'th'
                                  ? 'ขวด'
                                  : 'Bottle'
                                : lang === 'th'
                                ? 'ภาชนะตัวเอง'
                                : 'Own'}
                            </span>
                            {item.temp !== 'na' && (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 font-semibold">
                                {item.temp === 'hot'
                                  ? lang === 'th'
                                    ? 'ร้อน'
                                    : 'Hot'
                                  : lang === 'th'
                                  ? 'เย็น'
                                  : 'Cold'}
                              </span>
                            )}
                            <span className="px-1.5 py-0.2 rounded-md bg-honey/30 text-amber-900">
                              {item.sweetness === 'none'
                                ? lang === 'th'
                                  ? 'ไม่หวาน'
                                  : 'No Sugar'
                                : item.sweetness === 'less'
                                ? lang === 'th'
                                  ? 'หวานน้อย'
                                  : 'Less Sweet'
                                : item.sweetness === 'extra'
                                ? lang === 'th'
                                  ? 'หวานมาก'
                                  : 'Extra Sweet'
                                : lang === 'th'
                                ? 'หวานปกติ'
                                : 'Normal'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-forest">
                          x{item.qty} · {baht(item.unit_price * item.qty)}
                        </div>
                        <div className="text-[10px] text-ink-muted font-mono">
                          @{baht(item.unit_price)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick-type or Speech fallback bar */}
            <div className="rounded-2xl bg-white/60 border border-forest/10 p-3">
              <div className="text-[11px] font-semibold text-ink-muted mb-1.5 flex items-center justify-between">
                <span>{lang === 'th' ? 'หรือพิมพ์ข้อความสั่งอาหาร:' : 'Or type your order:'}</span>
                <span className="text-[10px] text-forest">NLP Match</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualInput.trim()) {
                    handleProcessText(manualInput);
                    setManualInput('');
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={
                    lang === 'th' ? 'เช่น ขอน้ำเต้าหู้ 2 ถุง ปาท่องโก๋ 4 ตัว' : 'e.g. 2 soy milk bags, 4 patongko'
                  }
                  className="flex-1 h-9 rounded-xl border border-forest/15 bg-white px-3 text-xs focus:outline-none focus:border-forest"
                />
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="h-9 px-3.5 rounded-xl bg-forest text-cream font-bold text-xs flex items-center gap-1 hover:bg-forest-dark transition disabled:opacity-40"
                >
                  <Send className="h-3 w-3" />
                  <span className="hidden sm:inline">{lang === 'th' ? 'ตรวจจับ' : 'Parse'}</span>
                </button>
              </form>
            </div>

            {/* Sample Voice Prompt Chips */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-ink-muted px-1">
                <HelpCircle className="h-3 w-3 text-forest" />
                <span>{lang === 'th' ? 'ตัวอย่างประโยคที่พูดได้ (คลิกเพื่อทดสอบทันที):' : 'Click to try sample prompts:'}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {samplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      handleProcessText(prompt);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs bg-white/70 hover:bg-white border border-forest/15 text-forest hover:border-forest font-medium transition active:scale-95 text-left"
                  >
                    💬 "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Action CTA */}
          <div className="pt-3 border-t border-forest/10 shrink-0">
            {recognizedItems.length > 0 ? (
              <button
                type="button"
                disabled={addedSuccess}
                onClick={handleAddAllToCart}
                className="w-full h-12 rounded-2xl bg-forest text-cream font-bold text-sm flex items-center justify-center gap-2 hover:bg-forest-dark transition active:scale-95 shadow-md disabled:opacity-60"
              >
                {addedSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-honey" />
                    <span>{lang === 'th' ? 'เพิ่มลงตะกร้าแล้ว!' : 'Added to Cart!'}</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    <span>
                      {lang === 'th'
                        ? `ใส่ตะกร้าทั้งหมด (${recognizedItems.reduce((acc, i) => acc + i.qty, 0)} ชิ้น)`
                        : `Add All to Cart (${recognizedItems.reduce((acc, i) => acc + i.qty, 0)} items)`}
                    </span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center justify-between text-xs text-ink-muted px-1">
                <span>
                  {lang === 'th'
                    ? 'รองรับภาษาไทยและภาษาอังกฤษ พร้อมระบบแปลงคำพูดเป็นสินค้า'
                    : 'Bilingual Thai & English speech-to-cart engine'}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="font-bold text-forest hover:underline"
                >
                  {lang === 'th' ? 'ปิดหน้านี้' : 'Close'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
