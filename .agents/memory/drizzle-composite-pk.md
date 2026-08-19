---
name: Drizzle composite PK ownership
description: Use composite primary key (clientId, userId) for user-owned records so upserts are scoped per user and cannot cross account boundaries.
---

## Rule
When client-generated IDs are used as primary keys for user-owned data (trips, vehicles), a global text PK lets any authenticated user's upsert overwrite another user's row if IDs collide. Use a composite primary key `(id, userId)` instead; `onConflictDoUpdate` with `target: [table.id, table.userId]` then only fires when the same user upserts the same record.

**Why:** An `onConflictDoUpdate` conflict target of just `trips.id` means any user who knows another user's trip ID can overwrite it. Scoping the conflict to `(id, userId)` makes the combination the uniqueness unit — collisions between different users simply insert a new row.

**How to apply:**
- In `lib/db/src/schema/index.ts`, define the PK via the table's second argument: `(t) => [primaryKey({ columns: [t.id, t.userId] })]`
- In sync routes, use `target: [trips.id, trips.userId]` in `onConflictDoUpdate`
- Also: `req.params.id` in Express types as `string | string[]` — cast with `String(req.params.id)` before passing to `eq()` in drizzle queries
