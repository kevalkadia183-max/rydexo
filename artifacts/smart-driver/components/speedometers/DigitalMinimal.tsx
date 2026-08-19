/**
 * Style 1 – Digital Minimal
 * Large bold number, clean dark card, limit badge, warning banner, stats row.
 * No SVG — pure React Native layout.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDuration, formatDistance } from '@/services/scoring';
import { WARNING_COLOR, WARNING_LABEL, WARNING_ICON } from '@/services/speedWarning';
import type { SpeedometerProps } from './types';

const SIZE_FONT: Record<string, number> = { small: 80, medium: 104, large: 128 };

export function DigitalMinimal({
  speed, unit, limitKmh, limitDisplay, avgSpeed, maxSpeed,
  distance, duration, warningState, tripActive,
  showAvgSpeed, showMaxSpeed, size,
}: SpeedometerProps) {
  const isWarning = warningState !== 'normal';
  const accentColor = WARNING_COLOR[warningState];
  const fontSize = SIZE_FONT[size] ?? SIZE_FONT.medium;

  return (
    <View style={styles.container}>
      {/* Limit pill */}
      {limitKmh > 0 && (
        <View style={[styles.limitPill, { borderColor: accentColor + '55' }]}>
          <Text style={[styles.limitText, { color: accentColor }]}>
            LIMIT  {limitDisplay}
          </Text>
        </View>
      )}

      {/* Main speed number */}
      <Text style={[styles.speedNum, { color: accentColor, fontSize }]}>
        {speed}
      </Text>
      <Text style={[styles.unitLabel, { color: accentColor + '99' }]}>{unit}</Text>

      {/* Warning banner */}
      {isWarning && (
        <View style={[styles.warningBanner, { backgroundColor: accentColor + '18', borderColor: accentColor + '44' }]}>
          <Ionicons name={WARNING_ICON[warningState] as any} size={13} color={accentColor} />
          <Text style={[styles.warningText, { color: accentColor }]}>
            {WARNING_LABEL[warningState]}
          </Text>
        </View>
      )}

      {/* Stats row */}
      {tripActive && (
        <View style={styles.statsRow}>
          <StatItem label="DIST" value={formatDistance(distance)} />
          {showAvgSpeed && <StatItem label="AVG" value={`${avgSpeed}`} />}
          {showMaxSpeed && <StatItem label="MAX" value={`${maxSpeed}`} />}
          <StatItem label="TIME" value={formatDuration(duration)} />
        </View>
      )}
    </View>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  limitPill: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 5,
  },
  limitText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, letterSpacing: 1.5 },
  speedNum: { fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -4, lineHeight: undefined },
  unitLabel: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13, letterSpacing: 3, marginTop: -6 },
  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    marginTop: 4,
  },
  warningText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, letterSpacing: 0.8 },
  statsRow: {
    flexDirection: 'row', gap: 20, marginTop: 8,
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: '#0A0A0C', borderRadius: 16,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: '#FAFAFA' },
  statLabel: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 9, color: '#3F3F46', letterSpacing: 0.6 },
});
