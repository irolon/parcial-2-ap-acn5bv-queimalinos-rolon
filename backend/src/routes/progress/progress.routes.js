import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import {
  validateExerciseProgressParams,
  validateExerciseProgressQuery,
  validateBodyProgressParams,
  validateProgressOverviewQuery,
} from '../../validations/progress/progress.validation.js';
import * as progressController from '../../controllers/progress/progress.controller.js';

const router = Router();

// Trainer dueño o el propio alumno: el ownership se valida en el service.
router.use(authenticate, requireRole('trainer', 'student'));

router.get('/overview', validate(validateProgressOverviewQuery, 'query'), progressController.overview);
router.get(
  '/exercise/:exerciseId',
  validate(validateExerciseProgressParams, 'params'),
  validate(validateExerciseProgressQuery, 'query'),
  progressController.exerciseProgress
);
router.get(
  '/body/:studentId',
  validate(validateBodyProgressParams, 'params'),
  progressController.bodyProgress
);

export default router;
