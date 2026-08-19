---
name: API server JWT secret handling
description: SESSION_SECRET must be present; auth middleware fails closed in production, random per-process fallback in dev.
---

## Rule
The auth middleware (`artifacts/api-server/src/middlewares/auth.ts`) reads `SESSION_SECRET` at module load time. If absent in `NODE_ENV=production`, it throws immediately (server fails to start). In development it falls back to `randomBytes(48)` — a random secret that cannot be guessed but invalidates all tokens on restart.

**Why:** A hardcoded or well-known dev secret in production allows anyone to forge JWTs and access other users' data.

**How to apply:** `SESSION_SECRET` is already provisioned as a Replit secret in this workspace. Any new deployment must have it set before starting the API server.
