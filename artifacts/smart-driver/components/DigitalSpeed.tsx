/**
 * DigitalSpeed — 7-segment LCD-style speed display.
 * Uses react-native-svg to render authentic segment shapes.
 * Rydexo colour palette: cyan active, dim inactive.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

// Per-digit segment map  [a, b, c, d, e, f, g]
//   a = top, b = top-right, c = bot-right, d = bottom,
//   e = bot-left, f = top-left, g = middle
const SEG: Record<string, number[]> = {
  '0': [1, 1, 1, 1, 1, 1, 0],
  '1': [0, 1, 1, 0, 0, 0, 0],
  '2': [1, 1, 0, 1, 1, 0, 1],
  '3': [1, 1, 1, 1, 0, 0, 1],
  '4': [0, 1, 1, 0, 0, 1, 1],
  '5': [1, 0, 1, 1, 0, 1, 1],
  '6': [1, 0, 1, 1, 1, 1, 1],
  '7': [1, 1, 1, 0, 0, 0, 0],
  '8': [1, 1, 1, 1, 1, 1, 1],
  '9': [1, 1, 1, 1, 0, 1, 1],
};

// Segment geometry for viewBox "0 0 18 30"
// [x, y, width, height]
const GEO: [number, number, number, number][] = [
  [2.5, 0.5,  13,  2.5], // a – top
  [15,  2.5,  2.5, 11 ], // b – top-right
  [15,  16.5, 2.5, 11 ], // c – bot-right
  [2.5, 27,   13,  2.5], // d – bottom
  [0.5, 16.5, 2.5, 11 ], // e – bot-left
  [0.5, 2.5,  2.5, 11 ], // f – top-left
  [2.5, 13.75,13,  2.5], // g – middle
];

const VB_W = 18;
const VB_H = 30;
const RX = 1.2;
const GAP = 6; // px gap between digits

interface Props {
  /** Numeric speed value to display */
  value: number;
  /** True when speed exceeds the set limit */
  isOver: boolean;
  /** Rendered height of each digit in pixels */
  digitHeight?: number;
}

export function DigitalSpeed({ value, isOver, digitHeight = 88 }: Props) {
  const scale = digitHeight / VB_H;
  const digitW = VB_W * scale;

  const activeColor = isOver ? '#FF003C' : '#00E5FF';
  const dimColor    = isOver ? '#FF003C14' : '#00E5FF12';

  // Always render at least 1 digit; pad to width of the number
  const digits = value <= 0 ? ['0'] : String(Math.round(value)).split('');

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: GAP }}>
      {digits.map((d, i) => {
        const segs = SEG[d] ?? [0, 0, 0, 0, 0, 0, 0];
        return (
          <Svg
            key={i}
            width={digitW}
            height={digitHeight}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
          >
            {GEO.map(([x, y, w, h], si) => (
              <Rect
                key={si}
                x={x} y={y} width={w} height={h}
                rx={RX} ry={RX}
                fill={segs[si] ? activeColor : dimColor}
              />
            ))}
          </Svg>
        );
      })}
    </View>
  );
}
