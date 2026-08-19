import { Router } from 'express';
import healthRouter from './health.js';
import { authRouter } from './auth.js';
import { syncRouter } from './sync.js';
import { aiRouter } from './ai.js';

const router = Router();

router.use(healthRouter);
router.use('/auth', authRouter);
router.use('/sync', syncRouter);
router.use('/ai', aiRouter);

export default router;
