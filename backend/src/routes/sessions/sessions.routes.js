import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import {
  validateCreateSession,
  validateUpdateSession,
  validateSessionIdParam,
} from '../../validations/sessions/sessions.validation.js';
import { validateSetsEnvelope } from '../../validations/sessions/session-set.validation.js';
import { validateCommentBody } from '../../validations/sessions/session-history.validation.js';
import * as historyController from '../../controllers/sessions/session-history.controller.js';
import * as sessionsController from '../../controllers/sessions/sessions.controller.js';

const router = Router();

// Autenticación global; el rol va por ruta (el alumno entrena, el entrenador
// comenta). La propiedad de cada sesión se valida en el service.
router.use(authenticate);

router.post(
  '/',
  requireRole('student'),
  validate(validateCreateSession),
  sessionsController.create
);
router.patch(
  '/:id',
  requireRole('student'),
  validate(validateSessionIdParam, 'params'),
  validate(validateUpdateSession),
  sessionsController.update
);
router.post(
  '/:id/sets',
  requireRole('student'),
  validate(validateSessionIdParam, 'params'),
  validate(validateSetsEnvelope),
  sessionsController.addSets
);
router.patch(
  '/:id/comment',
  requireRole('trainer'),
  validate(validateSessionIdParam, 'params'),
  validate(validateCommentBody),
  historyController.comment
);

export default router;
