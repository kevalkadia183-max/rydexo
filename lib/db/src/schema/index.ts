import { pgTable, text, timestamp, jsonb, uuid, primaryKey } from 'drizzle-orm/pg-core';

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ─── Trips ────────────────────────────────────────────────────────────────────
// Composite primary key (id, userId) so each user's trip IDs are independent:
// two different users can have the same client-generated ID without collision,
// and a user can only upsert records they own.

export const trips = pgTable('trips', {
  id: text('id').notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  primaryKey({ columns: [t.id, t.userId] }),
]);

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export const vehicles = pgTable('vehicles', {
  id: text('id').notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  primaryKey({ columns: [t.id, t.userId] }),
]);

// ─── User Settings ─────────────────────────────────────────────────────────────

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
