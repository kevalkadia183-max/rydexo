import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { useTrip } from '@/context/TripContext';
import { ScoreCircle } from '@/components/ScoreCircle';
import { formatDistance, formatDuration, getScoreLabel } from '@/services/scoring';
import { fetchWeeklySummary } from '@/services/aiCoaching';

type Period = 'week' | 'month';

const { width: SCREEN_W } = Dimensions.get('window');

export default function InsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { trips } = useTrip();
  const [period, setPeriod] = useState<Period>('week');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const summaryFetchId = useRef(0);

  const now = Date.now();
  const cutoff = period === 'week' ? now - 7 * 86400000 : now - 30 * 86400000;
  const filtered = trips.filter(t => t.startTime >= cutoff);

  const totalDist = filtered.reduce((s, t) => s + t.distance, 0);
  const totalTime = filtered.reduce((s, t) => s + t.duration, 0);
  const avgScore = filtered.length > 0 ? Math.round(filtered.reduce((s, t) => s + t.score, 0) / filtered.length) : 0;
  const maxSpeed = filtered.reduce((m, t) => Math.max(m, t.maxSpeed), 0);
  const speedingEvents = filtered.reduce((s, t) => s + t.events.filter(e => e.type === 'speeding').length, 0);
  const brakingEvents = filtered.reduce((s, t) => s + t.events.filter(e => e.type === 'hard_braking').length, 0);
  const totalFuel = filtered.reduce((s, t) => s + (t.fuelConsumed ?? 0), 0);
  const totalCost = filtered.reduce((s, t) => s + (t.fuelCost ?? 0), 0);

  // Fetch AI summary when period or trip data changes
  useEffect(() => {
    if (filtered.length === 0) { setAiSummary(null); return; }
    const fetchId = ++summaryFetchId.current;
    setAiSummaryLoading(true);
    setAiSummary(null);
    fetchWeeklySummary({
      avgScore,
      tripCount: filtered.length,
      speedingEvents,
      brakingEvents,
      totalDistance: totalDist,
      period,
    }).then(result => {
      if (fetchId === summaryFetchId.current) {
        setAiSummary(result.summary);
        setAiSummaryLoading(false);
      }
    }).catch(() => {
      if (fetchId === summaryFetchId.current) setAiSummaryLoading(false);
    });
  }, [period, filtered.length, avgScore]);

  // Daily chart data
  const chartData = useMemo(() => {
    const days = period === 'week' ? 7 : 30;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(now - i * 86400000);
      day.setHours(0, 0, 0, 0);
      const next = new Date(day.getTime() + 86400000);
      const dayTrips = trips.filter(t => t.startTime >= day.getTime() && t.startTime < next.getTime());
      const dist = dayTrips.reduce((s, t) => s + t.distance, 0);
      result.push({
        label: days === 7 ? day.toLocaleDateString('en-US', { weekday: 'short' }) : `${day.getDate()}`,
        value: dist,
      });
    }
    return result;
  }, [trips, period, now]);

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? Math.max(insets.top + 16, 83) : insets.top + 16;
  const bottomPad = isWeb ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header + period toggle */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>TELEMETRY</Text>
          <View style={[styles.periodToggle, { backgroundColor: colors.muted }]}>
            {(['week', 'month'] as Period[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, period === p && { backgroundColor: colors.primary }]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodText, { color: period === p ? '#000' : colors.mutedForeground }]}>
                  {p === 'week' ? '7 DAYS' : '30 DAYS'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>NO TELEMETRY DATA</Text>
          </View>
        ) : (
          <>
            {/* AI weekly coaching summary */}
            <View style={[styles.aiSummaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.aiSummaryHeader}>
                <View style={[styles.aiIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="bulb" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.aiSummaryTitle, { color: colors.foreground }]}>
                  {period === 'week' ? '7-DAY INTELLIGENCE' : '30-DAY INTELLIGENCE'}
                </Text>
              </View>
              {aiSummaryLoading ? (
                <View style={styles.aiSummaryLoading}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={[styles.aiSummaryLoadingText, { color: colors.mutedForeground }]}>Generating coaching…</Text>
                </View>
              ) : aiSummary ? (
                <Text style={[styles.aiSummaryText, { color: colors.mutedForeground }]}>{aiSummary}</Text>
              ) : null}
            </View>

            {/* Score + key stats */}
            <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ScoreCircle score={avgScore} size={100} />
              <View style={styles.scoreRight}>
                <Text style={[styles.scoreLabel, { color: colors.foreground }]}>AVG SCORE · {getScoreLabel(avgScore).toUpperCase()}</Text>
                <Text style={[styles.tripsCount, { color: colors.mutedForeground }]}>{filtered.length} TRIP{filtered.length > 1 ? 'S' : ''} · {period === 'week' ? 'THIS WEEK' : 'THIS MONTH'}</Text>
                <View style={styles.miniStats}>
                  <MiniStat icon="navigate-outline" value={formatDistance(totalDist)} colors={colors} />
                  <MiniStat icon="time-outline" value={formatDuration(totalTime)} colors={colors} />
                </View>
              </View>
            </View>

            {/* Distance chart */}
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.chartTitle, { color: colors.foreground }]}>DAILY DISTANCE</Text>
              <BarChart data={chartData} color={colors.primary} muted={colors.muted} textColor={colors.mutedForeground} />
            </View>

            {/* Stats grid */}
            <View style={[styles.grid, { paddingHorizontal: 20 }]}>
              <GridStat icon="flash-outline" label="MAX SPEED" value={`${Math.round(maxSpeed)} km/h`} colors={colors} />
              <GridStat icon="warning-outline" label="SPEEDING ALERTS" value={`${speedingEvents}`} colors={colors} accent={speedingEvents > 0 ? colors.warning : undefined} />
              <GridStat icon="car-outline" label="HARD BRAKING" value={`${brakingEvents}`} colors={colors} accent={brakingEvents > 0 ? colors.destructive : undefined} />
              {totalFuel > 0 && <GridStat icon="thermometer-outline" label="FUEL BURNED" value={`${totalFuel.toFixed(1)} L`} colors={colors} />}
              {totalCost > 0 && <GridStat icon="cash-outline" label="FUEL COST" value={`$${totalCost.toFixed(2)}`} colors={colors} />}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MiniStat({ icon, value, colors }: { icon: any; value: string; colors: any }) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={13} color={colors.mutedForeground} />
      <Text style={[styles.miniStatText, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function GridStat({ icon, label, value, colors, accent }: { icon: any; label: string; value: string; colors: any; accent?: string }) {
  return (
    <View style={[styles.gridStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon} size={20} color={accent ?? colors.primary} />
      <Text style={[styles.gridValue, { color: accent ?? colors.foreground }]}>{value}</Text>
      <Text style={[styles.gridLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function BarChart({ data, color, muted, textColor }: { data: { label: string; value: number }[]; color: string; muted: string; textColor: string }) {
  const chartW = SCREEN_W - 56;
  const chartH = 100;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const n = data.length;
  const barW = Math.max(4, (chartW - (n - 1) * 4) / n);

  return (
    <Svg width={chartW} height={chartH + 20}>
      {data.map((d, i) => {
        const bh = Math.max(4, (d.value / maxVal) * chartH);
        const x = i * (barW + 4);
        const y = chartH - bh;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={bh} rx={4} fill={d.value > 0 ? color : muted} />
            {n <= 10 && (
              <SvgText x={x + barW / 2} y={chartH + 15} textAnchor="middle" fill={textColor} fontSize={9} fontFamily="Inter_400Regular">
                {d.label}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, letterSpacing: -0.5 },
  periodToggle: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  periodBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  periodText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  // AI summary card
  aiSummaryCard: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 14 },
  aiSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  aiIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  aiSummaryTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 },
  aiSummaryLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  aiSummaryLoadingText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  aiSummaryText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
  scoreCard: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 14 },
  scoreRight: { flex: 1 },
  scoreLabel: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, marginBottom: 2 },
  tripsCount: { fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 10 },
  miniStats: { flexDirection: 'row', gap: 14 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  miniStatText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13 },
  chartCard: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 14 },
  chartTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  gridStat: { width: '47%', borderRadius: 16, borderWidth: 1, padding: 16, gap: 6 },
  gridValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20 },
  gridLabel: { fontFamily: 'Inter_400Regular', fontSize: 12 },
});
