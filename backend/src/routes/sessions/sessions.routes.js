import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import {
  validateCreateSession,
  validateUpdateSession,
  validateSessionIdParam,
} from '../../validations/sessions/sessions.validation.js';
import * as sessionsController from '../../controllers/sessions/sessions.controller.js';

const router = Router();

// Solo el alumno entrena; la propiedad de cada sesión se valida en el service.
router.use(authenticate, requireRole('student'));

router.post('/', validate(validateCreateSession), sessionsController.create);
router.patch(
  '/:id',
  validate(validateSessionIdParam, 'params'),
  validate(validateUpdateSession),
  sessionsController.update
);

export default router;
