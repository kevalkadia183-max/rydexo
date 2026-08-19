import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { logger } from '../lib/logger.js';

// ── Secret validation at startup ──────────────────────────────────────────────
// In production SESSION_SECRET must be set; missing it would let anyone forge
// tokens. In development we fall back to a per-process random secret so the
// server is still usable, but we log a visible warning.

let JWT_SECRET: string;

if (process.env.SESSION_SECRET) {
  JWT_SECRET = process.env.SESSION_SECRET;
} else if (process.env.NODE_ENV === 'production') {
  throw new Error(
    '[auth] SESSION_SECRET is not set. ' +
    'Set it via the environment secrets panel before deploying.'
  );
} else {
  // Development only: random per-process secret (cannot be guessed externally)
  JWT_SECRET = randomBytes(48).toString('hex');
  logger.warn(
    '[auth] SESSION_SECRET not set — using a random per-process secret. ' +
    'Tokens will be invalidated on every server restart. ' +
    'Set SESSION_SECRET to persist sessions across restarts.'
  );
}

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}
