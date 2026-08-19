/**
 * Style 2 – Circular Gauge
 * Classic 240° SVG arc gauge with background track, filled arc, tick marks,
 * centre speed text, and unit/limit sub-labels.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { WARNING_COLOR, WARNING_LABEL, WARNING_ICON } from '@/services/speedWarning';
import { Ionicons } from '@expo/vector-icons';
import type { SpeedometerProps } from './types';

const SIZE_SVG: Record<string, number> = { small: 220, medium: 270, large: 320 };

const CX = 140; const CY = 148; const R_TRACK = 110;
const GAUGE_START = 150; const GAUGE_SWEEP = 240;

function toRad(d: number) { return (d * Math.PI) / 180; }
function polar(cx: number, cy: number, r: number, deg: number) {
  return { x: cx + r * Math.cos(toRad(deg)), y: cy + r * Math.sin(toRad(deg)) };
}
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const spanDeg = ((endDeg - startDeg) + 360) % 360;
  const large = spanDeg > 180 ? 1 : 0;
  return `M${s.x.toFixed(2)} ${s.y.toFixed(2)} A${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

export function CircularGauge({
  speed, unit, speedKmh, limitKmh, limitDisplay,
  avgSpeed, maxSpeed, warningState, gaugeMax, tripActive,
  showAvgSpeed, showMaxSpeed, size,
}: SpeedometerProps) {
  const svgSize = SIZE_SVG[size] ?? SIZE_SVG.medium;
  const accentColor = WARNING_COLOR[warningState];
  const isWarning = warningState !== 'normal';

  const fraction = Math.min(1, Math.max(0, speedKmh / gaugeMax));
  const filledEnd = GAUGE_START + fraction * GAUGE_SWEEP;

  const limitFrac = limitKmh > 0 ? Math.min(1, limitKmh / gaugeMax) : -1;
  const limitAngle = GAUGE_START + limitFrac * GAUGE_SWEEP;

  const ticks = useMemo(() => {
    const step = gaugeMax <= 160 ? 20 : gaugeMax <= 220 ? 30 : 40;
    const result: { deg: number; label: string }[] = [];
    for (let v = 0; v <= gaugeMax; v += step) {
      result.push({ deg: GAUGE_START + (v / gaugeMax) * GAUGE_SWEEP, label: String(v) });
    }
    return result;
  }, [gaugeMax]);

  const bgPath   = arcPath(CX, CY, R_TRACK, GAUGE_START, GAUGE_START + GAUGE_SWEEP);
  const fillPath = fraction > 0 ? arcPath(CX, CY, R_TRACK, GAUGE_START, filledEnd) : null;

  return (
    <View style={styles.container}>
      <Svg width={svgSize} height={svgSize} viewBox="0 0 280 296">
        {/* Background track */}
        <Path d={bgPath} stroke="#1F1F23" strokeWidth={12} fill="none" strokeLinecap="round" />

        {/* Filled arc */}
        {fillPath && (
          <Path d={fillPath} stroke={accentColor} strokeWidth={12} fill="none" strokeLinecap="round" />
        )}

        {/* Speed limit marker */}
        {limitKmh > 0 && limitFrac >= 0 && limitFrac <= 1 && (() => {
          const p1 = polar(CX, CY, R_TRACK - 8, limitAngle);
          const p2 = polar(CX, CY, R_TRACK + 8, limitAngle);
          return <Line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />;
        })()}

        {/* Tick marks */}
        {ticks.map((t, i) => {
          const p1 = polar(CX, CY, R_TRACK + 3, t.deg);
          const p2 = polar(CX, CY, R_TRACK + 12, t.deg);
          const lp = polar(CX, CY, R_TRACK + 22, t.deg);
          return (
            <G key={i}>
              <Line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#3F3F46" strokeWidth={1.5} />
              <SvgText x={lp.x} y={lp.y + 3} textAnchor="middle" fontSize={8} fill="#52525B" fontFamily="SpaceGrotesk_600SemiBold">
                {t.label}
              </SvgText>
            </G>
          );
        })}

        {/* Hub */}
        <Circle cx={CX} cy={CY} r={4} fill={accentColor} />

        {/* Centre speed — dy offsets compensate for SVG text baseline */}
        <SvgText x={CX} y={CY - 8} textAnchor="middle" fontSize={52} fontFamily="SpaceGrotesk_700Bold" fill={accentColor}>
          {speed}
        </SvgText>
        <SvgText x={CX} y={CY + 30} textAnchor="middle" fontSize={11} fontFamily="SpaceGrotesk_600SemiBold" fill="#52525B">
          {unit}
        </SvgText>
        {limitKmh > 0 && (
          <SvgText x={CX} y={CY + 50} textAnchor="middle" fontSize={10} fontFamily="SpaceGrotesk_700Bold" fill={accentColor + 'AA'}>
            {limitDisplay}
          </SvgText>
        )}
      </Svg>

      {isWarning && (
        <View style={[styles.warningRow, { backgroundColor: accentColor + '18' }]}>
          <Ionicons name={WARNING_ICON[warningState] as any} size={12} color={accentColor} />
          <Text style={[styles.warningText, { color: accentColor }]}>{WARNING_LABEL[warningState]}</Text>
        </View>
      )}

      {tripActive && (showAvgSpeed || showMaxSpeed) && (
        <View style={styles.statsRow}>
          {showAvgSpeed && <MiniStat label="AVG" value={`${avgSpeed}`} />}
          {showMaxSpeed && <MiniStat label="MAX" value={`${maxSpeed}`} />}
        </View>
      )}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniVal}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 6 },
  warningRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  warningText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, letterSpacing: 0.8 },
  statsRow: { flexDirection: 'row', gap: 24 },
  miniStat: { alignItems: 'center', gap: 2 },
  miniVal: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: '#FAFAFA' },
  miniLabel: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 9, color: '#3F3F46', letterSpacing: 0.6 },
});
