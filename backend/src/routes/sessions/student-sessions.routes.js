import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import { validateStudentIdParam } from '../../validations/students/students.validation.js';
import {
  validateHistoryQuery,
  validateHistoryDetailParams,
} from '../../validations/sessions/session-history.validation.js';
import * as historyController from '../../controllers/sessions/session-history.controller.js';

// Montado en /students/:id/sessions. mergeParams: trae el :id del router padre.
const router = Router({ mergeParams: true });

// Trainer dueño o el propio alumno: el ownership se valida en el service.
router.use(authenticate, requireRole('trainer', 'student'));

router.get(
  '/',
  validate(validateStudentIdParam, 'params'),
  validate(validateHistoryQuery, 'query'),
  historyController.list
);
router.get(
  '/:sessionId',
  validate(validateHistoryDetailParams, 'params'),
  historyController.detail
);

export default router;
