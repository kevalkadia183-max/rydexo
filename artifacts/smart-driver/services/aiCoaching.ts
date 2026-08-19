/**
 * AI coaching API calls for Rydexo.
 *
 * Calls the API server's /api/ai/* endpoints.
 * Falls back gracefully when the server is unreachable or the AI backend
 * isn't configured — the server itself provides static fallback text.
 */
import type { DrivingEvent } from '@/models/types';

let _baseUrl: string = '';

/** Must be called once on app start with the same base URL used for sync. */
export function setAiBaseUrl(url: string): void {
  _baseUrl = url.replace(/\/+$/, '');
}

export interface TripCoachingResult {
  tips: string[];
  source: 'ai' | 'static' | 'offline';
}

export interface WeeklySummaryResult {
  summary: string;
  source: 'ai' | 'static' | 'offline';
}

async function apiFetch<T>(path: string, body: unknown): Promise<T> {
  const url = `${_baseUrl}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * Fetch AI coaching tips for a completed trip.
 * Always resolves — never throws.
 */
export async function fetchTripCoaching(params: {
  score: number;
  events: DrivingEvent[];
  distance: number;
  maxSpeed: number;
  duration: number;
}): Promise<TripCoachingResult> {
  try {
    const result = await apiFetch<{ tips: string[]; source: 'ai' | 'static' }>(
      '/api/ai/trip-coaching',
      {
        score: params.score,
        events: params.events.map(e => ({ type: e.type, severity: e.severity })),
        distance: params.distance,
        maxSpeed: params.maxSpeed,
        duration: params.duration,
      },
    );
    return result;
  } catch {
    // Network or server not available — client-side fallback
    return {
      tips: getOfflineFallbackTips(params.score),
      source: 'offline',
    };
  }
}

/**
 * Fetch a weekly/monthly AI coaching summary.
 * Always resolves — never throws.
 */
export async function fetchWeeklySummary(params: {
  avgScore: number;
  tripCount: number;
  speedingEvents: number;
  brakingEvents: number;
  totalDistance: number;
  period: 'week' | 'month';
}): Promise<WeeklySummaryResult> {
  try {
    const result = await apiFetch<{ summary: string; source: 'ai' | 'static' }>(
      '/api/ai/weekly-summary',
      params,
    );
    return result;
  } catch {
    return {
      summary: getOfflineWeeklySummary(params.avgScore, params.tripCount, params.period),
      source: 'offline',
    };
  }
}

// ── Client-side offline fallbacks ─────────────────────────────────────────────

function getOfflineFallbackTips(score: number): string[] {
  if (score >= 90) return [
    'Excellent drive! Your smooth inputs and speed discipline are textbook safe driving.',
    'Consistency is key — keep this up and your fuel costs will thank you too.',
  ];
  if (score >= 75) return [
    'Good drive overall. Focus on maintaining a slightly larger following distance to smooth out any braking events.',
    'Every improvement in your score adds up — you\'re close to excellent territory.',
  ];
  if (score >= 55) return [
    'Several events this trip point to opportunities for improvement.',
    'Try to anticipate traffic further ahead — this naturally reduces both hard braking and rapid acceleration.',
  ];
  return [
    'This trip had some challenging moments. Reducing speed on busy roads is the fastest way to improve your score.',
    'Smooth, predictable driving protects both safety and vehicle wear. Small changes lead to big improvements.',
  ];
}

function getOfflineWeeklySummary(score: number, tripCount: number, period: string): string {
  if (tripCount === 0) return `No trips this ${period === 'week' ? 'week' : 'month'} yet. Complete a drive to see your coaching summary.`;
  if (score >= 90) return `Great ${period === 'week' ? 'week' : 'month'}! Your average score of ${score}/100 across ${tripCount} trip${tripCount > 1 ? 's' : ''} reflects excellent driving habits.`;
  if (score >= 75) return `Solid ${period === 'week' ? 'week' : 'month'} with an average of ${score}/100. A little more focus on speed limits will push you into the excellent range.`;
  return `Your average score of ${score}/100 this ${period === 'week' ? 'week' : 'month'} shows room to grow. Smooth inputs and speed awareness will make the biggest difference.`;
}
