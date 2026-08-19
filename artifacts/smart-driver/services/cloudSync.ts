/**
 * Cloud sync service — offline-first with strict account isolation.
 *
 * Account isolation rules:
 *   1. FIRST sign-in on this device (no prior syncUserId): upload local data,
 *      then pull from server. Gives new accounts their pre-signup trips.
 *   2. Same user re-signs-in: two-way merge (pull server → local, upload local-only).
 *   3. DIFFERENT user signs in: clear all local data first, then pull server data.
 *      Previous user's data is never uploaded to the new account.
 *
 * After every successful full sync the authenticated userId is persisted so
 * subsequent calls can identify account-switch scenarios.
 *
 * All functions fail silently on network errors so the app stays fully
 * usable offline.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncApi } from './api';
import {
  getTrips,
  saveTrip,
  getVehicles,
  saveVehicle,
  getSettings,
  saveSettings,
} from './storage';
import type { Trip, Vehicle, Settings } from '@/models/types';

// Key that records which user's data is currently stored locally
const SYNC_USER_KEY = 'velotrack:sync_user_id';

// Storage keys for the sync data (mirrored from storage.ts to allow selective clear)
const LOCAL_TRIPS_KEY     = 'velotrack:trips';
const LOCAL_VEHICLES_KEY  = 'velotrack:vehicles';
const LOCAL_SETTINGS_KEY  = 'velotrack:settings';

let _isSyncing = false;

// ─── Clear local synced data ───────────────────────────────────────────────────

/**
 * Remove all user-generated local data (trips, vehicles, settings).
 * Called when a different account signs in so stale data is never uploaded.
 */
async function clearLocalSyncData(): Promise<void> {
  await AsyncStorage.multiRemove([LOCAL_TRIPS_KEY, LOCAL_VEHICLES_KEY, LOCAL_SETTINGS_KEY, SYNC_USER_KEY]);
}

// ─── Full sync ─────────────────────────────────────────────────────────────────

/**
 * Run a full sync for the given user.
 *
 * @param userId  The currently authenticated user's ID.  Pass it in so the
 *                function can detect account switches without an extra API call.
 */
export async function fullSync(userId: string): Promise<void> {
  if (_isSyncing) return;
  _isSyncing = true;
  try {
    const storedUserId = await AsyncStorage.getItem(SYNC_USER_KEY);
    const isNewDevice  = storedUserId === null;          // never synced here
    const isSameUser   = storedUserId === userId;
    const isSwitched   = !isNewDevice && !isSameUser;   // different account

    if (isSwitched) {
      // Clear stale data — the other user's trips must not upload to this account
      await clearLocalSyncData();
    }

    // For a first-ever sync or the same user, do a two-way merge.
    // For a switched account we just cleared, go server-wins (pull only).
    await Promise.all([
      syncTrips({ uploadLocal: !isSwitched }),
      syncVehicles({ uploadLocal: !isSwitched }),
      syncSettings({ uploadLocal: !isSwitched }),
    ]);

    // Persist the authenticated user so we can detect future switches
    await AsyncStorage.setItem(SYNC_USER_KEY, userId);
  } catch {
    // Network unavailable — stay offline
  } finally {
    _isSyncing = false;
  }
}

// ─── Trips ────────────────────────────────────────────────────────────────────

async function syncTrips({ uploadLocal }: { uploadLocal: boolean }): Promise<void> {
  try {
    const [localTrips, { trips: serverTrips }] = await Promise.all([
      getTrips(),
      syncApi.getTrips(),
    ]);

    // Write all server trips into local storage (server wins on conflict)
    for (const st of serverTrips as Trip[]) {
      await saveTrip(st);
    }

    if (uploadLocal) {
      // Upload trips that exist locally but not on the server
      const serverIds = new Set((serverTrips as Trip[]).map(t => t.id));
      const localOnly = localTrips.filter(t => !serverIds.has(t.id));
      if (localOnly.length > 0) {
        await syncApi.postTrips(localOnly);
      }
    }
  } catch {
    // no-op
  }
}

export async function uploadTrip(trip: Trip): Promise<void> {
  try { await syncApi.postTrips([trip]); } catch { /* no-op */ }
}

export async function deleteCloudTrip(id: string): Promise<void> {
  try { await syncApi.deleteTrip(id); } catch { /* no-op */ }
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────

async function syncVehicles({ uploadLocal }: { uploadLocal: boolean }): Promise<void> {
  try {
    const [localVehicles, { vehicles: serverVehicles }] = await Promise.all([
      getVehicles(),
      syncApi.getVehicles(),
    ]);

    for (const sv of serverVehicles as Vehicle[]) {
      await saveVehicle(sv);
    }

    if (uploadLocal) {
      const serverIds = new Set((serverVehicles as Vehicle[]).map(v => v.id));
      const localOnly = localVehicles.filter(v => !serverIds.has(v.id));
      if (localOnly.length > 0) {
        await syncApi.postVehicles(localOnly);
      }
    }
  } catch {
    // no-op
  }
}

export async function uploadVehicle(vehicle: Vehicle): Promise<void> {
  try { await syncApi.postVehicles([vehicle]); } catch { /* no-op */ }
}

export async function deleteCloudVehicle(id: string): Promise<void> {
  try { await syncApi.deleteVehicle(id); } catch { /* no-op */ }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

async function syncSettings({ uploadLocal }: { uploadLocal: boolean }): Promise<void> {
  try {
    const [localSettings, { settings: serverSettings }] = await Promise.all([
      getSettings(),
      syncApi.getSettings(),
    ]);

    if (serverSettings) {
      // Server wins: merge server settings over local
      await saveSettings({ ...localSettings, ...(serverSettings as Partial<Settings>) });
    } else if (uploadLocal) {
      // No server settings yet — upload local
      await syncApi.putSettings(localSettings);
    }
  } catch {
    // no-op
  }
}

export async function uploadSettings(settings: Settings): Promise<void> {
  try { await syncApi.putSettings(settings); } catch { /* no-op */ }
}
