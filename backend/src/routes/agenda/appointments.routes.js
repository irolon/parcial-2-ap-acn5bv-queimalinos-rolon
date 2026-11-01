import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { LIST_MAX_DAYS } from '../../models/agenda/appointment.model.js';
import { validateRangeQuery } from '../../validations/agenda/availability.validation.js';
import {
  validateStudentRequest,
  validateTrainerCreate,
  validateStatusPatch,
  validateIdParam,
} from '../../validations/agenda/appointments.validation.js';
import * as controller from '../../controllers/agenda/appointments.controller.js';

// Montado en /appointments.
const router = Router();
const guards = [authenticate, requireRole('trainer', 'student')];

/** El body del POST depende del rol: el PT manda student_id, el alumno no. */
const validateCreateByRole = (req, res, next) =>
  validate(req.user.role === 'trainer' ? validateTrainerCreate : validateStudentRequest)(req, res, next);

router.get('/', ...guards, validate((query) => validateRangeQuery(query, LIST_MAX_DAYS), 'query'), controller.list);
router.post('/', ...guards, validateCreateByRole, controller.create);
router.patch(
  '/:id',
  ...guards,
  validate(validateIdParam, 'params'),
  validate(validateStatusPatch),
  controller.changeStatus
);

export default router;
