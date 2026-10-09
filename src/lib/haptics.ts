/**
 * Haptic and Vibration Feedback System
 * Provides customizable tactile haptic pulses for buttons, dial pads,
 * quantity adjustments, checkout, and POS counter operations.
 */

export interface HapticConfig {
  enabled: boolean;
  dialDurationMs: number; // e.g. 25ms
  dialPattern: 'single' | 'double' | 'tick' | 'heavy';
  addDurationMs: number; // e.g. 40ms
  payDurationMs: number; // e.g. 80ms
  errorDurationMs: number; // e.g. 90ms
  intensity: 'soft' | 'normal' | 'strong' | 'ultra';
  preset: 'default' | 'soft' | 'elder' | 'double_pulse' | 'custom';
}

export const DEFAULT_HAPTIC_CONFIG: HapticConfig = {
  enabled: true,
  dialDurationMs: 25,
  dialPattern: 'single',
  addDurationMs: 40,
  payDurationMs: 80,
  errorDurationMs: 90,
  intensity: 'normal',
  preset: 'default',
};

export const HAPTIC_PRESETS: Record<string, { label_th: string; label_en: string; description_th: string; config: HapticConfig }> = {
  default: {
    label_th: 'มาตรฐานเชียงใหม่ (Standard Click)',
    label_en: 'Standard Tactile',
    description_th: 'การสั่นพอเหมาะ 25ms ตอบสนองฉับไว สบายมือเวลาคิดเงิน',
    config: {
      enabled: true,
      dialDurationMs: 25,
      dialPattern: 'single',
      addDurationMs: 40,
      payDurationMs: 80,
      errorDurationMs: 90,
      intensity: 'normal',
      preset: 'default',
    },
  },
  elder: {
    label_th: 'โหมดผู้สูงอายุ & มือสั่น (Elder High Tactile)',
    label_en: 'Elder / High Tactile',
    description_th: 'สั่นหนักแน่น 55ms พร้อมจังหวะคู่ ชัดเจนมากสำหรับผู้สูงวัย',
    config: {
      enabled: true,
      dialDurationMs: 55,
      dialPattern: 'heavy',
      addDurationMs: 65,
      payDurationMs: 120,
      errorDurationMs: 140,
      intensity: 'strong',
      preset: 'elder',
    },
  },
  soft: {
    label_th: 'นุ่มนวล เงียบสงบ (Soft Feather)',
    label_en: 'Soft Feather',
    description_th: 'สัมผัสเบาบาง 12ms ประหยัดแบตเตอรี่ ไม่รบกวนลูกค้า',
    config: {
      enabled: true,
      dialDurationMs: 12,
      dialPattern: 'tick',
      addDurationMs: 25,
      payDurationMs: 50,
      errorDurationMs: 60,
      intensity: 'soft',
      preset: 'soft',
    },
  },
  double_pulse: {
    label_th: 'ดับเบิ้ลคลิกคู่ (Double Pulse)',
    label_en: 'Double Pulse',
    description_th: 'สั่นสะกิด 2 จังหวะสั้นๆ รู้สึกเหมือนกดปุ่มกลไกจริง',
    config: {
      enabled: true,
      dialDurationMs: 30,
      dialPattern: 'double',
      addDurationMs: 45,
      payDurationMs: 90,
      errorDurationMs: 110,
      intensity: 'normal',
      preset: 'double_pulse',
    },
  },
};

const STORAGE_KEY = 'wanjai_haptic_config';

export function getHapticConfig(): HapticConfig {
  if (typeof window === 'undefined') return DEFAULT_HAPTIC_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_HAPTIC_CONFIG, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_HAPTIC_CONFIG;
}

export function saveHapticConfig(updates: Partial<HapticConfig>): HapticConfig {
  const current = getHapticConfig();
  const next = { ...current, ...updates };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }
  return next;
}

export function resetHapticConfig(): HapticConfig {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  return DEFAULT_HAPTIC_CONFIG;
}

export type HapticQuickPattern = 'Soft Tap' | 'Strong Click' | 'Double Pulse';

export function applyQuickHapticPattern(pattern: HapticQuickPattern): HapticConfig {
  let updates: Partial<HapticConfig> = {};
  if (pattern === 'Soft Tap') {
    updates = {
      enabled: true,
      dialDurationMs: 15,
      dialPattern: 'tick',
      addDurationMs: 25,
      payDurationMs: 50,
      intensity: 'soft',
      preset: 'soft',
    };
  } else if (pattern === 'Strong Click') {
    updates = {
      enabled: true,
      dialDurationMs: 50,
      dialPattern: 'heavy',
      addDurationMs: 65,
      payDurationMs: 120,
      intensity: 'strong',
      preset: 'elder',
    };
  } else if (pattern === 'Double Pulse') {
    updates = {
      enabled: true,
      dialDurationMs: 30,
      dialPattern: 'double',
      addDurationMs: 45,
      payDurationMs: 90,
      intensity: 'normal',
      preset: 'double_pulse',
    };
  }
  const next = saveHapticConfig(updates);
  triggerPosDialHaptic('digit');
  return next;
}

export function getCurrentQuickPattern(): HapticQuickPattern {
  const cfg = getHapticConfig();
  if (cfg.preset === 'soft' || cfg.dialPattern === 'tick' || cfg.dialDurationMs <= 18) {
    return 'Soft Tap';
  }
  if (cfg.preset === 'double_pulse' || cfg.dialPattern === 'double') {
    return 'Double Pulse';
  }
  return 'Strong Click';
}

/**
 * Specifically triggers haptic feedback for the POS Dial Pad
 * respecting custom duration, pattern, and intensity.
 */
export function triggerPosDialHaptic(type: 'digit' | 'backspace' | 'clear' | 'custom_add' = 'digit') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  const cfg = getHapticConfig();
  if (!cfg.enabled) return;

  const mult =
    cfg.intensity === 'soft' ? 0.7 : cfg.intensity === 'strong' ? 1.4 : cfg.intensity === 'ultra' ? 1.9 : 1.0;
  const baseDur = Math.round(cfg.dialDurationMs * mult);

  try {
    if (type === 'backspace' || type === 'clear') {
      navigator.vibrate?.(Math.round(baseDur * 1.3));
      return;
    }

    if (type === 'custom_add') {
      navigator.vibrate?.([baseDur, 30, Math.round(baseDur * 1.5)]);
      return;
    }

    // Digit press patterns
    switch (cfg.dialPattern) {
      case 'double':
        navigator.vibrate?.([Math.max(10, Math.round(baseDur * 0.7)), 25, Math.max(10, Math.round(baseDur * 0.7))]);
        break;
      case 'tick':
        navigator.vibrate?.(Math.max(8, Math.round(baseDur * 0.6)));
        break;
      case 'heavy':
        navigator.vibrate?.([baseDur, 20, Math.round(baseDur * 0.8)]);
        break;
      case 'single':
      default:
        navigator.vibrate?.(baseDur);
        break;
    }
  } catch {}
}

/**
 * Universal Haptic Trigger for general app actions
 */
export function triggerHaptic(type: 'tap' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'tap') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  const cfg = getHapticConfig();
  if (!cfg.enabled) return;

  const mult =
    cfg.intensity === 'soft' ? 0.7 : cfg.intensity === 'strong' ? 1.4 : cfg.intensity === 'ultra' ? 1.9 : 1.0;

  try {
    switch (type) {
      case 'tap':
      case 'light':
        triggerPosDialHaptic('digit');
        break;
      case 'medium':
        navigator.vibrate?.(Math.round(cfg.addDurationMs * mult));
        break;
      case 'heavy':
        navigator.vibrate?.(Math.round(cfg.payDurationMs * mult));
        break;
      case 'success':
        navigator.vibrate?.([
          Math.round(35 * mult),
          30,
          Math.round(75 * mult),
        ]);
        break;
      case 'warning':
        navigator.vibrate?.([
          Math.round(50 * mult),
          40,
          Math.round(50 * mult),
        ]);
        break;
      case 'error':
        navigator.vibrate?.([
          Math.round(cfg.errorDurationMs * mult),
          35,
          Math.round(cfg.errorDurationMs * mult),
        ]);
        break;
    }
  } catch {}
}
