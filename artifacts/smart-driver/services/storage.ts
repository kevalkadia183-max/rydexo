import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Trip, Vehicle, Settings, ParkingLocation } from '@/models/types';

const KEYS = {
  TRIPS: 'velotrack:trips',
  VEHICLES: 'velotrack:vehicles',
  SETTINGS: 'velotrack:settings',
  PARKING: 'velotrack:parking',
};

// ─── Trips ────────────────────────────────────────────────────────────────────

export const getTrips = async (): Promise<Trip[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.TRIPS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveTrip = async (trip: Trip): Promise<void> => {
  const trips = await getTrips();
  const idx = trips.findIndex(t => t.id === trip.id);
  if (idx >= 0) trips[idx] = trip;
  else trips.unshift(trip);
  await AsyncStorage.setItem(KEYS.TRIPS, JSON.stringify(trips));
};

export const deleteTripById = async (id: string): Promise<void> => {
  const trips = await getTrips();
  await AsyncStorage.setItem(KEYS.TRIPS, JSON.stringify(trips.filter(t => t.id !== id)));
};

export const getTripById = async (id: string): Promise<Trip | null> => {
  const trips = await getTrips();
  return trips.find(t => t.id === id) ?? null;
};

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export const getVehicles = async (): Promise<Vehicle[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.VEHICLES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveVehicle = async (vehicle: Vehicle): Promise<void> => {
  const vehicles = await getVehicles();
  const idx = vehicles.findIndex(v => v.id === vehicle.id);
  if (idx >= 0) vehicles[idx] = vehicle;
  else vehicles.push(vehicle);
  await AsyncStorage.setItem(KEYS.VEHICLES, JSON.stringify(vehicles));
};

export const deleteVehicleById = async (id: string): Promise<void> => {
  const vehicles = await getVehicles();
  await AsyncStorage.setItem(KEYS.VEHICLES, JSON.stringify(vehicles.filter(v => v.id !== id)));
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  // Units
  speedUnit: 'kmh',
  currency: 'USD',

  // Speedometer display
  speedometerStyle: 'digital-minimal',
  gaugeMax: 180,
  displaySize: 'medium',
  showAltitude: true,
  showHeading: true,
  showAvgSpeed: true,
  showMaxSpeed: true,

  // Speed alerts (existing)
  speedAlertThreshold: 5,
  speedAlertEnabled: true,
  hapticAlertEnabled: true,
  defaultSpeedLimit: 0,

  // Speed alerts (new)
  voiceAlertsEnabled: false,
  approachingThreshold: 10,
  severeThreshold: 20,

  // HUD
  hudMirror: false,

  // Onboarding
  onboardingComplete: false,
};

export const getSettings = async (): Promise<Settings> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: Partial<Settings>): Promise<void> => {
  const current = await getSettings();
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...settings }));
};

// ─── Parking ──────────────────────────────────────────────────────────────────

export const getParkingLocation = async (): Promise<ParkingLocation | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PARKING);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveParkingLoc = async (loc: ParkingLocation): Promise<void> => {
  await AsyncStorage.setItem(KEYS.PARKING, JSON.stringify(loc));
};

export const clearParkingLoc = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEYS.PARKING);
};
