import type { DrivingEvent, ScoreBreakdown, TripInsights, Vehicle } from '@/models/types';

export function calculateScore(events: DrivingEvent[]): { score: number; breakdown: ScoreBreakdown } {
  let speedDeduction = 0;
  let brakingDeduction = 0;
  let accelerationDeduction = 0;

  for (const event of events) {
    switch (event.type) {
      case 'speeding':
        speedDeduction += event.severity === 'high' ? 7 : event.severity === 'medium' ? 4 : 2;
        break;
      case 'hard_braking':
        brakingDeduction += event.severity === 'high' ? 5 : 3;
        break;
      case 'rapid_acceleration':
        accelerationDeduction += event.severity === 'high' ? 4 : 2;
        break;
    }
  }

  speedDeduction = Math.min(speedDeduction, 35);
  brakingDeduction = Math.min(brakingDeduction, 25);
  accelerationDeduction = Math.min(accelerationDeduction, 20);

  const speedScore = Math.max(0, 100 - speedDeduction);
  const brakingScore = Math.max(0, 100 - brakingDeduction);
  const accelerationScore = Math.max(0, 100 - accelerationDeduction);
  const overall = Math.round(speedScore * 0.4 + brakingScore * 0.35 + accelerationScore * 0.25);

  return {
    score: Math.max(10, overall),
    breakdown: {
      speed: Math.round(speedScore),
      braking: Math.round(brakingScore),
      acceleration: Math.round(accelerationScore),
      overall: Math.max(10, overall),
    },
  };
}

export function calculateFuel(distanceKm: number, vehicle: Vehicle): { consumed: number; cost: number } {
  if (!vehicle.efficiency || vehicle.efficiency <= 0) return { consumed: 0, cost: 0 };
  const consumed = distanceKm / vehicle.efficiency;
  const cost = consumed * vehicle.fuelPrice;
  return { consumed: Math.round(consumed * 100) / 100, cost: Math.round(cost * 100) / 100 };
}

export function generateInsights(events: DrivingEvent[], score: number, distance: number, maxSpeed: number): TripInsights {
  const speedingEvents = events.filter(e => e.type === 'speeding');
  const brakingEvents = events.filter(e => e.type === 'hard_braking');
  const accelEvents = events.filter(e => e.type === 'rapid_acceleration');

  const positives: string[] = [];
  const improvements: string[] = [];

  if (speedingEvents.length === 0) positives.push('Excellent speed discipline throughout');
  if (brakingEvents.length === 0) positives.push('Smooth, controlled braking');
  if (accelEvents.length === 0) positives.push('Smooth and efficient acceleration');
  if (score >= 90) positives.push('Outstanding overall performance');
  else if (score >= 75) positives.push('Good overall driving performance');
  if (distance > 10 && events.length === 0) positives.push('Clean drive with zero events detected');

  if (speedingEvents.length > 0)
    improvements.push(`Reduce speeding — ${speedingEvents.length} event${speedingEvents.length > 1 ? 's' : ''} recorded`);
  if (brakingEvents.length > 0)
    improvements.push(`Earlier braking — ${brakingEvents.length} hard braking event${brakingEvents.length > 1 ? 's' : ''}`);
  if (accelEvents.length > 0)
    improvements.push(`Gentler acceleration — ${accelEvents.length} rapid event${accelEvents.length > 1 ? 's' : ''}`);
  if (maxSpeed > 130) improvements.push('Consider reducing maximum speed for safety');

  if (positives.length === 0) positives.push('Trip recorded successfully');

  let summary: string;
  if (score >= 90) summary = 'Excellent drive. Smooth and safe throughout the journey.';
  else if (score >= 75) summary = `Good drive scoring ${score}/100. A few minor events to watch.`;
  else if (score >= 55) summary = `Moderate drive scoring ${score}/100. Several driving events recorded.`;
  else summary = `This drive scored ${score}/100. Focus on speed and smoother braking.`;

  return { summary, positives, improvements };
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatSpeed(kmh: number, unit: 'kmh' | 'mph' | 'knots'): number {
  if (unit === 'mph') return Math.round(kmh * 0.621371);
  if (unit === 'knots') return Math.round(kmh * 0.539957);
  return Math.round(kmh);
}

export function formatSpeedUnit(unit: 'kmh' | 'mph' | 'knots'): string {
  if (unit === 'mph') return 'MPH';
  if (unit === 'knots') return 'KTS';
  return 'KM/H';
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 55) return 'Fair';
  return 'Needs Work';
}

export function getScoreColor(score: number, colors: { primary: string; success: string; warning: string; destructive: string }): string {
  if (score >= 90) return colors.success;
  if (score >= 75) return colors.primary;
  if (score >= 55) return colors.warning;
  return colors.destructive;
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'CA$', AUD: 'A$', JPY: '¥' };
  const sym = symbols[currency] ?? currency;
  return `${sym}${amount.toFixed(2)}`;
}
