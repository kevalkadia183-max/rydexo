/**
 * Style 3 – Sport Gauge
 * Thicker arcs with coloured zone bands (cyan/amber/red), bold needle with
 * hub circle, speed-limit notch, and aggressive typographic treatment.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { WARNING_COLOR, WARNING_LABEL, WARNING_ICON } from '@/services/speedWarning';
import type { SpeedometerProps } from './types';

const SIZE_SVG: Record<string, number> = { small: 230, medium: 280, large: 330 };

const CX = 140; const CY = 148;
const R_OUTER = 118; const R_INNER = 100;
const GAUGE_START = 150; const GAUGE_SWEEP = 240;

const ZONE_NORMAL_END = 0.75;
const ZONE_WARN_END   = 0.90;

function toRad(d: number) { return (d * Math.PI) / 180; }
function polar(cx: number, cy: number, r: number, deg: number) {
  return { x: cx + r * Math.cos(toRad(deg)), y: cy + r * Math.sin(toRad(deg)) };
}
function arcPath(cx: number, cy: number, r: number, s: number, e: number): string {
  const sp = polar(cx, cy, r, s);
  const ep = polar(cx, cy, r, e);
  const span = ((e - s) + 360) % 360;
  return `M${sp.x.toFixed(2)} ${sp.y.toFixed(2)} A${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${ep.x.toFixed(2)} ${ep.y.toFixed(2)}`;
}

export function SportGauge({
  speed, unit, speedKmh, limitKmh, limitDisplay,
  avgSpeed, maxSpeed, warningState, gaugeMax, tripActive,
  showAvgSpeed, showMaxSpeed, size,
}: SpeedometerProps) {
  const svgSize = SIZE_SVG[size] ?? SIZE_SVG.medium;
  const accentColor = WARNING_COLOR[warningState];
  const isWarning = warningState !== 'normal';
  const fraction = Math.min(1, Math.max(0, speedKmh / gaugeMax));

  const zoneNormalEnd = GAUGE_START + ZONE_NORMAL_END * GAUGE_SWEEP;
  const zoneWarnEnd   = GAUGE_START + ZONE_WARN_END   * GAUGE_SWEEP;
  const zoneRedEnd    = GAUGE_START + GAUGE_SWEEP;

  const needleAngle = GAUGE_START + fraction * GAUGE_SWEEP;
  const needleTip  = polar(CX, CY, R_OUTER + 8, needleAngle);
  const needleBase = polar(CX, CY, 18, needleAngle);

  const limitFrac  = limitKmh > 0 ? Math.min(1, limitKmh / gaugeMax) : -1;
  const limitAngle = GAUGE_START + limitFrac * GAUGE_SWEEP;

  const ticks = useMemo(() => {
    const step = gaugeMax <= 160 ? 20 : gaugeMax <= 220 ? 30 : 40;
    const result: { deg: number; label: string }[] = [];
    for (let v = 0; v <= gaugeMax; v += step) {
      result.push({ deg: GAUGE_START + (v / gaugeMax) * GAUGE_SWEEP, label: String(v) });
    }
    return result;
  }, [gaugeMax]);

  const mid = (R_OUTER + R_INNER) / 2;
  const strokeW = R_OUTER - R_INNER;

  return (
    <View style={styles.container}>
      <Svg width={svgSize} height={svgSize} viewBox="0 0 280 296">
        {/* Zone bands */}
        <Path d={arcPath(CX, CY, mid, GAUGE_START, zoneNormalEnd)} stroke="#00E5FF22" strokeWidth={strokeW} fill="none" />
        <Path d={arcPath(CX, CY, mid, zoneNormalEnd, zoneWarnEnd)} stroke="#FFE60022" strokeWidth={strokeW} fill="none" />
        <Path d={arcPath(CX, CY, mid, zoneWarnEnd, zoneRedEnd)}   stroke="#FF003C22" strokeWidth={strokeW} fill="none" />

        {/* Outer thin track */}
        <Path d={arcPath(CX, CY, mid, GAUGE_START, GAUGE_START + GAUGE_SWEEP)} stroke="#2A2A2E" strokeWidth={2} fill="none" />

        {/* Filled arc — zone-coloured */}
        {fraction > 0 && (() => {
          const fillEnd = GAUGE_START + fraction * GAUGE_SWEEP;
          const end1 = Math.min(fillEnd, zoneNormalEnd);
          const end2 = Math.min(fillEnd, zoneWarnEnd);
          return (
            <G>
              {end1 > GAUGE_START && (
                <Path d={arcPath(CX, CY, mid, GAUGE_START, end1)} stroke="#00E5FF" strokeWidth={strokeW - 4} fill="none" strokeLinecap="round" />
              )}
              {end2 > zoneNormalEnd && (
                <Path d={arcPath(CX, CY, mid, zoneNormalEnd, end2)} stroke="#FFE600" strokeWidth={strokeW - 4} fill="none" strokeLinecap="round" />
              )}
              {fillEnd > zoneWarnEnd && (
                <Path d={arcPath(CX, CY, mid, zoneWarnEnd, fillEnd)} stroke="#FF003C" strokeWidth={strokeW - 4} fill="none" strokeLinecap="round" />
              )}
            </G>
          );
        })()}

        {/* Ticks */}
        {ticks.map((t, i) => {
          const p1 = polar(CX, CY, R_OUTER + 3, t.deg);
          const p2 = polar(CX, CY, R_OUTER + 11, t.deg);
          const lp = polar(CX, CY, R_OUTER + 22, t.deg);
          return (
            <G key={i}>
              <Line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#52525B" strokeWidth={2} strokeLinecap="round" />
              <SvgText x={lp.x} y={lp.y + 3} textAnchor="middle" fontSize={8} fontFamily="SpaceGrotesk_700Bold" fill="#52525B">
                {t.label}
              </SvgText>
            </G>
          );
        })}

        {/* Limit notch */}
        {limitKmh > 0 && limitFrac >= 0 && limitFrac <= 1 && (() => {
          const p1 = polar(CX, CY, R_INNER - 2, limitAngle);
          const p2 = polar(CX, CY, R_OUTER + 2, limitAngle);
          return <Line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />;
        })()}

        {/* Needle */}
        <Line x1={needleBase.x} y1={needleBase.y} x2={needleTip.x} y2={needleTip.y}
          stroke={accentColor} strokeWidth={3} strokeLinecap="round" />

        {/* Hub */}
        <Circle cx={CX} cy={CY} r={9} fill="#0A0A0C" stroke={accentColor} strokeWidth={2.5} />
        <Circle cx={CX} cy={CY} r={3} fill={accentColor} />

        {/* Centre speed */}
        <SvgText x={CX} y={CY - 6} textAnchor="middle" fontSize={46} fontFamily="SpaceGrotesk_700Bold" fill={accentColor}>
          {speed}
        </SvgText>
        <SvgText x={CX} y={CY + 28} textAnchor="middle" fontSize={10} fontFamily="SpaceGrotesk_600SemiBold" fill="#52525B">
          {unit}
        </SvgText>
        {limitKmh > 0 && (
          <SvgText x={CX} y={CY + 47} textAnchor="middle" fontSize={10} fontFamily="SpaceGrotesk_700Bold" fill={accentColor + 'BB'}>
            {'LIM ' + limitDisplay}
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
