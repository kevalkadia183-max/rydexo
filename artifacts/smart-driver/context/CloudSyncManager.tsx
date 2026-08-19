/**
 * CloudSyncManager — sits inside all data contexts and drives the sync cycle.
 *
 * On sign-in transition:
 *   1. Run fullSync(userId) — account-isolated: clears stale data if the
 *      userId differs from the last synced user, preventing cross-account leaks.
 *   2. Refresh every context from AsyncStorage so the UI immediately reflects
 *      the server-restored data.
 *
 * Tree placement (see app/_layout.tsx):
 *   AuthProvider > AppProvider > VehicleProvider > TripProvider > CloudSyncManager
 */

import React, { useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useTrip } from './TripContext';
import { useVehicles } from './VehicleContext';
import { useApp } from './AppContext';
import { fullSync } from '@/services/cloudSync';

export function CloudSyncManager({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn, isLoading: authLoading } = useAuth();
  const { refreshTrips } = useTrip();
  const { refreshVehicles } = useVehicles();
  const { refreshSettings } = useApp();

  // Track the previous signed-in state to detect the sign-in transition
  const prevSignedIn = useRef<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return; // wait for auth state to resolve

    const justSignedIn =
      isSignedIn && (prevSignedIn.current === false || prevSignedIn.current === null);

    prevSignedIn.current = isSignedIn;

    if (!justSignedIn || !user) return;

    // fullSync receives the current userId so it can detect account switches
    // and clear stale data before uploading, preventing cross-account leaks.
    fullSync(user.id)
      .then(async () => {
        await Promise.all([refreshTrips(), refreshVehicles(), refreshSettings()]);
      })
      .catch(() => {
        // Network unavailable — stay with local data
      });
  }, [isSignedIn, authLoading, user]);

  return <>{children}</>;
}
