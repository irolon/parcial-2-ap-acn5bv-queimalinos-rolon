import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import {
  validateCreateRoutine,
  validateUpdateRoutine,
  validateAddExercises,
  validateUpdateRoutineExercise,
  validateRoutineExerciseParams,
  validateListQuery,
  validateIdParam,
} from '../../validations/routines/routines.validation.js';
import * as routinesController from '../../controllers/routines/routines.controller.js';

const router = Router();

router.use(authenticate);

// Rutina del día — solo alumnos. Va antes de cualquier ruta con parámetro.
router.get('/today', requireRole('student'), routinesController.today);
router.get('/mine', requireRole('student'), routinesController.mine);

// Gestión de rutinas — solo trainers.
router.get('/', requireRole('trainer'), validate(validateListQuery, 'query'), routinesController.list);
router.post('/', requireRole('trainer'), validate(validateCreateRoutine), routinesController.create);
router.get(
  '/:id',
  requireRole('trainer'),
  validate(validateIdParam, 'params'),
  routinesController.getById
);
router.patch(
  '/:id',
  requireRole('trainer'),
  validate(validateIdParam, 'params'),
  validate(validateUpdateRoutine),
  routinesController.update
);
router.post(
  '/:id/exercises',
  requireRole('trainer'),
  validate(validateIdParam, 'params'),
  validate(validateAddExercises),
  routinesController.addExercises
);
router.patch(
  '/:id/exercises/:routineExerciseId',
  requireRole('trainer'),
  validate(validateRoutineExerciseParams, 'params'),
  validate(validateUpdateRoutineExercise),
  routinesController.updateExercise
);
router.delete(
  '/:id/exercises/:routineExerciseId',
  requireRole('trainer'),
  validate(validateRoutineExerciseParams, 'params'),
  routinesController.removeExercise
);

export default router;
