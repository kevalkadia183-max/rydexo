export { DigitalMinimal }    from './DigitalMinimal';
export { CircularGauge }     from './CircularGauge';
export { SportGauge }        from './SportGauge';
export { MinimalRing }       from './MinimalRing';
export { DigitalSegment }    from './DigitalSegment';
export { PremiumDashboard }  from './PremiumDashboard';
export type { SpeedometerProps } from './types';

import { DigitalMinimal }   from './DigitalMinimal';
import { CircularGauge }    from './CircularGauge';
import { SportGauge }       from './SportGauge';
import { MinimalRing }      from './MinimalRing';
import { DigitalSegment }   from './DigitalSegment';
import { PremiumDashboard } from './PremiumDashboard';
import type { SpeedometerStyle } from '@/models/types';
import type { SpeedometerProps } from './types';
import React from 'react';

export interface StyleEntry {
  id: SpeedometerStyle;
  label: string;
  description: string;
  /** Accent swatch colors for mini-preview */
  swatches: string[];
  component: React.ComponentType<SpeedometerProps>;
}

export const SPEEDOMETER_STYLES: StyleEntry[] = [
  {
    id: 'digital-minimal',
    label: 'Digital Minimal',
    description: 'Large bold number on a clean dark background',
    swatches: ['#00E5FF', '#000000', '#1F1F23'],
    component: DigitalMinimal,
  },
  {
    id: 'circular-gauge',
    label: 'Circular Gauge',
    description: 'Classic 240° arc gauge with tick marks',
    swatches: ['#00E5FF', '#1F1F23', '#000000'],
    component: CircularGauge,
  },
  {
    id: 'sport-gauge',
    label: 'Sport Gauge',
    description: 'Zone bands, needle, and coloured arcs',
    swatches: ['#00E5FF', '#FFE600', '#FF003C'],
    component: SportGauge,
  },
  {
    id: 'minimal-ring',
    label: 'Minimal Ring',
    description: 'Thin ring fill, maximum negative space',
    swatches: ['#00E5FF', '#000000', '#1F1F23'],
    component: MinimalRing,
  },
  {
    id: 'digital-segment',
    label: 'Digital Segment',
    description: 'Retro 7-segment LCD panel display',
    swatches: ['#00E5FF', '#0A0A0C', '#1A1A1E'],
    component: DigitalSegment,
  },
  {
    id: 'premium-dashboard',
    label: 'Premium Dashboard',
    description: 'Card layout with stat grid and glow border',
    swatches: ['#00E5FF', '#0E0E11', '#1F1F23'],
    component: PremiumDashboard,
  },
];

/** Look up the style entry for a given id (falls back to the first). */
export function getStyleEntry(id: SpeedometerStyle): StyleEntry {
  return SPEEDOMETER_STYLES.find(s => s.id === id) ?? SPEEDOMETER_STYLES[0];
}

/** Return the id of the next style in the cycle. */
export function nextStyle(current: SpeedometerStyle): SpeedometerStyle {
  const idx = SPEEDOMETER_STYLES.findIndex(s => s.id === current);
  return SPEEDOMETER_STYLES[(idx + 1) % SPEEDOMETER_STYLES.length].id;
}
