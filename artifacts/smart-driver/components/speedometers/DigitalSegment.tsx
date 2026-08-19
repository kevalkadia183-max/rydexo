/**
 * Style 5 – Digital Segment
 * Retro LCD panel built on the existing 7-segment DigitalSpeed component.
 * Adds a scanline-effect background, a limit/avg/max readout strip, and
 * warning state indicator.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DigitalSpeed } from '@/components/DigitalSpeed';
import { WARNING_COLOR, WARNING_LABEL, WARNING_ICON } from '@/services/speedWarning';
import { formatDuration, formatDistance } from '@/services/scoring';
import type { SpeedometerProps } from './types';

const DIGIT_H: Record<string, number> = { small: 72, medium: 96, large: 118 };

export function DigitalSegment({
  speed, unit, limitKmh, limitDisplay, avgSpeed, maxSpeed,
  distance, duration, warningState, tripActive,
  showAvgSpeed, showMaxSpeed, size,
}: SpeedometerProps) {
  const isOver = warningState === 'over-limit' || warningState === 'severe';
  const isWarning = warningState !== 'normal';
  const accentColor = WARNING_COLOR[warningState];
  const digitH = DIGIT_H[size] ?? DIGIT_H.medium;

  return (
    <View style={styles.outer}>
      {/* LCD panel */}
      <View style={[styles.panel, { borderColor: accentColor + '33' }]}>

        {/* Top row: limit indicator */}
        <View style={styles.panelTop}>
          <Text style={[styles.panelLabel, { color: accentColor + '88' }]}>SPEED</Text>
          {limitKmh > 0 && (
            <View style={[styles.limitBadge, { borderColor: accentColor + '55', backgroundColor: accentColor + '11' }]}>
              <Text style={[styles.limitBadgeText, { color: accentColor }]}>LIM {limitDisplay}</Text>
            </View>
          )}
        </View>

        {/* 7-segment display */}
        <View style={styles.segDisplay}>
          <DigitalSpeed value={speed} isOver={isOver} digitHeight={digitH} />
        </View>

        {/* Unit row */}
        <Text style={[styles.unitRow, { color: accentColor + '66' }]}>{unit}</Text>

        {/* Readout strip */}
        {tripActive && (
          <View style={[styles.readoutStrip, { borderTopColor: accentColor + '22' }]}>
            <ReadCell label="DIST" value={formatDistance(distance)} color={accentColor} />
            {showAvgSpeed && <ReadCell label="AVG" value={`${avgSpeed}`} color={accentColor} />}
            {showMaxSpeed && <ReadCell label="MAX" value={`${maxSpeed}`} color={accentColor} />}
            <ReadCell label="TIME" value={formatDuration(duration)} color={accentColor} />
          </View>
        )}
      </View>

      {/* Warning state */}
      {isWarning && (
        <View style={[styles.warningRow, { backgroundColor: accentColor + '18' }]}>
          <Ionicons name={WARNING_ICON[warningState] as any} size={12} color={accentColor} />
          <Text style={[styles.warningText, { color: accentColor }]}>{WARNING_LABEL[warningState]}</Text>
        </View>
      )}
    </View>
  );
}

function ReadCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.readCell}>
      <Text style={[styles.readValue, { color: color + 'CC' }]}>{value}</Text>
      <Text style={[styles.readLabel, { color: color + '55' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { alignItems: 'center', gap: 10 },
  panel: {
    backgroundColor: '#0A0A0C',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    minWidth: 240,
  },
  panelTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', width: '100%', marginBottom: 4,
  },
  panelLabel: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 10, letterSpacing: 2 },
  limitBadge: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  limitBadgeText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 10, letterSpacing: 1 },
  segDisplay: { alignItems: 'center' },
  unitRow: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 10, letterSpacing: 4, marginTop: -2 },
  readoutStrip: {
    flexDirection: 'row', gap: 16,
    borderTopWidth: 1, paddingTop: 10, marginTop: 4, width: '100%',
    justifyContent: 'space-around',
  },
  readCell: { alignItems: 'center', gap: 2 },
  readValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13 },
  readLabel: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 9, letterSpacing: 1 },
  warningRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  warningText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, letterSpacing: 0.8 },
});
