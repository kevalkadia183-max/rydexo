export type SpeedUnit = 'kmh' | 'mph' | 'knots';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD' | 'JPY';
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'other';
export type VehicleType = 'car' | 'motorcycle' | 'suv' | 'van' | 'truck' | 'other';
export type DrivingEventType = 'hard_braking' | 'rapid_acceleration' | 'speeding';
export type EventSeverity = 'low' | 'medium' | 'high';
export type GPSStatus = 'good' | 'weak' | 'none' | 'no_permission' | 'unavailable';
export type DriveMode = 'speed' | 'combined' | 'map' | 'hud';

export type SpeedometerStyle =
  | 'digital-minimal'
  | 'circular-gauge'
  | 'sport-gauge'
  | 'minimal-ring'
  | 'digital-segment'
  | 'premium-dashboard';

export type WarningState = 'normal' | 'approaching' | 'over-limit' | 'severe';

export type DisplaySize = 'small' | 'medium' | 'large';

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  fuelType: FuelType;
  efficiency: number; // km/L or km/kWh
  fuelPrice: number;
  currency: Currency;
  odometer?: number;
  isDefault: boolean;
  createdAt: number;
}

export interface TripPoint {
  lat: number;
  lng: number;
  speed: number; // km/h
  accuracy: number;
  timestamp: number;
}

export interface DrivingEvent {
  id: string;
  type: DrivingEventType;
  timestamp: number;
  lat?: number;
  lng?: number;
  severity: EventSeverity;
  value?: number;
}

export interface ScoreBreakdown {
  speed: number;
  braking: number;
  acceleration: number;
  overall: number;
}

export interface TripInsights {
  summary: string;
  positives: string[];
  improvements: string[];
}

export interface Trip {
  id: string;
  vehicleId: string;
  vehicleName: string;
  startTime: number;
  endTime: number;
  points: TripPoint[];
  distance: number; // km
  duration: number; // seconds
  avgSpeed: number; // km/h
  maxSpeed: number; // km/h
  events: DrivingEvent[];
  score: number;
  scoreBreakdown: ScoreBreakdown;
  fuelConsumed?: number;
  fuelCost?: number;
  insights: TripInsights;
  isCompleted: boolean;
}

export interface Settings {
  // Units
  speedUnit: SpeedUnit;
  currency: Currency;

  // Speedometer display
  speedometerStyle: SpeedometerStyle;
  gaugeMax: number;        // max km/h for gauge arc (140 | 180 | 220 | 260)
  displaySize: DisplaySize;
  showAltitude: boolean;
  showHeading: boolean;
  showAvgSpeed: boolean;
  showMaxSpeed: boolean;

  // Speed alerts (existing)
  speedAlertThreshold: number;  // km/h over limit before alert fires
  speedAlertEnabled: boolean;
  hapticAlertEnabled: boolean;
  defaultSpeedLimit: number;    // 0 = unknown

  // Speed alerts (new)
  voiceAlertsEnabled: boolean;
  approachingThreshold: number; // km/h below limit to show approaching warning
  severeThreshold: number;      // km/h over limit to trigger severe state

  // HUD
  hudMirror: boolean;

  // Onboarding
  onboardingComplete: boolean;
}

export interface ParkingLocation {
  lat: number;
  lng: number;
  timestamp: number;
  vehicleId?: string;
  vehicleName?: string;
}

export interface ActiveTrip {
  id: string;
  vehicleId: string;
  vehicleName: string;
  startTime: number;
  distance: number;
  duration: number; // seconds (accumulated)
  avgSpeed: number;
  maxSpeed: number;
  points: TripPoint[];
  events: DrivingEvent[];
  status: 'active' | 'paused';
  pausedAt?: number;
  speedLimit: number;
}
