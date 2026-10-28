/**
 * Heritage Web Audio API Sound System
 * Produces subtle, shop-appropriate acoustic sound cues for Wanchai Soy Milk:
 * - Success chime: Warm pentatonic chord bell (C5 -> E5 -> G5) for order completion and POS charge
 * - Soft tactile click: Subtle organic click for item additions and counter buttons
 * - Alert chime: Gentle bell for notifications
 *
 * Fully respects silent mode / mute settings stored in localStorage.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

const SOUND_STORAGE_KEY = 'wanjai_sound_enabled';

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(SOUND_STORAGE_KEY);
    // Defaults to true unless explicitly disabled by user
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
    window.dispatchEvent(new Event('sound_setting_changed'));
  } catch {}
}

export function toggleSound(): boolean {
  const current = isSoundEnabled();
  const next = !current;
  setSoundEnabled(next);
  return next;
}

/**
 * Subtle shop-appropriate success chime for POS transactions and order finalization.
 * Plays a warm ascending acoustic chime (C5 523Hz -> E5 659Hz -> G5 784Hz) with gentle exponential decay.
 */
export function playSuccessChime(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.45, gain: 0.12 }, // C5
      { freq: 659.25, time: 0.08, dur: 0.50, gain: 0.14 }, // E5
      { freq: 783.99, time: 0.16, dur: 0.65, gain: 0.16 }, // G5
      { freq: 1046.50, time: 0.24, dur: 0.80, gain: 0.10 }, // C6 high shimmer
    ];

    notes.forEach(({ freq, time, dur, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Warm organic bell timbre
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      // Lowpass filter to avoid harsh digital brightness
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, now + time);

      // Gentle attack and organic acoustic exponential decay
      gainNode.gain.setValueAtTime(0.0001, now + time);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + time + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } catch {
    // Graceful fallback if Web Audio is blocked or unavailable
  }
}

/**
 * Subtle organic click cue for adding items to the cart or tactile register buttons.
 */
export function playClickCue(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.03);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch {}
}

/**
 * Subtle attention bell for status updates or ready orders.
 */
export function playAlertCue(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [
      { freq: 659.25, time: 0.00, dur: 0.35, gain: 0.10 }, // E5
      { freq: 880.00, time: 0.10, dur: 0.45, gain: 0.12 }, // A5
    ];

    notes.forEach(({ freq, time, dur, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gainNode.gain.setValueAtTime(0.0001, now + time);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + time + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } catch {}
}
