# VeloTrack

A smart driving companion app that tracks trips, scores driving behaviour, estimates fuel costs, and syncs data to the cloud so nothing is lost on reinstall.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/smart-driver run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — apply DB schema changes (run after any schema edit or on a fresh DB)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — JWT signing secret (min 32 chars; app refuses to start in production without it)

## Database provisioning

After cloning or after any change to `lib/db/src/schema/index.ts`, run:

```sh
pnpm --filter @workspace/db run push
```

This applies the current schema to the connected PostgreSQL database using `drizzle-kit push` (no separate migration files needed in development). The schema creates `users`, `trips`, `vehicles`, and `user_settings` tables.

For production deployments, run the same command against the production `DATABASE_URL` before starting the API server.

## Cloud sync (native builds)

Set `EXPO_PUBLIC_API_BASE_URL` to the full HTTPS URL of the deployed API server when building native iOS/Android binaries (e.g. `https://yourapp.replit.app`). The Expo web preview uses same-origin relative paths and works without this variable.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo + React Native (Expo Router, AsyncStorage, expo-location)
- API: Express 5, JWT auth (`jsonwebtoken` + `bcryptjs`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild

## Where things live

- `artifacts/smart-driver/` — Expo React Native app
- `artifacts/api-server/` — Express API server
- `lib/db/src/schema/index.ts` — source of truth for DB schema
- `artifacts/smart-driver/services/storage.ts` — local AsyncStorage CRUD
- `artifacts/smart-driver/services/cloudSync.ts` — cloud sync logic (account-isolated)
- `artifacts/smart-driver/context/AuthContext.tsx` — auth state + JWT persistence
- `artifacts/smart-driver/context/CloudSyncManager.tsx` — reactive sync trigger on sign-in

## Architecture decisions

- **Offline-first**: all writes go to AsyncStorage first, cloud sync is additive and fire-and-forget.
- **Account isolation**: `cloudSync.ts` tracks the last synced userId. If a different user signs in, local data is cleared before pulling from the server so one user's trips never upload to another account.
- **JWT tokens**: stored in AsyncStorage on mobile; 30-day expiry; signed with `SESSION_SECRET`.
- **Composite primary key** on trips/vehicles `(id, userId)`: client-generated IDs are scoped per user so two users cannot collide or overwrite each other's records.
- **CloudSyncManager component**: innermost wrapper above the root nav but inside all data providers; fires `fullSync` on sign-in transition, then refreshes each context so the UI reflects restored data without a restart.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/db run push` after schema changes or on a fresh database before starting the API server.
- `SESSION_SECRET` must be set before starting the API server in any shared/production environment.
- The Drizzle version in this project does not support `setWhere` in `onConflictDoUpdate`; use composite primary key on the conflict `target` array instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
