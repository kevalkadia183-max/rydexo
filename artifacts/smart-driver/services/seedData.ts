/**
 * Seed data for testing / demo purposes.
 * Generates realistic-looking trips, vehicles, and settings
 * and writes them to AsyncStorage via the storage service.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Trip, Vehicle, TripPoint, DrivingEvent, ScoreBreakdown, TripInsights } from '@/models/types';
import { calculateScore } from '@/services/scoring';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

/** Clamp a number */
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Days ago as unix ms */
const daysAgo = (d: number, hourOffset = 8) => {
  const now = Date.now();
  return now - d * 86_400_000 + hourOffset * 3_600_000;
};

/**
 * Generate a smooth GPS route starting at (lat0, lng0) heading in `bearing` degrees,
 * simulating a city drive with realistic speed variation.
 */
function generateRoute(
  lat0: number,
  lng0: number,
  bearing: number,
  totalKm: number,
  avgSpeedKmh: number,
  startMs: number,
): TripPoint[] {
  const points: TripPoint[] = [];
  const bearingRad = (bearing * Math.PI) / 180;

  // km per degree approximation
  const kmPerLat = 111.0;
  const kmPerLng = 111.0 * Math.cos((lat0 * Math.PI) / 180);

  let distCovered = 0;
  let ts = startMs;
  let lat = lat0;
  let lng = lng0;
  let speed = avgSpeedKmh * 0.7; // start slower

  while (distCovered < totalKm) {
    points.push({ lat, lng, speed, accuracy: 4 + Math.random() * 6, timestamp: ts });

    // vary speed naturally
    const speedTarget =
      distCovered < totalKm * 0.1
        ? avgSpeedKmh * 0.6                 // acceleration phase
        : distCovered > totalKm * 0.85
          ? avgSpeedKmh * 0.5               // slow down near end
          : avgSpeedKmh + (Math.random() - 0.5) * 20;
    speed = clamp(speed + (speedTarget - speed) * 0.25, 0, 130);

    // step: ~3s at current speed
    const stepSec = 3;
    const stepKm = (speed / 3600) * stepSec;
    distCovered += stepKm;
    ts += stepSec * 1000;

    lat += (stepKm * Math.cos(bearingRad)) / kmPerLat;
    lng += (stepKm * Math.sin(bearingRad)) / kmPerLng;
  }
  return points;
}

/** Pick evenly distributed driving events along a route */
function generateEvents(
  points: TripPoint[],
  counts: { braking: number; accel: number; speeding: number },
): DrivingEvent[] {
  const events: DrivingEvent[] = [];
  const n = points.length;

  const pick = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      points[Math.floor(((i + 1) / (count + 1)) * n)],
    );

  pick(counts.braking).forEach(p => {
    events.push({
      id: uid(),
      type: 'hard_braking',
      timestamp: p.timestamp,
      lat: p.lat,
      lng: p.lng,
      severity: Math.random() > 0.5 ? 'medium' : 'high',
      value: 8 + Math.random() * 6,
    });
  });

  pick(counts.accel).forEach(p => {
    events.push({
      id: uid(),
      type: 'rapid_acceleration',
      timestamp: p.timestamp,
      lat: p.lat,
      lng: p.lng,
      severity: Math.random() > 0.6 ? 'low' : 'medium',
      value: 10 + Math.random() * 8,
    });
  });

  pick(counts.speeding).forEach(p => {
    events.push({
      id: uid(),
      type: 'speeding',
      timestamp: p.timestamp,
      lat: p.lat,
      lng: p.lng,
      severity: 'medium',
      value: p.speed,
    });
  });

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

function scoreBreakdown(events: DrivingEvent[], maxSpeed: number, speedLimit = 60): ScoreBreakdown {
  const braking = events.filter(e => e.type === 'hard_braking').length;
  const accel = events.filter(e => e.type === 'rapid_acceleration').length;
  const speeding = events.filter(e => e.type === 'speeding').length;
  const brakingScore = clamp(100 - braking * 15, 30, 100);
  const accelScore = clamp(100 - accel * 12, 30, 100);
  const speedScore = clamp(100 - speeding * 10 - Math.max(0, maxSpeed - speedLimit) * 0.5, 30, 100);
  const overall = Math.round(brakingScore * 0.4 + accelScore * 0.3 + speedScore * 0.3);
  return {
    braking: Math.round(brakingScore),
    acceleration: Math.round(accelScore),
    speed: Math.round(speedScore),
    overall,
  };
}

const INSIGHTS_POOL: TripInsights[] = [
  {
    summary: 'Smooth and efficient drive with minimal events.',
    positives: ['Consistent speed throughout', 'No hard braking detected', 'Good acceleration control'],
    improvements: ['Consider reducing speed on highway sections'],
  },
  {
    summary: 'Good overall drive with a couple of braking events worth watching.',
    positives: ['Maintained steady cruising speed', 'Efficient fuel usage'],
    improvements: ['Two hard-braking events detected — increase following distance', 'Ease off throttle earlier when approaching stops'],
  },
  {
    summary: 'Solid drive. Speed management could be improved.',
    positives: ['Smooth lane changes', 'Consistent acceleration'],
    improvements: ['Speed exceeded limit on two segments', 'Consider anticipating traffic flow earlier'],
  },
  {
    summary: 'Excellent drive — one of your best scores this week.',
    positives: ['Zero hard braking', 'Smooth, progressive acceleration', 'Speed well controlled'],
    improvements: ['Keep it up!'],
  },
  {
    summary: 'Challenging conditions led to a few events — still a respectable score.',
    positives: ['Good speed control in traffic', 'Recovered well from events'],
    improvements: ['Three rapid-acceleration events — try smoother throttle application', 'Watch for abrupt stops in congestion'],
  },
];

// ─── Route definitions (San Francisco area) ───────────────────────────────────
// Each entry: [startLat, startLng, bearing, distanceKm, avgSpeedKmh, description]
const ROUTES: [number, number, number, number, number, string][] = [
  [37.7749, -122.4194, 45,  8.2,  42, 'Downtown → Mission'],
  [37.7595, -122.4089, 315, 5.6,  55, 'Mission → Haight'],
  [37.7749, -122.4194, 90,  3.1,  28, 'Downtown → SoMa'],
  [37.8044, -122.2712, 180, 12.4, 65, 'Oakland → Fremont'],
  [37.7749, -122.4194, 270, 4.8,  35, 'Downtown → Sunset'],
  [37.8044, -122.2712, 90,  18.0, 75, 'Oakland → San Jose Hwy'],
  [37.7595, -122.4089, 135, 6.3,  48, 'Mission → Glen Park'],
  [37.8044, -122.2712, 315, 7.7,  52, 'Oakland → Berkeley'],
  [37.7749, -122.4194, 180, 2.4,  22, 'Short City Loop'],
  [37.7595, -122.4089, 45,  9.1,  58, 'Mission → Bay Bridge'],
  [37.7749, -122.4194, 0,   14.5, 68, 'Downtown → Marin'],
  [37.8044, -122.2712, 225, 5.0,  40, 'Oakland → Piedmont'],
];

// ─── Vehicles ─────────────────────────────────────────────────────────────────

const VEHICLE_1_ID = 'seed-vehicle-1';
const VEHICLE_2_ID = 'seed-vehicle-2';

const seedVehicles: Vehicle[] = [
  {
    id: VEHICLE_1_ID,
    name: 'Tesla Model 3',
    type: 'car',
    fuelType: 'electric',
    efficiency: 6.5,   // km/kWh
    fuelPrice: 0.14,   // $/kWh
    currency: 'USD',
    odometer: 18_420,
    isDefault: true,
    createdAt: daysAgo(60),
  },
  {
    id: VEHICLE_2_ID,
    name: 'Honda CB500F',
    type: 'motorcycle',
    fuelType: 'petrol',
    efficiency: 25,    // km/L
    fuelPrice: 3.89,   // $/gallon → stored $/L equiv
    currency: 'USD',
    odometer: 7_310,
    isDefault: false,
    createdAt: daysAgo(45),
  },
];

// ─── Trip builder ─────────────────────────────────────────────────────────────

interface TripDef {
  routeIdx: number;
  daysAgoVal: number;
  hourOffset: number;
  vehicleId: string;
  vehicleName: string;
  events: { braking: number; accel: number; speeding: number };
}

const TRIP_DEFS: TripDef[] = [
  // Today
  { routeIdx: 0,  daysAgoVal: 0, hourOffset: 7,  vehicleId: VEHICLE_1_ID, vehicleName: 'Tesla Model 3',   events: { braking: 0, accel: 1, speeding: 0 } },
  { routeIdx: 2,  daysAgoVal: 0, hourOffset: 17, vehicleId: VEHICLE_1_ID, vehicleName: 'Tesla Model 3',   events: { braking: 1, accel: 0, speeding: 0 } },
  // Yesterday
  { routeIdx: 3,  daysAgoVal: 1, hourOffset: 8,  vehicleId: VEHICLE_1_ID, vehicleName: 'Tesla Model 3',   events: { braking: 1, accel: 2, speeding: 1 } },
  { routeIdx: 6,  daysAgoVal: 1, hourOffset: 18, vehicleId: VEHICLE_2_ID, vehicleName: 'Honda CB500F',    events: { braking: 0, accel: 1, speeding: 1 } },
  // 2 days ago
  { routeIdx: 1,  daysAgoVal: 2, hourOffset: 9,  vehicleId: VEHICLE_1_ID, vehicleName: 'Tesla Model 3',   events: { braking: 0, accel: 0, speeding: 0 } },
  // 3 days ago
  { routeIdx: 7,  daysAgoVal: 3, hourOffset: 7,  vehicleId: VEHICLE_2_ID, vehicleName: 'Honda CB500F',    events: { braking: 2, accel: 1, speeding: 0 } },
  { routeIdx: 4,  daysAgoVal: 3, hourOffset: 16, vehicleId: VEHICLE_1_ID, vehicleName: 'Tesla Model 3',   events: { braking: 0, accel: 1, speeding: 0 } },
  // 5 days ago
  { routeIdx: 5,  daysAgoVal: 5, hourOffset: 8,  vehicleId: VEHICLE_1_ID, vehicleName: 'Tesla Model 3',   events: { braking: 1, accel: 1, speeding: 2 } },
  // 6 days ago
  { routeIdx: 8,  daysAgoVal: 6, hourOffset: 12, vehicleId: VEHICLE_2_ID, vehicleName: 'Honda CB500F',    events: { braking: 0, accel: 0, speeding: 0 } },
  // Last week
  { routeIdx: 9,  daysAgoVal: 8, hourOffset: 8,  vehicleId: VEHICLE_1_ID, vehicleName: 'Tesla Model 3',   events: { braking: 2, accel: 2, speeding: 1 } },
  { routeIdx: 10, daysAgoVal: 10, hourOffset: 7, vehicleId: VEHICLE_1_ID, vehicleName: 'Tesla Model 3',   events: { braking: 1, accel: 0, speeding: 0 } },
  { routeIdx: 11, daysAgoVal: 12, hourOffset: 17, vehicleId: VEHICLE_2_ID, vehicleName: 'Honda CB500F',   events: { braking: 0, accel: 2, speeding: 1 } },
];

function buildTrip(def: TripDef): Trip {
  const [lat0, lng0, bearing, distKm, avgSpeedKmh] = ROUTES[def.routeIdx];
  const startMs = daysAgo(def.daysAgoVal, def.hourOffset);

  const points = generateRoute(lat0, lng0, bearing, distKm, avgSpeedKmh, startMs);
  const endMs = points[points.length - 1].timestamp;
  const duration = Math.round((endMs - startMs) / 1000);
  const maxSpeed = Math.max(...points.map(p => p.speed));
  const avgSpeed = points.reduce((s, p) => s + p.speed, 0) / points.length;

  const events = generateEvents(points, def.events);
  const breakdown = scoreBreakdown(events, maxSpeed);

  const fuelConsumed = def.vehicleId === VEHICLE_1_ID
    ? distKm / 6.5   // kWh
    : distKm / 25;   // litres
  const fuelCost = def.vehicleId === VEHICLE_1_ID
    ? fuelConsumed * 0.14
    : fuelConsumed * 1.03; // ~$3.89/gal → ~$1.03/L

  const insightTemplate = INSIGHTS_POOL[Math.floor(Math.random() * INSIGHTS_POOL.length)];

  return {
    id: uid(),
    vehicleId: def.vehicleId,
    vehicleName: def.vehicleName,
    startTime: startMs,
    endTime: endMs,
    points,
    distance: parseFloat(distKm.toFixed(2)),
    duration,
    avgSpeed: parseFloat(avgSpeed.toFixed(1)),
    maxSpeed: parseFloat(maxSpeed.toFixed(1)),
    events,
    score: breakdown.overall,
    scoreBreakdown: breakdown,
    fuelConsumed: parseFloat(fuelConsumed.toFixed(2)),
    fuelCost: parseFloat(fuelCost.toFixed(2)),
    insights: insightTemplate,
    isCompleted: true,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

const KEYS = {
  TRIPS: 'velotrack:trips',
  VEHICLES: 'velotrack:vehicles',
  SETTINGS: 'velotrack:settings',
};

/** Returns true if sample data has already been loaded. */
export async function hasSeedData(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.TRIPS);
  const trips: Trip[] = raw ? JSON.parse(raw) : [];
  return trips.length > 0;
}

/**
 * Populate AsyncStorage with sample vehicles + trips.
 * Pass `replace = true` to overwrite any existing data.
 */
export async function loadSeedData(replace = false): Promise<{ trips: number; vehicles: number }> {
  // Vehicles
  const existingVehiclesRaw = await AsyncStorage.getItem(KEYS.VEHICLES);
  const existingVehicles: Vehicle[] = existingVehiclesRaw ? JSON.parse(existingVehiclesRaw) : [];

  let vehicles = existingVehicles;
  if (replace || vehicles.length === 0) {
    vehicles = seedVehicles;
  } else {
    // Merge: add seed vehicles that don't already exist
    for (const sv of seedVehicles) {
      if (!vehicles.find(v => v.id === sv.id)) vehicles.push(sv);
    }
  }
  await AsyncStorage.setItem(KEYS.VEHICLES, JSON.stringify(vehicles));

  // Trips
  const existingTripsRaw = await AsyncStorage.getItem(KEYS.TRIPS);
  const existingTrips: Trip[] = existingTripsRaw ? JSON.parse(existingTripsRaw) : [];

  const newTrips = TRIP_DEFS.map(buildTrip);
  const allTrips = replace
    ? newTrips
    : [...newTrips, ...existingTrips];

  // newest first
  allTrips.sort((a, b) => b.startTime - a.startTime);
  await AsyncStorage.setItem(KEYS.TRIPS, JSON.stringify(allTrips));

  // Mark onboarding complete so the app goes straight to the home screen
  const settingsRaw = await AsyncStorage.getItem(KEYS.SETTINGS);
  const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...settings, onboardingComplete: true }));

  return { trips: newTrips.length, vehicles: seedVehicles.length };
}

/** Wipe all Rydexo data from AsyncStorage. */
export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.TRIPS, KEYS.VEHICLES, KEYS.SETTINGS, 'velotrack:parking']);
}
