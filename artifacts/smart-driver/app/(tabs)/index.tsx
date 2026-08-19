import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useVehicles } from '@/context/VehicleContext';
import { useTrip } from '@/context/TripContext';
import { TripCard } from '@/components/TripCard';
import { formatDistance, formatDuration, formatSpeed, formatSpeedUnit } from '@/services/scoring';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useApp();
  const { activeVehicle, vehicles } = useVehicles();
  const { trips, currentSpeed, gpsStatus, parkingLocation } = useTrip();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTrips = trips.filter(t => t.startTime >= today.getTime());
  const todayDistance = todayTrips.reduce((s, t) => s + t.distance, 0);
  const todayTime = todayTrips.reduce((s, t) => s + t.duration, 0);
  const avgScore = todayTrips.length > 0 ? Math.round(todayTrips.reduce((s, t) => s + t.score, 0) / todayTrips.length) : null;

  const recentTrips = trips.slice(0, 3);

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? Math.max(insets.top + 16, 83) : insets.top + 16;
  const bottomPad = isWeb ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>RYDEXO</Text>
          </View>
          <View style={[styles.gpsIndicator, { backgroundColor: gpsStatus === 'good' ? colors.success + '22' : colors.muted }]}>
            <Ionicons name={gpsStatus === 'good' ? 'location' : 'location-outline'} size={12} color={gpsStatus === 'good' ? colors.success : colors.mutedForeground} />
            <Text style={[styles.gpsText, { color: gpsStatus === 'good' ? colors.success : colors.mutedForeground }]}>
              {gpsStatus === 'good' ? 'GPS' : gpsStatus === 'no_permission' ? 'NO GPS' : 'GPS...'}
            </Text>
          </View>
        </View>

        {/* Speed card */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/drive')} activeOpacity={0.9} style={styles.speedCardWrap}>
          <LinearGradient colors={['#00E5FF14', '#00000000']} style={[styles.speedCard, { backgroundColor: colors.card, borderColor: colors.primary + '40' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.speedCardContent}>
              <View>
                <Text style={[styles.speedValue, { color: colors.primary }]}>
                  {formatSpeed(currentSpeed, settings.speedUnit)}
                </Text>
                <Text style={[styles.speedUnit, { color: colors.mutedForeground }]}>{formatSpeedUnit(settings.speedUnit)}</Text>
              </View>
              <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/(tabs)/drive')}>
                <Ionicons name="power" size={18} color="#000" />
                <Text style={styles.startBtnText}>START</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Today's stats */}
        {todayTrips.length > 0 ? (
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statsTitle, { color: colors.mutedForeground }]}>TODAY</Text>
            <View style={styles.statsRow}>
              <StatItem icon="navigate-outline" value={formatDistance(todayDistance)} label="Distance" colors={colors} />
              <StatItem icon="time-outline" value={formatDuration(todayTime)} label="Drive time" colors={colors} />
              <StatItem icon="car-outline" value={`${todayTrips.length}`} label="Trip{todayTrips.length > 1 ? 's' : ''}" colors={colors} />
              {avgScore !== null && <StatItem icon="star-outline" value={`${avgScore}`} label="Avg score" colors={colors} />}
            </View>
          </View>
        ) : (
          <View style={[styles.emptyToday, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="car-outline" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTodayText, { color: colors.mutedForeground }]}>Ready for your next drive?</Text>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.actions}>
          <QuickAction icon="car" label="Vehicles" count={vehicles.length} onPress={() => router.push('/vehicles')} colors={colors} />
          <QuickAction icon="map" label="My Trips" count={trips.length} onPress={() => router.push('/(tabs)/trips')} colors={colors} />
          {parkingLocation ? (
            <QuickAction icon="location" label="Find Car" count={null} onPress={() => router.push('/(tabs)/drive')} colors={colors} accent />
          ) : (
            <QuickAction icon="analytics" label="Insights" count={null} onPress={() => router.push('/(tabs)/insights')} colors={colors} />
          )}
        </View>

        {/* Active vehicle */}
        {activeVehicle && (
          <TouchableOpacity style={[styles.vehicleBar, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/vehicles')}>
            <Ionicons name="car-sport" size={18} color={colors.primary} />
            <Text style={[styles.vehicleName, { color: colors.foreground }]}>{activeVehicle.name}</Text>
            <Text style={[styles.vehicleSub, { color: colors.mutedForeground }]}>{activeVehicle.fuelType} · {activeVehicle.efficiency} {activeVehicle.fuelType === 'electric' ? 'km/kWh' : 'km/L'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        {/* Recent trips */}
        {recentTrips.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>RECENT TRIPS</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/trips')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>SEE ALL</Text>
              </TouchableOpacity>
            </View>
            {recentTrips.map(trip => (
              <TripCard key={trip.id} trip={trip} onPress={() => router.push(`/trip/${trip.id}`)} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatItem({ icon, value, label, colors }: { icon: any; value: string; label: string; colors: any }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, count, onPress, colors, accent }: { icon: any; label: string; count: number | null; onPress: () => void; colors: any; accent?: boolean }) {
  return (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.card, borderColor: accent ? colors.primary + '50' : colors.border }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.quickIconWrap, { backgroundColor: accent ? colors.primary + '20' : colors.muted }]}>
        <Ionicons name={icon} size={20} color={accent ? colors.primary : colors.foreground} />
      </View>
      <Text style={[styles.quickLabel, { color: colors.foreground }]}>{label}</Text>
      {count !== null && <Text style={[styles.quickCount, { color: colors.mutedForeground }]}>{count}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 20 },
  greeting: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 11, marginBottom: 2, letterSpacing: 1 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, letterSpacing: 2 },
  gpsIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  gpsText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 10, letterSpacing: 1 },
  speedCardWrap: { marginHorizontal: 20, marginBottom: 14 },
  speedCard: { borderRadius: 20, borderWidth: 1.5, padding: 20 },
  speedCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  speedValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 52, letterSpacing: -2, lineHeight: 56 },
  speedUnit: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, marginTop: 2 },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14 },
  startBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: '#000' },
  statsCard: { marginHorizontal: 20, marginBottom: 14, borderRadius: 16, borderWidth: 1, padding: 16 },
  statsTitle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 11, letterSpacing: 0.8, marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  emptyToday: { marginHorizontal: 20, marginBottom: 14, borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8 },
  emptyTodayText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  actions: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  quickAction: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: 'center', gap: 6 },
  quickIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12 },
  quickCount: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  vehicleBar: { marginHorizontal: 20, marginBottom: 20, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  vehicleName: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 },
  vehicleSub: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  section: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17 },
  seeAll: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 },
});
