import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useVehicles } from '@/context/VehicleContext';
import { useTrip } from '@/context/TripContext';
import { formatSpeed, formatSpeedUnit, formatDuration, formatDistance } from '@/services/scoring';
import { fetchTripCoaching } from '@/services/aiCoaching';
import type { Trip } from '@/models/types';
import { DigitalSpeed } from '@/components/DigitalSpeed';
import {
  SPEEDOMETER_STYLES,
  getStyleEntry,
  nextStyle,
} from '@/components/speedometers';
import type { SpeedometerProps } from '@/components/speedometers';
import {
  computeWarningState,
  createWarningMachine,
  updateWarningMachine,
  resetWarningMachine,
  WARNING_COLOR,
} from '@/services/speedWarning';
import {
  createAlertTracker,
  resetAlertTracker,
  triggerAlert,
} from '@/services/alertService';
import type { DriveMode, WarningState } from '@/models/types';

// Lazy-import keep-awake to avoid crash if not installed
let useKeepAwake: (() => void) | null = null;
try { useKeepAwake = require('expo-keep-awake').useKeepAwake; } catch {}

/** Convert compass degrees → cardinal abbreviation */
function toCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function formatAltitude(metres: number, speedUnit: string): string {
  if (speedUnit === 'mph') return `${Math.round(metres * 3.281)} ft`;
  return `${Math.round(metres)} m`;
}

function formatCost(amount: number, currency: string): string {
  if (amount < 0.01) return `0.00`;
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
  return `${sym}${amount.toFixed(2)}`;
}

const LIMIT_PRESETS = [
  { label: 'NONE', value: 0 },
  { label: '20',   value: 20 },
  { label: '30',   value: 30 },
  { label: '40',   value: 40 },
  { label: '50',   value: 50 },
  { label: '60',   value: 60 },
  { label: '80',   value: 80 },
  { label: '100',  value: 100 },
  { label: '120',  value: 120 },
];

export default function DriveScreen() {
  if (useKeepAwake) useKeepAwake();

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useApp();
  const { activeVehicle } = useVehicles();
  const {
    currentSpeed, gpsStatus, altitude, heading,
    activeTrip, isOverSpeedLimit, speedLimit, setSpeedLimit,
    startTrip, pauseTrip, resumeTrip, endTrip,
    currentLocation, parkingLocation, saveParkingSpot, clearParking,
  } = useTrip();

  const [mode, setMode] = useState<DriveMode>('combined');
  const [isEnding, setIsEnding] = useState(false);
  const [warningState, setWarningState] = useState<WarningState>('normal');
  const [coachingTrip, setCoachingTrip] = useState<Trip | null>(null);
  const [coachingTips, setCoachingTips] = useState<string[]>([]);
  const [coachingLoading, setCoachingLoading] = useState(false);

  // Warning state machine + alert tracker — stable refs across renders
  const warningMachineRef = useRef(createWarningMachine());
  const alertTrackerRef   = useRef(createAlertTracker());
  const prevWarningRef    = useRef<WarningState>('normal');

  // Animated pulse for warning
  const alertScale = useSharedValue(1);
  const alertStyle = useAnimatedStyle(() => ({ transform: [{ scale: alertScale.value }] }));

  // ── Warning state machine ────────────────────────────────────────────────────
  useEffect(() => {
    const noGps = gpsStatus === 'no_permission' || gpsStatus === 'unavailable' || gpsStatus === 'none';
    const gpsPoor = gpsStatus === 'weak';

    let candidate: WarningState = 'normal';
    if (!noGps && !gpsPoor && settings.speedAlertEnabled && speedLimit > 0) {
      candidate = computeWarningState(
        currentSpeed,
        speedLimit,
        settings.approachingThreshold ?? 10,
        settings.speedAlertThreshold ?? 5,
        settings.severeThreshold ?? 20,
      );
    }

    const resolved = updateWarningMachine(warningMachineRef.current, candidate);
    setWarningState(resolved);

    // Capture previous state before updating the ref
    const prevWarning = prevWarningRef.current;

    // Reset alert cooldowns when speed returns to normal
    if (resolved === 'normal' && prevWarning !== 'normal') {
      resetAlertTracker(alertTrackerRef.current);
    }
    prevWarningRef.current = resolved;

    if (resolved !== 'normal' && settings.speedAlertEnabled) {
      triggerAlert(resolved, alertTrackerRef.current, {
        hapticEnabled: settings.hapticAlertEnabled,
        voiceEnabled: settings.voiceAlertsEnabled ?? false,
      });

      // Visual pulse on state escalation
      if (resolved !== prevWarning) {
        alertScale.value = withRepeat(
          withSequence(withTiming(1.04, { duration: 180 }), withTiming(1, { duration: 180 })),
          3, false,
        );
      }
    }
  }, [currentSpeed, speedLimit, gpsStatus, settings.speedAlertEnabled,
      settings.approachingThreshold, settings.speedAlertThreshold,
      settings.severeThreshold, settings.hapticAlertEnabled, settings.voiceAlertsEnabled]);

  // Reset warning machine when trip ends
  useEffect(() => {
    if (!activeTrip) {
      resetWarningMachine(warningMachineRef.current);
      resetAlertTracker(alertTrackerRef.current);
      setWarningState('normal');
    }
  }, [!!activeTrip]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!activeVehicle) {
      Alert.alert('No Vehicle', 'Add a vehicle first to start tracking.', [
        { text: 'Add Vehicle', onPress: () => router.push('/vehicles/new') },
        { text: 'Cancel' },
      ]);
      return;
    }
    await startTrip();
    setMode('combined');
  };

  const handleEnd = async () => {
    Alert.alert('End Trip?', 'Save and complete the current trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Trip', style: 'destructive',
        onPress: async () => {
          setIsEnding(true);
          const trip = await endTrip();
          setIsEnding(false);
          if (trip) {
            // Show coaching modal first, then let user navigate to full detail
            setCoachingTrip(trip);
            setCoachingTips([]);
            setCoachingLoading(true);
            fetchTripCoaching({
              score: trip.score,
              events: trip.events,
              distance: trip.distance,
              maxSpeed: trip.maxSpeed,
              duration: trip.duration,
            }).then(result => {
              setCoachingTips(result.tips);
              setCoachingLoading(false);
            }).catch(() => {
              setCoachingLoading(false);
            });
          }
        },
      },
    ]);
  };

  const handleDismissCoaching = () => {
    const trip = coachingTrip;
    setCoachingTrip(null);
    if (trip) router.push(`/trip/${trip.id}`);
  };

  const handleCycleStyle = useCallback(() => {
    updateSettings({ speedometerStyle: nextStyle(settings.speedometerStyle) });
  }, [settings.speedometerStyle, updateSettings]);

  // ── Display values ────────────────────────────────────────────────────────────
  const displaySpeed = formatSpeed(currentSpeed, settings.speedUnit);
  const unitLabel    = formatSpeedUnit(settings.speedUnit);
  const displayLimit = speedLimit > 0 ? formatSpeed(speedLimit, settings.speedUnit) : 0;
  const altLabel     = formatAltitude(altitude, settings.speedUnit);
  const compass      = `${toCardinal(heading)} ${Math.round(heading)}°`;

  const liveCost = activeTrip && activeVehicle
    ? formatCost((activeTrip.distance / activeVehicle.efficiency) * activeVehicle.fuelPrice, settings.currency)
    : null;

  const isWeb     = Platform.OS === 'web';
  const bottomPad = isWeb ? 84 : insets.bottom + 90;

  const gpsLabel = gpsStatus === 'good' ? 'GPS STRONG' : gpsStatus === 'weak' ? 'GPS WEAK' : gpsStatus === 'no_permission' ? 'NO PERMISSION' : 'NO GPS';
  const gpsColor = gpsStatus === 'good' ? '#00FF66' : gpsStatus === 'weak' ? '#FFE600' : '#FF003C';

  const accentColor = WARNING_COLOR[warningState];

  // ── Active speedometer component ─────────────────────────────────────────────
  const styleEntry = getStyleEntry(settings.speedometerStyle);
  const SpeedometerComponent = styleEntry.component;

  const speedometerProps: SpeedometerProps = {
    speed:        displaySpeed,
    unit:         unitLabel,
    speedKmh:     currentSpeed,
    limitKmh:     speedLimit,
    limitDisplay: displayLimit,
    avgSpeed:     activeTrip ? formatSpeed(activeTrip.avgSpeed, settings.speedUnit) : 0,
    maxSpeed:     activeTrip ? formatSpeed(activeTrip.maxSpeed, settings.speedUnit) : 0,
    distance:     activeTrip?.distance ?? 0,
    duration:     activeTrip?.duration ?? 0,
    warningState,
    gaugeMax:     settings.gaugeMax ?? 180,
    altitude,
    heading,
    gpsStatus,
    tripActive:   !!activeTrip,
    showAltitude: settings.showAltitude ?? true,
    showHeading:  settings.showHeading  ?? true,
    showAvgSpeed: settings.showAvgSpeed ?? true,
    showMaxSpeed: settings.showMaxSpeed ?? true,
    size:         settings.displaySize  ?? 'medium',
  };

  // ── HUD mode ─────────────────────────────────────────────────────────────────
  if (mode === 'hud') {
    return (
      <HUDView
        speed={displaySpeed}
        unit={unitLabel}
        limit={displayLimit > 0 ? displayLimit : null}
        isOver={warningState === 'over-limit' || warningState === 'severe'}
        mirror={settings.hudMirror}
        onExit={() => setMode('combined')}
        insets={insets}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      {/* ── Post-trip coaching modal ── */}
      <Modal
        visible={!!coachingTrip}
        transparent
        animationType="slide"
        onRequestClose={handleDismissCoaching}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.coachingCard}>
            {/* Header */}
            <View style={styles.coachingHeader}>
              <View style={styles.coachingIconWrap}>
                <Ionicons name="bulb" size={20} color="#00E5FF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.coachingTitle}>Trip Summary</Text>
                {coachingTrip && (
                  <Text style={styles.coachingScore}>Score: {coachingTrip.score}/100 · {formatDistance(coachingTrip.distance)} · {formatDuration(coachingTrip.duration)}</Text>
                )}
              </View>
            </View>

            {/* Coaching tips */}
            {coachingLoading ? (
              <View style={styles.coachingLoading}>
                <ActivityIndicator color="#00E5FF" size="small" />
                <Text style={styles.coachingLoadingText}>Analysing your drive…</Text>
              </View>
            ) : (
              <View style={styles.coachingTips}>
                {coachingTips.map((tip, i) => (
                  <View key={i} style={styles.coachingTip}>
                    <View style={styles.coachingTipDot} />
                    <Text style={styles.coachingTipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={styles.coachingActions}>
              <TouchableOpacity
                style={styles.coachingDetailBtn}
                onPress={handleDismissCoaching}
                activeOpacity={0.8}
              >
                <Text style={styles.coachingDetailText}>View Full Report</Text>
                <Ionicons name="chevron-forward" size={16} color="#00E5FF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.coachingDismissBtn}
                onPress={() => setCoachingTrip(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.coachingDismissText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Mode bar ── */}
      <View style={[styles.modeBar, { paddingTop: insets.top + 12 }]}>
        <ModeBtn label="Speed"    icon="speedometer" active={mode === 'speed'}    onPress={() => setMode('speed')}    />
        <ModeBtn label="Map"      icon="map"          active={mode === 'map'}      onPress={() => setMode('map')}      />
        <ModeBtn label="Combined" icon="layers"       active={mode === 'combined'} onPress={() => setMode('combined')} />
        <ModeBtn label="HUD"      icon="eye"          active={false}               onPress={() => setMode('hud')}      />

        {/* Quick style cycle button */}
        <TouchableOpacity
          style={styles.cycleBtn}
          onPress={handleCycleStyle}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh" size={13} color="#52525B" />
          <Text style={styles.cycleBtnText}>STYLE</Text>
        </TouchableOpacity>
      </View>

      {/* ── Status bar ── */}
      <View style={styles.statusBar}>
        <View style={[styles.gpsBadge, { backgroundColor: `${gpsColor}18` }]}>
          <View style={[styles.gpsDot, { backgroundColor: gpsColor }]} />
          <Text style={[styles.gpsText, { color: gpsColor }]}>{gpsLabel}</Text>
        </View>
        {activeTrip && (
          <View style={styles.recBadge}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>RECORDING</Text>
          </View>
        )}
        {displayLimit > 0 && (
          <View style={[styles.limitIndicator, { borderColor: accentColor + '55' }]}>
            <Text style={[styles.limitIndicatorText, { color: accentColor }]}>
              {displayLimit} {unitLabel}
            </Text>
          </View>
        )}
      </View>

      {/* ── Main content ── */}
      <View style={styles.mainContent}>

        {/* Speed block — visible in speed + combined modes */}
        {(mode === 'speed' || mode === 'combined') && (
          <Animated.View style={[styles.speedBlock, alertStyle]}>
            {/* Active speedometer */}
            <SpeedometerComponent {...speedometerProps} />

            {/* Alt + compass row — always shown when enabled, common to all styles */}
            {(settings.showAltitude || settings.showHeading) && (
              <View style={styles.infoRow}>
                {settings.showAltitude && (
                  <View style={styles.infoChip}>
                    <Ionicons name="trending-up" size={11} color="#52525B" />
                    <Text style={styles.infoLabel}>{altLabel}</Text>
                  </View>
                )}
                {settings.showAltitude && settings.showHeading && (
                  <View style={styles.infoDivider} />
                )}
                {settings.showHeading && (
                  <View style={styles.infoChip}>
                    <Ionicons name="compass" size={11} color="#52525B" />
                    <Text style={styles.infoLabel}>{compass}</Text>
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        )}

        {/* Map — full-screen or half in combined */}
        {mode === 'map' && (
          <View style={styles.mapFull}>
            <MapOrPlaceholder
              location={currentLocation}
              points={activeTrip?.points ?? []}
              heading={heading}
              speed={displaySpeed}
              unit={unitLabel}
              isOver={warningState === 'over-limit' || warningState === 'severe'}
              accentColor={accentColor}
            />
          </View>
        )}
        {mode === 'combined' && (
          <View style={styles.mapHalf}>
            <MapOrPlaceholder
              location={currentLocation}
              points={activeTrip?.points ?? []}
              heading={heading}
              speed={null}
              unit={null}
              isOver={false}
              accentColor={accentColor}
            />
          </View>
        )}
      </View>

      {/* ── Speed limit preset strip ── */}
      {(mode === 'speed' || mode === 'combined') && (
        <View style={styles.presetSection}>
          <Text style={styles.presetTitle}>SPEED LIMIT</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetScroll}
          >
            {LIMIT_PRESETS.map(p => {
              const isActive = speedLimit === p.value;
              const displayVal = p.value === 0 ? 'NONE' : `${formatSpeed(p.value, settings.speedUnit)}`;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.presetChip,
                    isActive
                      ? { backgroundColor: accentColor, borderColor: accentColor }
                      : { backgroundColor: '#0A0A0C', borderColor: '#1F1F23' },
                  ]}
                  onPress={() => setSpeedLimit(p.value)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.presetChipText, { color: isActive ? '#000' : '#A1A1AA' }]}>
                    {displayVal}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Trip stats strip ── */}
      {activeTrip && (
        <View style={[styles.statsStrip, { backgroundColor: '#0A0A0C', borderTopColor: '#1F1F23' }]}>
          <StatCell label="DIST"  value={formatDistance(activeTrip.distance)} />
          <StatDivider />
          <StatCell label="TIME"  value={formatDuration(activeTrip.duration)} />
          <StatDivider />
          <StatCell label="AVG"   value={`${formatSpeed(activeTrip.avgSpeed, settings.speedUnit)}`} />
          <StatDivider />
          <StatCell label="MAX"   value={`${formatSpeed(activeTrip.maxSpeed, settings.speedUnit)}`} />
          {liveCost && (
            <>
              <StatDivider />
              <StatCell label="COST" value={liveCost} accent />
            </>
          )}
        </View>
      )}

      {/* ── Controls ── */}
      <View style={[styles.controls, { paddingBottom: bottomPad }]}>
        {!activeTrip ? (
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.sideBtn}
              onPress={parkingLocation ? clearParking : saveParkingSpot}
            >
              <Ionicons
                name={parkingLocation ? 'location' : 'location-outline'}
                size={22}
                color={parkingLocation ? '#00E5FF' : '#52525B'}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
              <LinearGradient
                colors={['#00E5FF', '#00B8CC']}
                style={styles.startGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="navigate" size={20} color="#000" />
                <Text style={styles.startText}>START DRIVE</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.sideBtn} />
          </View>
        ) : (
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.tripBtn, { backgroundColor: '#0A0A0C', borderColor: '#2A2A2E' }]}
              onPress={activeTrip.status === 'paused' ? resumeTrip : pauseTrip}
            >
              <Ionicons name={activeTrip.status === 'paused' ? 'play' : 'pause'} size={22} color="#FAFAFA" />
            </TouchableOpacity>

            <View style={[
              styles.statusPill,
              { backgroundColor: activeTrip.status === 'paused' ? '#FFE60018' : '#00FF6618' },
            ]}>
              <View style={[styles.statusDot, { backgroundColor: activeTrip.status === 'paused' ? '#FFE600' : '#00FF66' }]} />
              <Text style={[styles.statusText, { color: activeTrip.status === 'paused' ? '#FFE600' : '#00FF66' }]}>
                {activeTrip.status === 'paused' ? 'PAUSED' : 'ACTIVE'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.tripBtn, { backgroundColor: '#FF003C14', borderColor: '#FF003C33' }]}
              onPress={handleEnd}
              disabled={isEnding}
            >
              <Ionicons name="stop" size={22} color="#FF003C" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModeBtn({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.modeBtnInner, active && { backgroundColor: '#00E5FF18' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={15} color={active ? '#00E5FF' : '#52525B'} />
      <Text style={[styles.modeBtnText, { color: active ? '#00E5FF' : '#52525B' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, accent && { color: '#00E5FF' }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatDivider() {
  return <View style={styles.statDivider} />;
}

function MapOrPlaceholder({
  location, points, heading, speed, unit, isOver, accentColor,
}: {
  location: any; points: any[]; heading: number;
  speed: number | null; unit: string | null; isOver: boolean;
  accentColor: string;
}) {
  const [MapView, setMapView] = useState<any>(null);
  const [Polyline, setPolyline] = useState<any>(null);

  useEffect(() => {
    try {
      const maps = require('react-native-maps');
      setMapView(() => maps.default);
      setPolyline(() => maps.Polyline);
    } catch {}
  }, []);

  if (!MapView || !location) {
    return (
      <View style={[styles.mapPlaceholder, { backgroundColor: '#0A0A0C' }]}>
        <Ionicons name="map-outline" size={36} color="#1F1F23" />
        <Text style={styles.mapPlaceholderText}>
          {!location ? 'Waiting for GPS…' : 'Map loading…'}
        </Text>
      </View>
    );
  }

  const coords = points.map(p => ({ latitude: p.lat, longitude: p.lng }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        style={StyleSheet.absoluteFill}
        showsUserLocation
        followsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        userInterfaceStyle="dark"
        initialRegion={
          location
            ? { latitude: location.lat, longitude: location.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
            : undefined
        }
      >
        {coords.length > 1 && Polyline && (
          <Polyline coordinates={coords} strokeColor={accentColor} strokeWidth={3} />
        )}
      </MapView>

      {speed !== null && (
        <View style={[styles.mapSpeedOverlay, { borderColor: isOver ? '#FF003C' : '#1F1F23' }]}>
          <Text style={[styles.mapSpeedNum, { color: isOver ? '#FF003C' : '#FAFAFA' }]}>{speed}</Text>
          <Text style={[styles.mapSpeedUnit, { color: isOver ? '#FF003C99' : '#52525B' }]}>{unit}</Text>
        </View>
      )}
    </View>
  );
}

function HUDView({ speed, unit, limit, isOver, mirror, onExit, insets }: any) {
  return (
    <View style={[styles.hudContainer, { backgroundColor: '#000' }]}>
      <TouchableOpacity style={[styles.hudExit, { top: insets.top + 12 }]} onPress={onExit}>
        <Ionicons name="close-circle" size={28} color="#222" />
      </TouchableOpacity>
      <View style={mirror ? { transform: [{ scaleX: -1 as number }] } : {}}>
        <DigitalSpeed value={speed} isOver={isOver} digitHeight={130} />
        <Text style={[styles.hudUnit, { color: isOver ? '#FF003C88' : '#33333388' }]}>{unit}</Text>
        {limit && (
          <Text style={[styles.hudLimit, { color: isOver ? '#FF003C' : '#444' }]}>
            LIMIT  {limit}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Mode bar
  modeBar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 4, paddingHorizontal: 12, paddingBottom: 10, flexWrap: 'wrap',
  },
  modeBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7,
  },
  modeBtnText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12 },
  cycleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: '#0A0A0C',
  },
  cycleBtnText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 10, color: '#52525B', letterSpacing: 0.4 },

  // Status bar
  statusBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, marginBottom: 6,
  },
  gpsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  gpsDot: { width: 6, height: 6, borderRadius: 3 },
  gpsText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 11, letterSpacing: 0.4 },
  recBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#00E5FF12', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00E5FF' },
  recText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 11, color: '#00E5FF', letterSpacing: 0.4 },
  limitIndicator: {
    marginLeft: 'auto' as any, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  limitIndicatorText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, letterSpacing: 0.3 },

  // Main content
  mainContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },

  // Speed block
  speedBlock: { alignItems: 'center', width: '100%', gap: 10 },

  // Alt/compass info row
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 0, marginTop: 2 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6 },
  infoLabel: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12, color: '#52525B', letterSpacing: 0.3 },
  infoDivider: { width: 1, height: 14, backgroundColor: '#1F1F23' },

  // Map
  mapFull: { ...StyleSheet.absoluteFillObject, top: 100 },
  mapHalf: { width: '100%', flex: 1, borderRadius: 18, overflow: 'hidden', marginTop: 12 },
  mapPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 18,
  },
  mapPlaceholderText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#3F3F46' },
  mapSpeedOverlay: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(9,9,11,0.82)',
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 8,
    alignItems: 'center',
  },
  mapSpeedNum: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26 },
  mapSpeedUnit: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, letterSpacing: 1 },

  // Preset strip
  presetSection: { paddingHorizontal: 20, marginBottom: 8 },
  presetTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 10,
    color: '#3F3F46', letterSpacing: 1, marginBottom: 7,
  },
  presetScroll: { gap: 7, paddingRight: 4 },
  presetChip: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    minWidth: 52, alignItems: 'center',
  },
  presetChipText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, letterSpacing: 0.2 },

  // Stats strip
  statsStrip: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10, borderTopWidth: 1,
  },
  statCell: { alignItems: 'center', flex: 1, gap: 2 },
  statValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: '#FAFAFA' },
  statLabel: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 9, color: '#3F3F46', letterSpacing: 0.6 },
  statDivider: { width: 1, height: 26, backgroundColor: '#1F1F23' },

  // Controls
  controls: { paddingHorizontal: 20, paddingTop: 10 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  startBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  startGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 9, paddingVertical: 17,
  },
  startText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: '#000', letterSpacing: 0.6 },
  sideBtn: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#0A0A0C', alignItems: 'center', justifyContent: 'center',
  },
  tripBtn: {
    width: 56, height: 56, borderRadius: 18,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  statusPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    borderRadius: 18, paddingVertical: 16,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, letterSpacing: 1 },

  // HUD
  hudContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hudExit: { position: 'absolute', right: 20 },
  hudUnit: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, letterSpacing: 5, textAlign: 'center', marginTop: 6 },
  hudLimit: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, letterSpacing: 3, textAlign: 'center', marginTop: 20 },

  // Coaching modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  coachingCard: {
    backgroundColor: '#0A0A0C', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: '#1F1F23', borderBottomWidth: 0,
    padding: 24, paddingBottom: 36,
  },
  coachingHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20,
  },
  coachingIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#00E5FF15', alignItems: 'center', justifyContent: 'center',
  },
  coachingTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#FAFAFA' },
  coachingScore: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#71717A', marginTop: 2 },
  coachingLoading: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 24, justifyContent: 'center',
  },
  coachingLoadingText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#71717A' },
  coachingTips: { gap: 14, marginBottom: 24 },
  coachingTip: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  coachingTipDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#00E5FF', marginTop: 6,
  },
  coachingTipText: {
    fontFamily: 'Inter_400Regular', fontSize: 14,
    color: '#D4D4D8', lineHeight: 21, flex: 1,
  },
  coachingActions: { gap: 10 },
  coachingDetailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#00E5FF14',
    borderWidth: 1, borderColor: '#00E5FF30',
    borderRadius: 16, paddingVertical: 14,
  },
  coachingDetailText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: '#00E5FF' },
  coachingDismissBtn: {
    alignItems: 'center', paddingVertical: 12,
  },
  coachingDismissText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: '#52525B' },
});
