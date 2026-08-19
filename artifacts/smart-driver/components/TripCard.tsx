import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { formatDuration, formatDistance, getScoreColor, getScoreLabel } from '@/services/scoring';
import type { Trip } from '@/models/types';

interface Props {
  trip: Trip;
  onPress: () => void;
}

export function TripCard({ trip, onPress }: Props) {
  const colors = useColors();
  const scoreColor = getScoreColor(trip.score, { primary: colors.primary, success: colors.success, warning: colors.warning, destructive: colors.destructive });

  const date = new Date(trip.startTime);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = date.toDateString() === new Date(now.getTime() - 86400000).toDateString();
  const dayLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.day, { color: colors.mutedForeground }]}>{dayLabel} · {timeLabel}</Text>
          <Text style={[styles.vehicle, { color: colors.foreground }]}>{trip.vehicleName}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '10', borderColor: scoreColor + '30' }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>{trip.score}</Text>
          <Text style={[styles.scoreLabel, { color: scoreColor }]}>{getScoreLabel(trip.score)}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat icon="navigate-outline" value={formatDistance(trip.distance)} label="Distance" colors={colors} />
        <Stat icon="time-outline" value={formatDuration(trip.duration)} label="Duration" colors={colors} />
        <Stat icon="speedometer-outline" value={`${trip.avgSpeed}`} label="Avg KM/H" colors={colors} />
        <Stat icon="flash-outline" value={`${trip.maxSpeed}`} label="Max KM/H" colors={colors} />
      </View>

      {trip.events.length > 0 && (
        <View style={[styles.eventsBadge, { backgroundColor: colors.muted }]}>
          <Ionicons name="warning-outline" size={12} color={colors.warning} />
          <Text style={[styles.eventsText, { color: colors.mutedForeground }]}>{trip.events.length} event{trip.events.length > 1 ? 's' : ''}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function Stat({ icon, value, label, colors }: { icon: any; value: string; label: string; colors: any }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={14} color={colors.mutedForeground} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  day: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  vehicle: { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold' },
  scoreBadge: { alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  scoreText: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 22 },
  scoreLabel: { fontSize: 10, fontFamily: 'SpaceGrotesk_500Medium', marginTop: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', marginTop: 2 },
  statLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  eventsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  eventsText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
});
