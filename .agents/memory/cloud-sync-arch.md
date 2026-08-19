---
name: Cloud sync architecture
description: Offline-first sync pattern — how contexts, cloudSync service, and CloudSyncManager fit together so restored data is visible immediately after sign-in.
---

## Rule
Local AsyncStorage is always written first (existing behavior preserved). Cloud sync is additive. `fullSync` writes to AsyncStorage; the `CloudSyncManager` component re-reads AsyncStorage into React state after sync completes so the UI immediately reflects downloaded data without a restart.

**Why:** Context providers load from storage at mount time. If sync writes to storage *after* providers have already loaded, React state stays stale and the UI shows empty data until restart. CloudSyncManager sits as the innermost wrapper just above the root nav, inside all data providers, watches the `isSignedIn → true` transition, runs `fullSync()`, then calls each context's `refreshXXX()` method.

**How to apply:**
- `CloudSyncManager` must be placed inside `TripProvider > VehicleProvider > AppProvider > AuthProvider` in the tree (i.e. innermost, so it has access to all context methods).
- Each data context must expose a `refreshXXX()` that re-reads AsyncStorage (`refreshTrips`, `refreshVehicles`, `refreshSettings`).
- On native builds, `EXPO_PUBLIC_API_BASE_URL` must be set to the full API server URL; on web (same-origin), relative paths work automatically. Missing URL emits a console warning but does not block — the fetch fails naturally and cloudSync catches it silently.
