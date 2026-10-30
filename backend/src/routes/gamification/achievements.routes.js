import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import * as achievementsController from '../../controllers/gamification/achievements.controller.js';

// Montado en /achievements: catálogo de logros.
const router = Router();

router.get('/', authenticate, requireRole('trainer', 'student'), achievementsController.catalog);

export default router;
