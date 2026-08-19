import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useVehicles } from '@/context/VehicleContext';
import type { VehicleType, FuelType, Currency, Vehicle } from '@/models/types';

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'car', label: 'Car' }, { value: 'suv', label: 'SUV' }, { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'van', label: 'Van' }, { value: 'truck', label: 'Truck' }, { value: 'other', label: 'Other' },
];

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: 'petrol', label: 'Petrol' }, { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' }, { value: 'hybrid', label: 'Hybrid' }, { value: 'other', label: 'Other' },
];

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'USD', label: 'USD $' }, { value: 'EUR', label: 'EUR €' }, { value: 'GBP', label: 'GBP £' },
  { value: 'INR', label: 'INR ₹' }, { value: 'CAD', label: 'CAD' }, { value: 'AUD', label: 'AUD' }, { value: 'JPY', label: 'JPY ¥' },
];

export default function NewVehicleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vehicles, addVehicle, updateVehicle } = useVehicles();
  const { edit } = useLocalSearchParams<{ edit?: string }>();

  const editingVehicle = edit ? vehicles.find(v => v.id === edit) : null;

  const [name, setName] = useState(editingVehicle?.name ?? 'My Car');
  const [type, setType] = useState<VehicleType>(editingVehicle?.type ?? 'car');
  const [fuel, setFuel] = useState<FuelType>(editingVehicle?.fuelType ?? 'petrol');
  const [efficiency, setEfficiency] = useState(editingVehicle?.efficiency?.toString() ?? '');
  const [fuelPrice, setFuelPrice] = useState(editingVehicle?.fuelPrice?.toString() ?? '');
  const [currency, setCurrency] = useState<Currency>(editingVehicle?.currency ?? 'USD');
  const [odometer, setOdometer] = useState(editingVehicle?.odometer?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? Math.max(insets.top + 16, 83) : insets.top + 8;

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter a vehicle name.'); return; }
    setSaving(true);
    try {
      if (editingVehicle) {
        await updateVehicle({
          ...editingVehicle,
          name: name.trim(), type, fuelType: fuel,
          efficiency: parseFloat(efficiency) || 15,
          fuelPrice: parseFloat(fuelPrice) || 1.5,
          currency,
          odometer: odometer ? parseFloat(odometer) : undefined,
        });
      } else {
        await addVehicle({
          name: name.trim(), type, fuelType: fuel,
          efficiency: parseFloat(efficiency) || 15,
          fuelPrice: parseFloat(fuelPrice) || 1.5,
          currency,
          odometer: odometer ? parseFloat(odometer) : undefined,
        });
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Label label="Vehicle Name" colors={colors} />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          value={name} onChangeText={setName}
          placeholder="e.g. My Car" placeholderTextColor={colors.mutedForeground}
          selectionColor={colors.primary}
        />

        <Label label="Type" colors={colors} />
        <View style={styles.chipRow}>
          {VEHICLE_TYPES.map(vt => <Chip key={vt.value} label={vt.label} active={type === vt.value} onPress={() => setType(vt.value)} colors={colors} />)}
        </View>

        <Label label="Fuel Type" colors={colors} />
        <View style={styles.chipRow}>
          {FUEL_TYPES.map(ft => <Chip key={ft.value} label={ft.label} active={fuel === ft.value} onPress={() => setFuel(ft.value)} colors={colors} />)}
        </View>

        <Label label={`Fuel Efficiency (${fuel === 'electric' ? 'km/kWh' : 'km/L'})`} colors={colors} optional />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          value={efficiency} onChangeText={setEfficiency}
          placeholder={fuel === 'electric' ? '5.5' : '15'} placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad" selectionColor={colors.primary}
        />

        <Label label={`Price per ${fuel === 'electric' ? 'kWh' : 'L'}`} colors={colors} optional />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          value={fuelPrice} onChangeText={setFuelPrice}
          placeholder="1.50" placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad" selectionColor={colors.primary}
        />

        <Label label="Currency" colors={colors} />
        <View style={styles.chipRow}>
          {CURRENCIES.map(c => <Chip key={c.value} label={c.label} active={currency === c.value} onPress={() => setCurrency(c.value)} colors={colors} />)}
        </View>

        <Label label="Odometer (km)" colors={colors} optional />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          value={odometer} onChangeText={setOdometer}
          placeholder="Optional" placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad" selectionColor={colors.primary}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
          <LinearGradient colors={['#00E5FF', '#00B8CC']} style={styles.saveGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.saveText}>{saving ? 'SAVING…' : editingVehicle ? 'SAVE CHANGES' : 'ADD VEHICLE'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Label({ label, colors, optional }: { label: string; colors: any; optional?: boolean }) {
  return (
    <Text style={[styles.label, { color: colors.mutedForeground }]}>
      {label}{optional && <Text style={{ fontSize: 11, color: colors.muted }}> (optional)</Text>}
    </Text>
  );
}

function Chip({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: active ? colors.primary : colors.muted }]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, { color: active ? '#000' : colors.mutedForeground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' },
  form: { padding: 20, gap: 0, paddingBottom: 60 },
  label: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12, letterSpacing: 0.4, marginTop: 16, marginBottom: 8 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14, fontFamily: 'Inter_400Regular', fontSize: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 },
  saveBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 28 },
  saveGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 17 },
  saveText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: '#000', letterSpacing: 1 },
});
