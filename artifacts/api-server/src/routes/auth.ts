import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, users } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { requireAuth, signToken } from '../middlewares/auth.js';
import type { AuthRequest } from '../middlewares/auth.js';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail));
    if (existing.length > 0) {
      res.status(409).json({ error: 'An account with that email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(users)
      .values({ email: normalizedEmail, passwordHash })
      .returning({ id: users.id, email: users.email });

    const token = signToken(user.id);
    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me — returns the currently authenticated user
authRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, req.userId!));
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});
