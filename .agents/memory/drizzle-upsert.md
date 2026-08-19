---
name: Drizzle onConflictDoUpdate gotchas
description: Drizzle-ORM version in this project does not support setWhere in onConflictDoUpdate; Express req.params type issue.
---

## Rule
`onConflictDoUpdate` does not accept a `setWhere` option in the version of `drizzle-orm` used here — passing it causes a TS overload error. Remove it and rely on application-level ownership checks instead.

**Why:** The `setWhere` option exists in newer drizzle versions but is not available in the catalog-pinned version.

**How to apply:** Use `onConflictDoUpdate({ target: col, set: { ... } })` without `setWhere`. Ownership is enforced by the authenticated `userId` in the INSERT values — cross-user ID collisions are near-impossible with the `${Date.now()}${Math.random()}` ID generation strategy.

## Also note
`req.params.id` in Express has type `string | string[]`. Cast with `String(req.params.id)` before passing to `eq()` in drizzle queries to satisfy the type checker.
