import { Router } from 'express';
import { db, trips, vehicles, userSettings } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/auth.js';
import type { AuthRequest } from '../middlewares/auth.js';

export const syncRouter = Router();

// All sync routes require authentication
syncRouter.use(requireAuth);

// ─── Trips ────────────────────────────────────────────────────────────────────

// GET /api/sync/trips — fetch all trips for the authenticated user
syncRouter.get('/trips', async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(trips).where(eq(trips.userId, req.userId!));
    res.json({ trips: rows.map(r => r.data) });
  } catch (err) {
    console.error('Sync trips GET error:', err);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// POST /api/sync/trips — upsert a batch of trips
syncRouter.post('/trips', async (req: AuthRequest, res) => {
  try {
    const { trips: tripList } = req.body ?? {};
    if (!Array.isArray(tripList)) {
      res.status(400).json({ error: 'trips must be an array' });
      return;
    }

    for (const trip of tripList) {
      if (!trip?.id) continue;
      await db
        .insert(trips)
        .values({ id: trip.id, userId: req.userId!, data: trip })
        .onConflictDoUpdate({
          target: [trips.id, trips.userId],
          set: { data: trip, updatedAt: new Date() },
        });
    }
    res.json({ ok: true, count: tripList.length });
  } catch (err) {
    console.error('Sync trips POST error:', err);
    res.status(500).json({ error: 'Failed to sync trips' });
  }
});

// DELETE /api/sync/trips/:id — delete a single trip
syncRouter.delete('/trips/:id', async (req: AuthRequest, res) => {
  try {
    await db.delete(trips).where(
      and(eq(trips.id, String(req.params.id)), eq(trips.userId, req.userId!))
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Sync trip DELETE error:', err);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

// ─── Vehicles ─────────────────────────────────────────────────────────────────

// GET /api/sync/vehicles
syncRouter.get('/vehicles', async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(vehicles).where(eq(vehicles.userId, req.userId!));
    res.json({ vehicles: rows.map(r => r.data) });
  } catch (err) {
    console.error('Sync vehicles GET error:', err);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// POST /api/sync/vehicles — upsert a batch of vehicles
syncRouter.post('/vehicles', async (req: AuthRequest, res) => {
  try {
    const { vehicles: vehicleList } = req.body ?? {};
    if (!Array.isArray(vehicleList)) {
      res.status(400).json({ error: 'vehicles must be an array' });
      return;
    }

    for (const vehicle of vehicleList) {
      if (!vehicle?.id) continue;
      await db
        .insert(vehicles)
        .values({ id: vehicle.id, userId: req.userId!, data: vehicle })
        .onConflictDoUpdate({
          target: [vehicles.id, vehicles.userId],
          set: { data: vehicle, updatedAt: new Date() },
        });
    }
    res.json({ ok: true, count: vehicleList.length });
  } catch (err) {
    console.error('Sync vehicles POST error:', err);
    res.status(500).json({ error: 'Failed to sync vehicles' });
  }
});

// DELETE /api/sync/vehicles/:id
syncRouter.delete('/vehicles/:id', async (req: AuthRequest, res) => {
  try {
    await db.delete(vehicles).where(
      and(eq(vehicles.id, String(req.params.id)), eq(vehicles.userId, req.userId!))
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Sync vehicle DELETE error:', err);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

// ─── Settings ─────────────────────────────────────────────────────────────────

// GET /api/sync/settings
syncRouter.get('/settings', async (req: AuthRequest, res) => {
  try {
    const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, req.userId!));
    res.json({ settings: row?.data ?? null });
  } catch (err) {
    console.error('Sync settings GET error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/sync/settings
syncRouter.put('/settings', async (req: AuthRequest, res) => {
  try {
    const { settings } = req.body ?? {};
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'settings object required' });
      return;
    }

    await db
      .insert(userSettings)
      .values({ userId: req.userId!, data: settings })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { data: settings, updatedAt: new Date() },
      });
    res.json({ ok: true });
  } catch (err) {
    console.error('Sync settings PUT error:', err);
    res.status(500).json({ error: 'Failed to sync settings' });
  }
});
