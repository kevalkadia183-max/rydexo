import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useVehicles } from '@/context/VehicleContext';
import type { Vehicle } from '@/models/types';

const VEHICLE_ICONS: Record<string, string> = {
  car: 'car', motorcycle: 'bicycle', suv: 'car-sport', van: 'bus', truck: 'car', other: 'ellipsis-horizontal',
};

export default function VehiclesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vehicles, removeVehicle, setDefaultVehicle } = useVehicles();

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? Math.max(insets.top + 16, 83) : insets.top + 16;
  const bottomPad = isWeb ? 34 : insets.bottom + 20;

  const handleDelete = (v: Vehicle) => {
    Alert.alert('Delete Vehicle', `Remove "${v.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeVehicle(v.id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>My Vehicles</Text>
        <TouchableOpacity onPress={() => router.push('/vehicles/new')} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={vehicles}
        keyExtractor={v => v.id}
        contentContainerStyle={{ padding: 20, paddingBottom: bottomPad, gap: 12 }}
        scrollEnabled={!!vehicles.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No vehicles</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Add your vehicle to track fuel and costs</Text>
            <TouchableOpacity style={[styles.addVehicleBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/vehicles/new')}>
              <Ionicons name="add" size={18} color="#000" />
              <Text style={styles.addVehicleText}>ADD VEHICLE</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: v }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: v.isDefault ? colors.primary + '60' : colors.border }]}
            onPress={() => router.push(`/vehicles/new?edit=${v.id}`)}
            activeOpacity={0.75}
          >
            <View style={[styles.cardIcon, { backgroundColor: v.isDefault ? colors.primary + '20' : colors.muted }]}>
              <Ionicons name={VEHICLE_ICONS[v.type] as any} size={22} color={v.isDefault ? colors.primary : colors.mutedForeground} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={[styles.vehicleName, { color: colors.foreground }]}>{v.name}</Text>
                {v.isDefault && (
                  <View style={[styles.defaultBadge, { backgroundColor: colors.primary + '22' }]}>
                    <Text style={[styles.defaultText, { color: colors.primary }]}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.vehicleDetails, { color: colors.mutedForeground }]}>
                {v.type.charAt(0).toUpperCase() + v.type.slice(1)} · {v.fuelType} · {v.efficiency} {v.fuelType === 'electric' ? 'km/kWh' : 'km/L'}
              </Text>
              <Text style={[styles.vehiclePrice, { color: colors.mutedForeground }]}>
                {v.fuelPrice.toFixed(2)} {v.currency}/{v.fuelType === 'electric' ? 'kWh' : 'L'}
              </Text>
            </View>
            <View style={styles.cardActions}>
              {!v.isDefault && (
                <TouchableOpacity onPress={() => setDefaultVehicle(v.id)} style={styles.actionBtn}>
                  <Ionicons name="star-outline" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => handleDelete(v)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, flex: 1, letterSpacing: 1, textTransform: 'uppercase' },
  addBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 },
  emptySubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center' },
  addVehicleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  addVehicleText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: '#000', letterSpacing: 1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  vehicleName: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 },
  defaultBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  defaultText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 11 },
  vehicleDetails: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  vehiclePrice: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
