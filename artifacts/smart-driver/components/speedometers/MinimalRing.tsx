/**
 * Style 4 – Minimal Ring
 * Single ultra-thin SVG ring filled via strokeDashoffset, enormous centre
 * number, no tick marks — maximum negative space.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { WARNING_COLOR, WARNING_LABEL, WARNING_ICON } from '@/services/speedWarning';
import type { SpeedometerProps } from './types';

const SIZE_SVG: Record<string, number> = { small: 210, medium: 260, large: 310 };

const CX = 140; const CY = 148; const R = 118;
const C = 2 * Math.PI * R;
const ARC_FRAC = 240 / 360;
const ARC_LEN  = C * ARC_FRAC;
const GAP_LEN  = C - ARC_LEN;
// Rotate so the 240° arc starts at the 8-o'clock position (150° from 3 o'clock).
const RING_ROTATION = 150;

export function MinimalRing({
  speed, unit, speedKmh, limitKmh, limitDisplay,
  warningState, gaugeMax, size,
}: SpeedometerProps) {
  const svgSize = SIZE_SVG[size] ?? SIZE_SVG.medium;
  const accentColor = WARNING_COLOR[warningState];
  const isWarning = warningState !== 'normal';

  const fraction  = Math.min(1, Math.max(0, speedKmh / gaugeMax));
  const filledLen = fraction * ARC_LEN;
  const dashArray = `${filledLen.toFixed(2)} ${(C - filledLen).toFixed(2)}`;
  const bgDash    = `${ARC_LEN.toFixed(2)} ${GAP_LEN.toFixed(2)}`;

  return (
    <View style={styles.container}>
      <Svg width={svgSize} height={svgSize} viewBox="0 0 280 296">
        {/* Background ring — 240° track */}
        <Circle
          cx={CX} cy={CY} r={R}
          fill="none" stroke="#1F1F23" strokeWidth={4}
          strokeDasharray={bgDash}
          strokeLinecap="round"
          transform={`rotate(${RING_ROTATION} ${CX} ${CY})`}
        />

        {/* Filled ring */}
        {fraction > 0 && (
          <Circle
            cx={CX} cy={CY} r={R}
            fill="none" stroke={accentColor} strokeWidth={5}
            strokeDasharray={dashArray}
            strokeLinecap="round"
            transform={`rotate(${RING_ROTATION} ${CX} ${CY})`}
          />
        )}

        {/* Centre speed */}
        <SvgText x={CX} y={CY} textAnchor="middle" fontSize={72} fontFamily="SpaceGrotesk_700Bold" fill={accentColor}>
          {speed}
        </SvgText>
        <SvgText x={CX} y={CY + 36} textAnchor="middle" fontSize={11} fontFamily="SpaceGrotesk_600SemiBold" fill="#52525B">
          {unit}
        </SvgText>
        {limitKmh > 0 && (
          <SvgText x={CX} y={CY + 56} textAnchor="middle" fontSize={11} fontFamily="SpaceGrotesk_700Bold" fill={accentColor + 'BB'}>
            {'LIMIT  ' + limitDisplay}
          </SvgText>
        )}
      </Svg>

      {isWarning && (
        <View style={[styles.warningRow, { backgroundColor: accentColor + '18' }]}>
          <Ionicons name={WARNING_ICON[warningState] as any} size={12} color={accentColor} />
          <Text style={[styles.warningText, { color: accentColor }]}>{WARNING_LABEL[warningState]}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  warningRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  warningText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, letterSpacing: 0.8 },
});
