import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import {
  validateChallengeIdParam,
  validateCreateChallenge,
  validateUpdateChallenge,
  validateListChallengesQuery,
  validateBatchAssign,
} from '../../validations/gamification/challenges.validation.js';
import * as controller from '../../controllers/gamification/challenges.controller.js';

// Montado en /challenges. Alta, edición, baja y asignación en lote: solo trainer.
const router = Router();
const trainerOnly = [authenticate, requireRole('trainer')];

router.get(
  '/',
  authenticate,
  requireRole('trainer', 'student'),
  validate(validateListChallengesQuery, 'query'),
  controller.list
);
router.post('/', ...trainerOnly, validate(validateCreateChallenge), controller.create);
router.patch(
  '/:id',
  ...trainerOnly,
  validate(validateChallengeIdParam, 'params'),
  validate(validateUpdateChallenge),
  controller.update
);
router.delete('/:id', ...trainerOnly, validate(validateChallengeIdParam, 'params'), controller.remove);
router.get(
  '/:id/active-students',
  ...trainerOnly,
  validate(validateChallengeIdParam, 'params'),
  controller.activeStudents
);
router.post(
  '/:id/assignments',
  ...trainerOnly,
  validate(validateChallengeIdParam, 'params'),
  validate(validateBatchAssign),
  controller.assignMany
);

export default router;
