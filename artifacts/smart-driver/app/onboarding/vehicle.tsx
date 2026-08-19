import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useVehicles } from '@/context/VehicleContext';
import { useApp } from '@/context/AppContext';
import type { VehicleType, FuelType } from '@/models/types';

const VEHICLE_TYPES: { value: VehicleType; label: string; icon: string }[] = [
  { value: 'car', label: 'Car', icon: 'car-outline' },
  { value: 'suv', label: 'SUV', icon: 'car-sport-outline' },
  { value: 'motorcycle', label: 'Moto', icon: 'bicycle-outline' },
  { value: 'van', label: 'Van', icon: 'bus-outline' },
  { value: 'truck', label: 'Truck', icon: 'car-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'other', label: 'Other' },
];

export default function VehicleSetupScreen() {
  const insets = useSafeAreaInsets();
  const { addVehicle } = useVehicles();
  const { updateSettings } = useApp();

  const [name, setName] = useState('My Car');
  const [type, setType] = useState<VehicleType>('car');
  const [fuel, setFuel] = useState<FuelType>('petrol');
  const [efficiency, setEfficiency] = useState('');
  const [fuelPrice, setFuelPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (name.trim()) {
        await addVehicle({
          name: name.trim(), type, fuelType: fuel,
          efficiency: parseFloat(efficiency) || 15,
          fuelPrice: parseFloat(fuelPrice) || 1.5,
          currency: 'USD',
        });
      }
      await updateSettings({ onboardingComplete: true });
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    await updateSettings({ onboardingComplete: true });
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#A1A1AA" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>YOUR VEHICLE</Text>
        <Text style={styles.subtitle}>Add your first vehicle to track fuel and costs</Text>

        <Text style={styles.sectionLabel}>Vehicle Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. My Car"
          placeholderTextColor="#52525B"
          selectionColor="#00E5FF"
        />

        <Text style={styles.sectionLabel}>Vehicle Type</Text>
        <View style={styles.chipRow}>
          {VEHICLE_TYPES.map(vt => (
            <TouchableOpacity
              key={vt.value}
              style={[styles.chip, type === vt.value && styles.chipActive]}
              onPress={() => setType(vt.value)}
            >
              <Ionicons name={vt.icon as any} size={16} color={type === vt.value ? '#000' : '#A1A1AA'} />
              <Text style={[styles.chipText, type === vt.value && styles.chipTextActive]}>{vt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Fuel Type</Text>
        <View style={styles.chipRow}>
          {FUEL_TYPES.map(ft => (
            <TouchableOpacity
              key={ft.value}
              style={[styles.chip, fuel === ft.value && styles.chipActive]}
              onPress={() => setFuel(ft.value)}
            >
              <Text style={[styles.chipText, fuel === ft.value && styles.chipTextActive]}>{ft.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Fuel Efficiency <Text style={styles.optional}>(optional)</Text></Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={efficiency}
            onChangeText={setEfficiency}
            placeholder={fuel === 'electric' ? 'km/kWh' : 'km/L'}
            placeholderTextColor="#52525B"
            keyboardType="decimal-pad"
            selectionColor="#00E5FF"
          />
        </View>

        <Text style={styles.sectionLabel}>Fuel Price per {fuel === 'electric' ? 'kWh' : 'L'} <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.input}
          value={fuelPrice}
          onChangeText={setFuelPrice}
          placeholder="1.50"
          placeholderTextColor="#52525B"
          keyboardType="decimal-pad"
          selectionColor="#00E5FF"
        />

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleFinish} activeOpacity={0.85} disabled={saving}>
          <LinearGradient colors={['#00E5FF', '#00B8CC']} style={styles.saveGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.saveText}>{saving ? 'SAVING…' : 'START DRIVING'}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>SKIP SETUP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 24 },
  back: { marginBottom: 8 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: '#FAFAFA', marginBottom: 6, letterSpacing: 1 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#71717A', marginBottom: 28 },
  sectionLabel: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13, color: '#A1A1AA', marginBottom: 8, marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.5 },
  optional: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#52525B', textTransform: 'none' },
  input: { backgroundColor: '#0A0A0C', borderRadius: 12, borderWidth: 1, borderColor: '#1F1F23', paddingHorizontal: 14, paddingVertical: 14, fontFamily: 'Inter_400Regular', fontSize: 15, color: '#FAFAFA' },
  inputRow: { flexDirection: 'row', gap: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0A0A0C', borderRadius: 10, borderWidth: 1, borderColor: '#1F1F23', paddingHorizontal: 14, paddingVertical: 10 },
  chipActive: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  chipText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: '#A1A1AA' },
  chipTextActive: { color: '#000' },
  actions: { gap: 10, paddingTop: 12 },
  saveBtn: { borderRadius: 16, overflow: 'hidden' },
  saveGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 17 },
  saveText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: '#000', letterSpacing: 1 },
  skipBtn: { alignItems: 'center', paddingVertical: 14 },
  skipText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: '#52525B', letterSpacing: 1 },
});
