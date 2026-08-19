/**
 * Style 6 – Premium Dashboard
 * Elegant card layout: limit pill at top, huge centre number, divider,
 * 2×2 stat grid. Subtle cyan glow border that intensifies with warning level.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDuration, formatDistance } from '@/services/scoring';
import { WARNING_COLOR, WARNING_LABEL, WARNING_ICON } from '@/services/speedWarning';
import type { SpeedometerProps } from './types';

const SIZE_FONT: Record<string, number> = { small: 88, medium: 112, large: 136 };
const SIZE_CARD: Record<string, number> = { small: 280, medium: 320, large: 360 };

export function PremiumDashboard({
  speed, unit, limitKmh, limitDisplay, avgSpeed, maxSpeed,
  distance, duration, warningState, tripActive,
  showAvgSpeed, showMaxSpeed, altitude, heading,
  showAltitude, showHeading, size,
}: SpeedometerProps) {
  const accentColor = WARNING_COLOR[warningState];
  const isWarning = warningState !== 'normal';
  const fontSize = SIZE_FONT[size] ?? SIZE_FONT.medium;
  const cardWidth = SIZE_CARD[size] ?? SIZE_CARD.medium;

  return (
    <View style={[styles.card, { width: cardWidth, borderColor: accentColor + '33',
      shadowColor: accentColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 20 }]}>

      {/* Top row: limit + warning icon */}
      <View style={styles.topRow}>
        {limitKmh > 0 ? (
          <View style={[styles.limitPill, { backgroundColor: accentColor + '18', borderColor: accentColor + '55' }]}>
            <Text style={[styles.limitPillText, { color: accentColor }]}>LIMIT  {limitDisplay}</Text>
          </View>
        ) : (
          <View />
        )}
        {isWarning && (
          <View style={[styles.warnIcon, { backgroundColor: accentColor + '22' }]}>
            <Ionicons name={WARNING_ICON[warningState] as any} size={16} color={accentColor} />
          </View>
        )}
      </View>

      {/* Main speed */}
      <View style={styles.speedRow}>
        <Text style={[styles.speedNum, { color: accentColor, fontSize }]}>
          {speed}
        </Text>
        <Text style={[styles.unitSup, { color: accentColor + '77' }]}>{unit}</Text>
      </View>

      {/* Warning label */}
      {isWarning && (
        <Text style={[styles.warningLabel, { color: accentColor }]}>
          {WARNING_LABEL[warningState]}
        </Text>
      )}

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: accentColor + '22' }]} />

      {/* Stats grid */}
      {tripActive ? (
        <View style={styles.grid}>
          <GridCell label="DISTANCE" value={formatDistance(distance)} accent={accentColor} />
          <GridCell label="TIME" value={formatDuration(duration)} accent={accentColor} />
          {showAvgSpeed && <GridCell label="AVG SPEED" value={`${avgSpeed} ${unit}`} accent={accentColor} />}
          {showMaxSpeed && <GridCell label="MAX SPEED" value={`${maxSpeed} ${unit}`} accent={accentColor} />}
        </View>
      ) : (
        <View style={styles.grid}>
          {showAltitude && <GridCell label="ALTITUDE" value={`${Math.round(altitude)} m`} accent={accentColor} />}
          {showHeading && <GridCell label="HEADING" value={`${Math.round(heading)}°`} accent={accentColor} />}
        </View>
      )}
    </View>
  );
}

function GridCell({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.gridCell}>
      <Text style={[styles.gridValue, { color: accent + 'EE' }]}>{value}</Text>
      <Text style={styles.gridLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0A0A0C',
    borderWidth: 1.5,
    borderRadius: 28,
    padding: 24,
    gap: 12,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  limitPill: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  limitPillText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, letterSpacing: 1.5 },
  warnIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  speedRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    marginTop: 4,
  },
  speedNum: {
    fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -4, lineHeight: undefined,
  },
  unitSup: {
    fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13, letterSpacing: 2,
    marginBottom: 16,
  },
  warningLabel: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, letterSpacing: 0.8,
    marginTop: -6,
  },
  divider: { height: 1, borderRadius: 1 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 16,
  },
  gridCell: { minWidth: '40%', gap: 2 },
  gridValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 },
  gridLabel: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 10, color: '#3F3F46', letterSpacing: 0.6 },
});
