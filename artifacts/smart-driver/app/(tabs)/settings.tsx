import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useVehicles } from '@/context/VehicleContext';
import { useTrip } from '@/context/TripContext';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSeedData, clearAllData } from '@/services/seedData';
import { SPEEDOMETER_STYLES } from '@/components/speedometers';
import type { SpeedUnit, Currency, SpeedometerStyle, DisplaySize } from '@/models/types';
import { useAuth } from '@/context/AuthContext';

const SPEED_UNITS: { value: SpeedUnit; label: string }[] = [
  { value: 'kmh',   label: 'KM/H'  },
  { value: 'mph',   label: 'MPH'   },
  { value: 'knots', label: 'Knots' },
];
const SPEED_LIMITS       = [0, 20, 30, 40, 50, 60, 80, 100, 120];
const ALERT_THRESHOLDS   = [0, 5, 10, 15];
const GAUGE_MAX_OPTIONS  = [140, 180, 220, 260];
const APPROACHING_OPTIONS = [5, 10, 15, 20];
const SEVERE_OPTIONS      = [10, 20, 30];
const DISPLAY_SIZES: { value: DisplaySize; label: string }[] = [
  { value: 'small',  label: 'Small'  },
  { value: 'medium', label: 'Medium' },
  { value: 'large',  label: 'Large'  },
];

export default function SettingsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { settings, updateSettings } = useApp();
  const { vehicles, refreshVehicles } = useVehicles();
  const { trips, refreshTrips }       = useTrip();
  const { user, isSignedIn } = useAuth();
  const [seeding,  setSeeding]  = useState(false);
  const [clearing, setClearing] = useState(false);

  const isWeb    = Platform.OS === 'web';
  const topPad   = isWeb ? Math.max(insets.top + 16, 83) : insets.top + 16;
  const bottomPad = isWeb ? 34 : 0;

  const handleLoadSampleData = () => {
    Alert.alert(
      'Load Sample Data',
      trips.length > 0
        ? `You already have ${trips.length} trip${trips.length !== 1 ? 's' : ''}. Replace everything with fresh sample data?`
        : 'Load 12 realistic sample trips and 2 vehicles for testing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: trips.length > 0 ? 'Replace' : 'Load',
          onPress: async () => {
            setSeeding(true);
            try {
              const { trips: t, vehicles: v } = await loadSeedData(trips.length > 0);
              await Promise.all([refreshTrips(), refreshVehicles()]);
              Alert.alert('Sample data loaded', `Added ${t} trips and ${v} vehicles. Explore the app!`);
            } catch {
              Alert.alert('Error', 'Could not load sample data.');
            } finally {
              setSeeding(false);
            }
          },
        },
      ],
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      `This will permanently delete all ${trips.length} trips, ${vehicles.length} vehicles, and settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything', style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await clearAllData();
              await Promise.all([refreshTrips(), refreshVehicles()]);
              Alert.alert('Done', 'All data cleared.');
            } finally {
              setClearing(false);
            }
          },
        },
      ],
    );
  };

  const handleClearTrips = () => {
    Alert.alert('Clear All Trips', `This will permanently delete all ${trips.length} trips.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('velotrack:trips');
          await refreshTrips();
        },
      },
    ]);
  };

  const currentStyleEntry = SPEEDOMETER_STYLES.find(s => s.id === settings.speedometerStyle)
    ?? SPEEDOMETER_STYLES[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>SETTINGS</Text>

        {/* ── UNITS ── */}
        <Section title="UNITS" colors={colors}>
          <RowLabel label="Speed Unit" colors={colors} />
          <View style={styles.chipRow}>
            {SPEED_UNITS.map(u => (
              <Chip
                key={u.value}
                label={u.label}
                active={settings.speedUnit === u.value}
                onPress={() => updateSettings({ speedUnit: u.value })}
                colors={colors}
              />
            ))}
          </View>
        </Section>

        {/* ── DRIVING DISPLAY ── */}
        <Section title="DRIVING DISPLAY" colors={colors}>
          {/* Style picker */}
          <RowLabel label="Speedometer Style" colors={colors} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stylePickerRow}
          >
            {SPEEDOMETER_STYLES.map(s => {
              const isActive = settings.speedometerStyle === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.styleCard,
                    {
                      borderColor: isActive ? colors.primary : colors.border,
                      backgroundColor: isActive ? colors.primary + '12' : colors.muted,
                    },
                  ]}
                  onPress={() => updateSettings({ speedometerStyle: s.id as SpeedometerStyle })}
                  activeOpacity={0.75}
                >
                  {/* Swatch dots */}
                  <View style={styles.swatchRow}>
                    {s.swatches.map((c, i) => (
                      <View key={i} style={[styles.swatch, { backgroundColor: c }]} />
                    ))}
                  </View>
                  <Text
                    style={[
                      styles.styleCardName,
                      { color: isActive ? colors.primary : colors.foreground },
                    ]}
                    numberOfLines={1}
                  >
                    {s.label}
                  </Text>
                  {isActive && (
                    <View style={styles.styleCardCheck}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={[styles.styleDesc, { color: colors.mutedForeground }]}>
            {currentStyleEntry.description}
          </Text>

          {/* Gauge max */}
          <RowLabel label="Gauge Maximum" colors={colors} />
          <View style={styles.chipRow}>
            {GAUGE_MAX_OPTIONS.map(v => (
              <Chip
                key={v}
                label={`${v}`}
                active={settings.gaugeMax === v}
                onPress={() => updateSettings({ gaugeMax: v })}
                colors={colors}
              />
            ))}
          </View>

          {/* Display size */}
          <RowLabel label="Display Size" colors={colors} />
          <View style={styles.chipRow}>
            {DISPLAY_SIZES.map(d => (
              <Chip
                key={d.value}
                label={d.label}
                active={settings.displaySize === d.value}
                onPress={() => updateSettings({ displaySize: d.value })}
                colors={colors}
              />
            ))}
          </View>

          {/* Show/hide toggles */}
          <RowLabel label="Show on Speedometer" colors={colors} />
          <View style={styles.toggleGrid}>
            <ToggleChip
              label="Altitude"
              value={settings.showAltitude ?? true}
              onToggle={v => updateSettings({ showAltitude: v })}
              colors={colors}
            />
            <ToggleChip
              label="Heading"
              value={settings.showHeading ?? true}
              onToggle={v => updateSettings({ showHeading: v })}
              colors={colors}
            />
            <ToggleChip
              label="Avg Speed"
              value={settings.showAvgSpeed ?? true}
              onToggle={v => updateSettings({ showAvgSpeed: v })}
              colors={colors}
            />
            <ToggleChip
              label="Max Speed"
              value={settings.showMaxSpeed ?? true}
              onToggle={v => updateSettings({ showMaxSpeed: v })}
              colors={colors}
            />
          </View>
        </Section>

        {/* ── SPEED ALERTS ── */}
        <Section title="SPEED ALERTS" colors={colors}>
          <RowSwitch
            label="Speed Limit Alerts"
            value={settings.speedAlertEnabled}
            onValueChange={v => updateSettings({ speedAlertEnabled: v })}
            colors={colors}
          />
          <RowSwitch
            label="Haptic Feedback"
            value={settings.hapticAlertEnabled}
            onValueChange={v => updateSettings({ hapticAlertEnabled: v })}
            colors={colors}
          />
          <RowSwitch
            label="Voice Warnings"
            description='Speaks "Approaching limit", "Please slow down", "Slow down now"'
            value={settings.voiceAlertsEnabled ?? false}
            onValueChange={v => updateSettings({ voiceAlertsEnabled: v })}
            colors={colors}
          />

          <RowLabel label="Over-Limit Alert Threshold" colors={colors} />
          <Text style={[styles.subCaption, { color: colors.mutedForeground }]}>
            Alert fires this many km/h above the set limit
          </Text>
          <View style={styles.chipRow}>
            {ALERT_THRESHOLDS.map(t => (
              <Chip
                key={t}
                label={t === 0 ? 'At limit' : `+${t}`}
                active={settings.speedAlertThreshold === t}
                onPress={() => updateSettings({ speedAlertThreshold: t })}
                colors={colors}
              />
            ))}
          </View>

          <RowLabel label="Approaching Warning" colors={colors} />
          <Text style={[styles.subCaption, { color: colors.mutedForeground }]}>
            Amber warning this many km/h below the limit
          </Text>
          <View style={styles.chipRow}>
            {APPROACHING_OPTIONS.map(v => (
              <Chip
                key={v}
                label={`${v} km/h`}
                active={(settings.approachingThreshold ?? 10) === v}
                onPress={() => updateSettings({ approachingThreshold: v })}
                colors={colors}
              />
            ))}
          </View>

          <RowLabel label="Severe Speed Threshold" colors={colors} />
          <Text style={[styles.subCaption, { color: colors.mutedForeground }]}>
            Red "severe" warning this many km/h over the limit
          </Text>
          <View style={styles.chipRow}>
            {SEVERE_OPTIONS.map(v => (
              <Chip
                key={v}
                label={`+${v}`}
                active={(settings.severeThreshold ?? 20) === v}
                onPress={() => updateSettings({ severeThreshold: v })}
                colors={colors}
              />
            ))}
          </View>

          <RowLabel label="Default Speed Limit" colors={colors} />
          <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>
            {SPEED_LIMITS.map(l => (
              <Chip
                key={l}
                label={l === 0 ? 'None' : `${l}`}
                active={settings.defaultSpeedLimit === l}
                onPress={() => updateSettings({ defaultSpeedLimit: l })}
                colors={colors}
              />
            ))}
          </View>
        </Section>

        {/* ── HUD MODE ── */}
        <Section title="HUD MODE" colors={colors}>
          <RowSwitch
            label="Mirror Display"
            description="Reflect text for windshield projection"
            value={settings.hudMirror}
            onValueChange={v => updateSettings({ hudMirror: v })}
            colors={colors}
          />
        </Section>

        {/* ── VEHICLES ── */}
        <Section title="VEHICLES" colors={colors}>
          <RowAction label="Manage Vehicles" value={`${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''}`} onPress={() => router.push('/vehicles')} colors={colors} />
          <RowAction label="Add Vehicle" onPress={() => router.push('/vehicles/new')} colors={colors} accent />
        </Section>

        {/* ── DATA ── */}
        <Section title="DATA" colors={colors}>
          <RowAction label="Trip History" value={`${trips.length} trip${trips.length !== 1 ? 's' : ''}`} onPress={() => router.push('/(tabs)/trips')} colors={colors} />
          <RowAction
            label={seeding ? 'Loading…' : 'Load Sample Data'}
            onPress={handleLoadSampleData}
            colors={colors}
            accent
            disabled={seeding}
            icon={seeding ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
          />
          <RowAction label="Clear All Trips" onPress={handleClearTrips} colors={colors} danger />
          <RowAction
            label={clearing ? 'Clearing…' : 'Clear All Data'}
            onPress={handleClearAll}
            colors={colors}
            danger
            disabled={clearing}
          />
        </Section>

        {/* ── ACCOUNT ── */}
        <Section title="ACCOUNT" colors={colors}>
          {isSignedIn ? (
            <>
              <RowAction
                label={user!.email}
                value="Signed in"
                onPress={() => router.push('/(tabs)/account')}
                colors={colors}
              />
              <RowAction
                label="Sync & Account Settings"
                onPress={() => router.push('/(tabs)/account')}
                colors={colors}
                accent
              />
            </>
          ) : (
            <RowAction
              label="Sign In to Back Up Trips"
              onPress={() => router.push('/(tabs)/account')}
              colors={colors}
              accent
            />
          )}
        </Section>

        {/* ── ABOUT ── */}
        <Section title="ABOUT" colors={colors}>
          <RowAction label="Rydexo" value="1.0.0" onPress={() => {}} colors={colors} />
          <View style={[styles.aboutNote, { backgroundColor: colors.muted }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>
              GPS speed and driving events are estimates. Not for professional or legal use. Always obey traffic laws.
            </Text>
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

// ─── Shared section components ────────────────────────────────────────────────

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function RowLabel({ label, colors }: { label: string; colors: any }) {
  return <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>;
}

function RowSwitch({
  label, description, value, onValueChange, colors,
}: {
  label: string; description?: string; value: boolean;
  onValueChange: (v: boolean) => void; colors: any;
}) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowText, { color: colors.foreground }]}>{label}</Text>
        {description && <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

function RowAction({ label, value, onPress, colors, accent, danger, disabled, icon }: {
  label: string; value?: string; onPress: () => void; colors: any;
  accent?: boolean; danger?: boolean; disabled?: boolean; icon?: React.ReactNode;
}) {
  const labelColor = disabled
    ? colors.mutedForeground
    : danger ? colors.destructive : accent ? colors.primary : colors.foreground;
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border, opacity: disabled ? 0.5 : 1 }]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Text style={[styles.rowText, { color: labelColor }]}>{label}</Text>
      <View style={styles.rowRight}>
        {icon ? icon : (
          <>
            {value && <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>}
            {!danger && <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

function Chip({
  label, active, onPress, colors,
}: {
  label: string; active: boolean; onPress: () => void; colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: active ? colors.primary : colors.muted }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, { color: active ? '#000' : colors.mutedForeground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleChip({
  label, value, onToggle, colors,
}: {
  label: string; value: boolean; onToggle: (v: boolean) => void; colors: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.toggleChip,
        {
          borderColor: value ? colors.primary + '66' : colors.border,
          backgroundColor: value ? colors.primary + '14' : colors.muted,
        },
      ]}
      onPress={() => onToggle(!value)}
      activeOpacity={0.75}
    >
      <Ionicons
        name={value ? 'checkmark-circle' : 'ellipse-outline'}
        size={14}
        color={value ? colors.primary : colors.mutedForeground}
      />
      <Text style={[styles.toggleChipText, { color: value ? colors.primary : colors.mutedForeground }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28,
    letterSpacing: 2, paddingHorizontal: 20, marginBottom: 24,
  },

  section: { marginBottom: 24, paddingHorizontal: 20 },
  sectionTitle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 11, letterSpacing: 0.8, marginBottom: 8 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 14, gap: 12 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  rowText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 15 },
  rowDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2, flex: 1 },
  rowLabel: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12, marginBottom: 6 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontFamily: 'Inter_400Regular', fontSize: 14 },

  subCaption: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: -8, marginBottom: 2 },

  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13 },

  // Style picker
  stylePickerRow: { gap: 10, paddingVertical: 4, paddingRight: 4 },
  styleCard: {
    borderWidth: 1.5, borderRadius: 14,
    padding: 12, width: 110, gap: 6,
  },
  swatchRow: { flexDirection: 'row', gap: 4 },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  styleCardName: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 11 },
  styleCardCheck: { position: 'absolute', top: 8, right: 8 },
  styleDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: -4 },

  // Toggle chip grid
  toggleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  toggleChipText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12 },

  aboutNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: 10, padding: 10, marginTop: 4,
  },
  aboutText: { fontFamily: 'Inter_400Regular', fontSize: 11, flex: 1, lineHeight: 16 },
});
