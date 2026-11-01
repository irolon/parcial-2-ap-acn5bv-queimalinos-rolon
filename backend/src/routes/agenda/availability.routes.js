import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { FREE_MAX_DAYS } from '../../models/agenda/availability.model.js';
import { validateAvailabilityBody } from '../../validations/agenda/availability.validation.js';
import { validateRangeQuery } from '../../validations/agenda/range.validation.js';
import * as controller from '../../controllers/agenda/availability.controller.js';

// Montado en /availability.
const router = Router();

// /free va antes que cualquier ruta paramétrica.
router.get(
  '/free',
  authenticate,
  requireRole('trainer', 'student'),
  validate((query) => validateRangeQuery(query, FREE_MAX_DAYS), 'query'),
  controller.free
);
router.get('/', authenticate, requireRole('trainer'), controller.list);
router.put('/', authenticate, requireRole('trainer'), validate(validateAvailabilityBody), controller.replace);

export default router;
