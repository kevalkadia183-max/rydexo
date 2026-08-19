import type { WarningState } from '@/models/types';

/** Number of consecutive GPS readings a state must be stable before it is adopted (upgrade only). */
const CONFIRMATION_READINGS = 3;

// ─── Pure computation ─────────────────────────────────────────────────────────

/**
 * Compute the candidate WarningState for a single GPS reading.
 * @param speedKmh      Smoothed speed in km/h
 * @param limitKmh      Current speed limit in km/h (0 = none set)
 * @param approachingKmh  How many km/h below the limit triggers approaching warning
 * @param overKmh       How many km/h over the limit triggers over-limit (from speedAlertThreshold)
 * @param severeKmh     How many km/h over the limit triggers severe
 */
export function computeWarningState(
  speedKmh: number,
  limitKmh: number,
  approachingKmh: number,
  overKmh: number,
  severeKmh: number,
): WarningState {
  if (limitKmh <= 0) return 'normal';
  if (speedKmh >= limitKmh + severeKmh) return 'severe';
  if (speedKmh >= limitKmh + overKmh) return 'over-limit';
  if (speedKmh >= limitKmh - approachingKmh) return 'approaching';
  return 'normal';
}

// ─── Visual metadata ──────────────────────────────────────────────────────────

export const WARNING_COLOR: Record<WarningState, string> = {
  'normal':    '#00E5FF',
  'approaching': '#FFE600',
  'over-limit':  '#FF6B00',
  'severe':      '#FF003C',
};

export const WARNING_LABEL: Record<WarningState, string> = {
  'normal':    '',
  'approaching': 'APPROACHING LIMIT',
  'over-limit':  'OVER LIMIT — SLOW DOWN',
  'severe':      'SEVERE — SLOW DOWN NOW',
};

export const WARNING_ICON: Record<WarningState, string> = {
  'normal':    'checkmark-circle',
  'approaching': 'alert-circle-outline',
  'over-limit':  'warning-outline',
  'severe':      'alert',
};

function warningLevel(state: WarningState): number {
  return ['normal', 'approaching', 'over-limit', 'severe'].indexOf(state);
}

// ─── Confirmation-window state machine ───────────────────────────────────────

export interface WarningMachineState {
  current: WarningState;
  pending: WarningState;
  pendingCount: number;
}

export function createWarningMachine(): WarningMachineState {
  return { current: 'normal', pending: 'normal', pendingCount: 0 };
}

/**
 * Feed a candidate state into the machine. Downgrades to safer states are applied
 * immediately; upgrades require CONFIRMATION_READINGS consecutive readings.
 * Mutates the passed state object in place and returns the current resolved state.
 */
export function updateWarningMachine(
  machine: WarningMachineState,
  candidate: WarningState,
): WarningState {
  if (candidate === machine.pending) {
    machine.pendingCount++;
  } else {
    machine.pending = candidate;
    machine.pendingCount = 1;
  }

  const isDowngrade = warningLevel(candidate) < warningLevel(machine.current);
  if (isDowngrade || machine.pendingCount >= CONFIRMATION_READINGS) {
    machine.current = candidate;
  }

  return machine.current;
}

export function resetWarningMachine(machine: WarningMachineState): void {
  machine.current = 'normal';
  machine.pending = 'normal';
  machine.pendingCount = 0;
}
