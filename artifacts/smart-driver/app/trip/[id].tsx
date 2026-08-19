import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { getTripById } from '@/services/storage';
import { formatDistance, formatDuration, formatSpeed, formatSpeedUnit, getScoreColor, getScoreLabel, formatCurrency } from '@/services/scoring';
import { ScoreCircle } from '@/components/ScoreCircle';
import { fetchTripCoaching } from '@/services/aiCoaching';
import type { Trip } from '@/models/types';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useApp();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [MapView, setMapView] = useState<any>(null);
  const [Polyline, setPolyline] = useState<any>(null);
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [aiTipsLoading, setAiTipsLoading] = useState(false);

  useEffect(() => {
    if (id) getTripById(id).then(t => { setTrip(t); setLoading(false); });
  }, [id]);

  // Fetch AI coaching tips once the trip is loaded
  useEffect(() => {
    if (!trip) return;
    setAiTipsLoading(true);
    fetchTripCoaching({
      score: trip.score,
      events: trip.events,
      distance: trip.distance,
      maxSpeed: trip.maxSpeed,
      duration: trip.duration,
    }).then(result => {
      setAiTips(result.tips);
      setAiTipsLoading(false);
    }).catch(() => setAiTipsLoading(false));
  }, [trip?.id]);

  useEffect(() => {
    try {
      const maps = require('react-native-maps');
      setMapView(() => maps.default);
      setPolyline(() => maps.Polyline);
    } catch {}
  }, []);

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? Math.max(insets.top + 16, 83) : insets.top + 16;
  const bottomPad = isWeb ? 34 : insets.bottom + 20;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Trip not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const scoreColor = getScoreColor(trip.score, { primary: colors.primary, success: colors.success, warning: colors.warning, destructive: colors.destructive });
  const date = new Date(trip.startTime);
  const coords = trip.points.map(p => ({ latitude: p.lat, longitude: p.lng }));
  const hasMap = MapView && coords.length > 0;
  const center = coords.length > 0 ? coords[Math.floor(coords.length / 2)] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{trip.vehicleName}</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>
        {/* Score + summary */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <ScoreCircle score={trip.score} size={90} />
            <View style={styles.summaryStats}>
              <BigStat value={formatDistance(trip.distance)} label="Distance" colors={colors} />
              <BigStat value={formatDuration(trip.duration)} label="Duration" colors={colors} />
              <BigStat value={`${formatSpeed(trip.avgSpeed, settings.speedUnit)} ${formatSpeedUnit(settings.speedUnit)}`} label="Avg Speed" colors={colors} />
              <BigStat value={`${formatSpeed(trip.maxSpeed, settings.speedUnit)} ${formatSpeedUnit(settings.speedUnit)}`} label="Max Speed" colors={colors} />
            </View>
          </View>
        </View>

        {/* Map */}
        {hasMap && center && (
          <View style={[styles.mapCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ROUTE</Text>
            <View style={styles.mapView}>
              <MapView
                style={StyleSheet.absoluteFill}
                userInterfaceStyle="dark"
                initialRegion={{ latitude: center.latitude, longitude: center.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Polyline coordinates={coords} strokeColor="#00E5FF" strokeWidth={3} />
              </MapView>
            </View>
          </View>
        )}

        {/* Fuel */}
        {(trip.fuelConsumed ?? 0) > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>FUEL</Text>
            <View style={styles.fuelRow}>
              <FuelStat label="Consumed" value={`${trip.fuelConsumed?.toFixed(2)} L`} icon="thermometer" colors={colors} />
              <FuelStat label="Est. Cost" value={formatCurrency(trip.fuelCost ?? 0, settings.currency)} icon="cash" colors={colors} />
            </View>
          </View>
        )}

        {/* Score breakdown */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>SCORE BREAKDOWN</Text>
          <ScoreBar label="Speed Discipline" value={trip.scoreBreakdown.speed} colors={colors} />
          <ScoreBar label="Braking" value={trip.scoreBreakdown.braking} colors={colors} />
          <ScoreBar label="Acceleration" value={trip.scoreBreakdown.acceleration} colors={colors} />
        </View>

        {/* Events */}
        {trip.events.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>DRIVING EVENTS</Text>
            {trip.events.map(event => (
              <View key={event.id} style={[styles.eventRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.eventDot, { backgroundColor: event.severity === 'high' ? colors.destructive : event.severity === 'medium' ? colors.warning : colors.mutedForeground }]} />
                <Text style={[styles.eventTime, { color: colors.mutedForeground }]}>{new Date(event.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={[styles.eventLabel, { color: colors.foreground }]}>
                  {event.type === 'hard_braking' ? 'Hard Braking' : event.type === 'rapid_acceleration' ? 'Rapid Acceleration' : 'Speed Limit Exceeded'}
                </Text>
                <Text style={[styles.eventSeverity, { color: colors.mutedForeground }]}>{event.severity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* AI Insights */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.insightHeader}>
            <Ionicons name="bulb-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>COACHING TIPS</Text>
          </View>

          {/* AI-generated coaching tips */}
          {aiTipsLoading ? (
            <View style={styles.aiLoading}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.aiLoadingText, { color: colors.mutedForeground }]}>Analysing your drive…</Text>
            </View>
          ) : aiTips.length > 0 ? (
            <View style={styles.insightSection}>
              {aiTips.map((tip, i) => (
                <View key={i} style={styles.insightItem}>
                  <View style={[styles.tipDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.insightText, { color: colors.foreground }]}>{tip}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Static score-based insights (always shown as supporting detail) */}
          {trip.insights.positives.length > 0 && (
            <View style={styles.insightSection}>
              <Text style={[styles.insightSectionTitle, { color: colors.success }]}>What you did well</Text>
              {trip.insights.positives.map((p, i) => (
                <View key={i} style={styles.insightItem}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={[styles.insightText, { color: colors.foreground }]}>{p}</Text>
                </View>
              ))}
            </View>
          )}
          {trip.insights.improvements.length > 0 && (
            <View style={styles.insightSection}>
              <Text style={[styles.insightSectionTitle, { color: colors.warning }]}>Areas to improve</Text>
              {trip.insights.improvements.map((p, i) => (
                <View key={i} style={styles.insightItem}>
                  <Ionicons name="alert-circle" size={14} color={colors.warning} />
                  <Text style={[styles.insightText, { color: colors.foreground }]}>{p}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function BigStat({ value, label, colors }: { value: string; label: string; colors: any }) {
  return (
    <View>
      <Text style={[styles.bigStatValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.bigStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function FuelStat({ label, value, icon, colors }: { label: string; value: string; icon: any; colors: any }) {
  return (
    <View style={styles.fuelStat}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.fuelValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.fuelLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function ScoreBar({ label, value, colors }: { label: string; value: number; colors: any }) {
  const color = getScoreColor(value, { primary: colors.primary, success: colors.success, warning: colors.warning, destructive: colors.destructive });
  return (
    <View style={styles.scoreBarWrap}>
      <View style={styles.scoreBarHeader}>
        <Text style={[styles.scoreBarLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.scoreBarValue, { color }]}>{value}</Text>
      </View>
      <View style={[styles.scoreBarTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.scoreBarFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  backLink: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, letterSpacing: 0.5 },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  card: { marginHorizontal: 16, marginBottom: 14, borderRadius: 20, borderWidth: 1, padding: 18 },
  mapCard: { marginHorizontal: 16, marginBottom: 14, borderRadius: 20, borderWidth: 1, padding: 18 },
  mapView: { height: 180, borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, marginBottom: 12, letterSpacing: 1 },
  summaryRow: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  summaryStats: { flex: 1, gap: 8 },
  bigStatValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15 },
  bigStatLabel: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  fuelRow: { flexDirection: 'row', gap: 20 },
  fuelStat: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF08', borderRadius: 12, padding: 14 },
  fuelValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18 },
  fuelLabel: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  scoreBarWrap: { marginBottom: 12 },
  scoreBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  scoreBarLabel: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 },
  scoreBarValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 },
  scoreBarTrack: { height: 6, borderRadius: 3 },
  scoreBarFill: { height: 6, borderRadius: 3 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
  eventTime: { fontFamily: 'Inter_400Regular', fontSize: 12, width: 50 },
  eventLabel: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, flex: 1 },
  eventSeverity: { fontFamily: 'Inter_400Regular', fontSize: 11, textTransform: 'capitalize' },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  insightSection: { marginBottom: 12 },
  insightSectionTitle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  insightItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  insightText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1, lineHeight: 18 },
  aiLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, marginBottom: 12 },
  aiLoadingText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
});
