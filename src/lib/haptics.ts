/**
 * Haptic and Vibration Feedback System
 * Provides tactile haptic pulses for buttons, dial pads, quantity adjustments, and checkout.
 */

export function triggerHaptic(type: 'tap' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'tap') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    switch (type) {
      case 'tap':
      case 'light':
        // Crisp 15ms pulse for keypad digit buttons and tabs
        navigator.vibrate?.(15);
        break;
      case 'medium':
        // Noticeable 35ms feedback for adding items to ticket/cart
        navigator.vibrate?.(35);
        break;
      case 'heavy':
        // Strong 60ms feedback for action confirmations
        navigator.vibrate?.(60);
        break;
      case 'success':
        // Celebratory double pulse: 40ms, pause 40ms, 80ms
        navigator.vibrate?.([40, 40, 80]);
        break;
      case 'warning':
        // Alert double pulse
        navigator.vibrate?.([70, 50, 70]);
        break;
      case 'error':
        // Triple short error buzzes
        navigator.vibrate?.([60, 40, 60, 40, 100]);
        break;
    }
  } catch {
    // Ignore environments where vibrate is restricted or ungranted
  }
}
