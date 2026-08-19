import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTrip } from '@/context/TripContext';
import { TripCard } from '@/components/TripCard';
import type { Trip } from '@/models/types';

export default function TripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { trips, removeTrip, refreshTrips } = useTrip();

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Delete Trip', 'This trip will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeTrip(id) },
    ]);
  }, [removeTrip]);

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? Math.max(insets.top + 16, 83) : insets.top + 16;
  const bottomPad = isWeb ? 84 : insets.bottom + 90;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>TRIPS</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{trips.length} RECORDED</Text>
      </View>

      <FlatList
        data={trips}
        keyExtractor={t => t.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomPad }}
        onRefresh={refreshTrips}
        refreshing={false}
        scrollEnabled={!!trips.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>NO TRIPS LOGGED</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Deploy your first driving session.</Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/(tabs)/drive')}>
              <Text style={styles.emptyBtnText}>START DRIVE</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={() => router.push(`/trip/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, letterSpacing: 2 },
  subtitle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13, marginTop: 2, letterSpacing: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, marginTop: 8, letterSpacing: 1 },
  emptySubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center' },
  emptyBtn: { borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
  emptyBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: '#000', letterSpacing: 1 },
});
