import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { saveTrip, getTrips, deleteTripById, getParkingLocation, saveParkingLoc, clearParkingLoc } from '@/services/storage';
import { uploadTrip, deleteCloudTrip } from '@/services/cloudSync';
import { haversineKm, calculateScore, calculateFuel, generateInsights } from '@/services/scoring';
import type { Trip, TripPoint, DrivingEvent, ActiveTrip, ParkingLocation, GPSStatus } from '@/models/types';
import { useVehicles } from './VehicleContext';
import { useApp } from './AppContext';

const SPEED_ALPHA = 0.3;
const MAX_ACCURACY = 50;
const MIN_POINT_MS = 3000;
const MIN_POINT_KM = 0.008;

interface LocationData {
  coords: {
    latitude: number;
    longitude: number;
    speed: number | null;
    accuracy: number | null;
    heading: number | null;
    altitude?: number | null;
  };
  timestamp: number;
}

interface TripContextType {
  currentSpeed: number;
  rawSpeed: number;
  currentLocation: { lat: number; lng: number } | null;
  heading: number;
  altitude: number;
  gpsAccuracy: number;
  gpsStatus: GPSStatus;
  activeTrip: ActiveTrip | null;
  startTrip: () => Promise<void>;
  pauseTrip: () => void;
  resumeTrip: () => void;
  endTrip: () => Promise<Trip | null>;
  trips: Trip[];
  refreshTrips: () => Promise<void>;
  removeTrip: (id: string) => Promise<void>;
  speedLimit: number;
  setSpeedLimit: (limit: number) => void;
  isOverSpeedLimit: boolean;
  parkingLocation: ParkingLocation | null;
  saveParkingSpot: () => Promise<void>;
  clearParking: () => Promise<void>;
}

const TripContext = createContext<TripContextType>({} as TripContextType);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const { activeVehicle } = useVehicles();
  const { settings } = useApp();

  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [rawSpeed, setRawSpeed] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState(0);
  const [altitude, setAltitude] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>('none');
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [speedLimit, setSpeedLimit] = useState(0);
  const [parkingLocation, setParkingLocation] = useState<ParkingLocation | null>(null);

  const smoothedRef = useRef(0);
  const locationSubRef = useRef<{ remove: () => void } | null>(null);
  const activeTripRef = useRef<ActiveTrip | null>(null);
  const lastPointRef = useRef<TripPoint | null>(null);
  const prevLocRef = useRef<LocationData | null>(null);
  const lastEventRef = useRef<Record<string, number>>({});

  useEffect(() => { activeTripRef.current = activeTrip; }, [activeTrip]);

  useEffect(() => {
    getTrips().then(setTrips);
    getParkingLocation().then(setParkingLocation);
  }, []);

  useEffect(() => {
    setSpeedLimit(settings.defaultSpeedLimit ?? 0);
  }, [settings.defaultSpeedLimit]);

  const isOverSpeedLimit = speedLimit > 0 && currentSpeed > speedLimit + (settings.speedAlertThreshold ?? 5);

  const processLocation = useCallback((loc: LocationData) => {
    const rawMs = Math.max(0, loc.coords.speed ?? 0);
    const rawKmh = rawMs * 3.6;
    if (rawKmh > 300) return;

    const accuracy = loc.coords.accuracy ?? 99;
    setGpsAccuracy(accuracy);
    setGpsStatus(accuracy > MAX_ACCURACY ? 'weak' : 'good');

    smoothedRef.current = SPEED_ALPHA * rawKmh + (1 - SPEED_ALPHA) * smoothedRef.current;
    if (smoothedRef.current < 0.5) smoothedRef.current = 0;

    setRawSpeed(Math.round(rawKmh));
    setCurrentSpeed(Math.round(smoothedRef.current));
    setCurrentLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    setHeading(loc.coords.heading ?? 0);
    setAltitude(loc.coords.altitude ?? 0);

    const trip = activeTripRef.current;
    if (trip && trip.status === 'active') {
      const now = loc.timestamp;
      const prev = prevLocRef.current;

      let addedDist = 0;
      if (prev) {
        const dist = haversineKm(prev.coords.latitude, prev.coords.longitude, loc.coords.latitude, loc.coords.longitude);
        if (dist < 1 && dist > 0.003) addedDist = dist;

        const dt = (now - prev.timestamp) / 1000;
        if (dt > 0.5 && dt < 10 && accuracy < MAX_ACCURACY) {
          const v1 = (prev.coords.speed ?? 0) * 3.6;
          const accel = (rawKmh - v1) / (dt * 3.6);
          const cd = 8000;
          const ev = lastEventRef.current;

          if (accel < -2.5 && (!ev['hard_braking'] || now - ev['hard_braking'] > cd)) {
            ev['hard_braking'] = now;
            const event: DrivingEvent = { id: `${now}b`, type: 'hard_braking', timestamp: now, lat: loc.coords.latitude, lng: loc.coords.longitude, severity: accel < -4 ? 'high' : 'medium' };
            setActiveTrip(p => p ? { ...p, events: [...p.events, event] } : null);
          }
          if (accel > 2.0 && (!ev['rapid_acceleration'] || now - ev['rapid_acceleration'] > cd)) {
            ev['rapid_acceleration'] = now;
            const event: DrivingEvent = { id: `${now}a`, type: 'rapid_acceleration', timestamp: now, lat: loc.coords.latitude, lng: loc.coords.longitude, severity: accel > 3.5 ? 'high' : 'medium' };
            setActiveTrip(p => p ? { ...p, events: [...p.events, event] } : null);
          }
        }
      }

      // Speed limit event
      const sm = smoothedRef.current;
      const lim = trip.speedLimit;
      if (lim > 0 && sm > lim + 5 && (!lastEventRef.current['speeding'] || now - lastEventRef.current['speeding'] > 15000)) {
        lastEventRef.current['speeding'] = now;
        const event: DrivingEvent = { id: `${now}s`, type: 'speeding', timestamp: now, lat: loc.coords.latitude, lng: loc.coords.longitude, severity: sm - lim > 20 ? 'high' : sm - lim > 10 ? 'medium' : 'low', value: sm };
        setActiveTrip(p => p ? { ...p, events: [...p.events, event] } : null);
      }

      const lastPt = lastPointRef.current;
      const shouldAdd = !lastPt || (now - lastPt.timestamp > MIN_POINT_MS) || (addedDist > MIN_POINT_KM * 2);
      if (shouldAdd) {
        const pt: TripPoint = { lat: loc.coords.latitude, lng: loc.coords.longitude, speed: sm, accuracy, timestamp: now };
        lastPointRef.current = pt;
        setActiveTrip(p => {
          if (!p) return null;
          const newDist = p.distance + addedDist;
          const elapsed = (now - p.startTime) / 1000;
          const duration = Math.max(0, elapsed);
          const avgSpeed = duration > 30 ? (newDist / (duration / 3600)) : 0;
          const maxSpeed = Math.max(p.maxSpeed, sm);
          return { ...p, distance: newDist, duration, avgSpeed, maxSpeed, points: [...p.points, pt].slice(-500) };
        });
      }

      prevLocRef.current = loc;
    }
  }, []);

  const startWatch = useCallback(async () => {
    if (locationSubRef.current) return;
    if (Platform.OS !== 'web') {
      try {
        const Location = await import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setGpsStatus('no_permission'); return; }
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 },
          (loc) => processLocation({ coords: { latitude: loc.coords.latitude, longitude: loc.coords.longitude, speed: loc.coords.speed, accuracy: loc.coords.accuracy, heading: loc.coords.heading }, timestamp: loc.timestamp })
        );
        locationSubRef.current = sub;
        setGpsStatus('good');
      } catch {
        setGpsStatus('unavailable');
      }
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => processLocation({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, speed: pos.coords.speed, accuracy: pos.coords.accuracy, heading: pos.coords.heading }, timestamp: pos.timestamp }),
        () => setGpsStatus('no_permission'),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      locationSubRef.current = { remove: () => navigator.geolocation.clearWatch(watchId) };
      setGpsStatus('good');
    } else {
      setGpsStatus('unavailable');
    }
  }, [processLocation]);

  const stopWatch = useCallback(() => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
  }, []);

  useEffect(() => {
    startWatch();
    return stopWatch;
  }, []);

  const refreshTrips = useCallback(async () => { setTrips(await getTrips()); }, []);

  const removeTrip = useCallback(async (id: string) => {
    await deleteTripById(id);
    setTrips(prev => prev.filter(t => t.id !== id));
    deleteCloudTrip(id).catch(() => {});
  }, []);

  const startTrip = useCallback(async () => {
    if (!activeVehicle) return;
    const trip: ActiveTrip = {
      id: `${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
      vehicleId: activeVehicle.id,
      vehicleName: activeVehicle.name,
      startTime: Date.now(),
      distance: 0, duration: 0, avgSpeed: 0, maxSpeed: 0,
      points: [], events: [], status: 'active', speedLimit,
    };
    lastPointRef.current = null;
    prevLocRef.current = null;
    lastEventRef.current = {};
    smoothedRef.current = currentSpeed;
    setActiveTrip(trip);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [activeVehicle, speedLimit, currentSpeed]);

  const pauseTrip = useCallback(() => {
    setActiveTrip(p => p ? { ...p, status: 'paused', pausedAt: Date.now() } : null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const resumeTrip = useCallback(() => {
    setActiveTrip(p => p ? { ...p, status: 'active', pausedAt: undefined } : null);
    lastEventRef.current = {};
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const endTrip = useCallback(async (): Promise<Trip | null> => {
    const trip = activeTripRef.current;
    if (!trip) return null;
    const { score, breakdown } = calculateScore(trip.events);
    let fuelConsumed: number | undefined;
    let fuelCost: number | undefined;
    if (activeVehicle) {
      const fuel = calculateFuel(trip.distance, activeVehicle);
      fuelConsumed = fuel.consumed;
      fuelCost = fuel.cost;
    }
    const insights = generateInsights(trip.events, score, trip.distance, trip.maxSpeed);
    const completed: Trip = {
      id: trip.id, vehicleId: trip.vehicleId, vehicleName: trip.vehicleName,
      startTime: trip.startTime, endTime: Date.now(),
      points: trip.points, distance: Math.round(trip.distance * 10) / 10,
      duration: Math.round(trip.duration), avgSpeed: Math.round(trip.avgSpeed),
      maxSpeed: Math.round(trip.maxSpeed), events: trip.events,
      score, scoreBreakdown: breakdown, fuelConsumed, fuelCost, insights, isCompleted: true,
    };
    await saveTrip(completed);
    setTrips(prev => [completed, ...prev]);
    setActiveTrip(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    uploadTrip(completed).catch(() => {});
    return completed;
  }, [activeVehicle]);

  const saveParkingSpot = useCallback(async () => {
    if (!currentLocation) return;
    const loc: ParkingLocation = { lat: currentLocation.lat, lng: currentLocation.lng, timestamp: Date.now(), vehicleId: activeVehicle?.id, vehicleName: activeVehicle?.name };
    await saveParkingLoc(loc);
    setParkingLocation(loc);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [currentLocation, activeVehicle]);

  const clearParking = useCallback(async () => {
    await clearParkingLoc();
    setParkingLocation(null);
  }, []);

  return (
    <TripContext.Provider value={{ currentSpeed, rawSpeed, currentLocation, heading, altitude, gpsAccuracy, gpsStatus, activeTrip, startTrip, pauseTrip, resumeTrip, endTrip, trips, refreshTrips, removeTrip, speedLimit, setSpeedLimit, isOverSpeedLimit, parkingLocation, saveParkingSpot, clearParking }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  return useContext(TripContext);
}
