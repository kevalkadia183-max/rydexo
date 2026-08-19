import * as Haptics from 'expo-haptics';
import type { WarningState } from '@/models/types';

// Lazy-require expo-speech so the app doesn't crash if the package is absent
let Speech: { speak: (text: string, options?: object) => void; stop: () => void } | null = null;
try {
  Speech = require('expo-speech');
} catch {}

// ─── Cooldown config (milliseconds per warning level) ────────────────────────

const COOLDOWN_MS: Record<WarningState, number> = {
  'normal':    0,
  'approaching': 20_000,
  'over-limit':  15_000,
  'severe':      10_000,
};

const VOICE_MSG: Record<WarningState, string> = {
  'normal':    '',
  'approaching': 'Approaching speed limit',
  'over-limit':  'Please slow down',
  'severe':      'Slow down now',
};

// ─── Tracker (stored in a ref on the caller) ─────────────────────────────────

export interface AlertTracker {
  lastAlertMs: Record<WarningState, number>;
}

export function createAlertTracker(): AlertTracker {
  return {
    lastAlertMs: { normal: 0, approaching: 0, 'over-limit': 0, severe: 0 },
  };
}

/** Reset cooldowns (e.g. when speed drops back below threshold). */
export function resetAlertTracker(tracker: AlertTracker): void {
  tracker.lastAlertMs = { normal: 0, approaching: 0, 'over-limit': 0, severe: 0 };
}

// ─── Main trigger ─────────────────────────────────────────────────────────────

export interface AlertOptions {
  hapticEnabled: boolean;
  voiceEnabled: boolean;
}

/**
 * Fire haptic + optional voice alert for the given warning state.
 * Respects per-level cooldowns so alerts never fire on every GPS tick.
 * Mutates tracker.lastAlertMs when an alert fires.
 */
export function triggerAlert(
  state: WarningState,
  tracker: AlertTracker,
  options: AlertOptions,
): void {
  if (state === 'normal') return;

  const now = Date.now();
  const cooldown = COOLDOWN_MS[state];
  if (now - (tracker.lastAlertMs[state] ?? 0) < cooldown) return;

  tracker.lastAlertMs[state] = now;

  // ── Haptic ────────────────────────────────────────────────────────────────
  if (options.hapticEnabled) {
    try {
      switch (state) {
        case 'approaching':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'over-limit':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'severe':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
      }
    } catch {}
  }

  // ── Voice ─────────────────────────────────────────────────────────────────
  if (options.voiceEnabled && Speech) {
    const msg = VOICE_MSG[state];
    if (msg) {
      try {
        Speech.stop();
        Speech.speak(msg, { rate: 0.9, pitch: 1.0 });
      } catch {}
    }
  }
}
