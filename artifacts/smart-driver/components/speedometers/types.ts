import type { WarningState, GPSStatus, DisplaySize } from '@/models/types';

export interface SpeedometerProps {
  /** Speed in user's display unit (already converted). */
  speed: number;
  /** Unit label e.g. 'KM/H' | 'MPH' | 'KTS'. */
  unit: string;
  /** Raw speed in km/h — used for gauge arc fraction. */
  speedKmh: number;
  /** Speed limit in km/h (0 = none). */
  limitKmh: number;
  /** Speed limit formatted in user's display unit. */
  limitDisplay: number;
  /** Average speed in display unit. */
  avgSpeed: number;
  /** Maximum speed in display unit. */
  maxSpeed: number;
  /** Trip distance in km. */
  distance: number;
  /** Trip duration in seconds. */
  duration: number;
  /** Resolved warning state from the confirmation-window machine. */
  warningState: WarningState;
  /** Gauge max speed in km/h (used for arc fraction). */
  gaugeMax: number;
  /** Altitude in metres. */
  altitude: number;
  /** Heading in degrees. */
  heading: number;
  /** GPS lock quality. */
  gpsStatus: GPSStatus;
  /** Whether a trip is currently active. */
  tripActive: boolean;
  /** User show/hide toggles. */
  showAltitude: boolean;
  showHeading: boolean;
  showAvgSpeed: boolean;
  showMaxSpeed: boolean;
  /** Overall scale of the speedometer. */
  size: DisplaySize;
}
