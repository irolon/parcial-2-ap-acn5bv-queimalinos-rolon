import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import { validateStudentIdParam } from '../../validations/students/students.validation.js';
import { validateSelfAssign } from '../../validations/gamification/challenges.validation.js';
import * as challengesController from '../../controllers/gamification/challenges.controller.js';
import * as achievementsController from '../../controllers/gamification/achievements.controller.js';

// Montado en /students/:id (achievements, streak). mergeParams: trae el :id del padre.
const router = Router({ mergeParams: true });

// Trainer dueño o el propio alumno: el ownership se valida en el service.
router.get(
  '/achievements',
  authenticate,
  requireRole('trainer', 'student'),
  validate(validateStudentIdParam, 'params'),
  achievementsController.listForStudent
);
router.get(
  '/streak',
  authenticate,
  requireRole('trainer', 'student'),
  validate(validateStudentIdParam, 'params'),
  achievementsController.streak
);

// Desafíos del alumno: listado y toma (trainer dueño o el propio alumno).
router.get(
  '/challenges',
  authenticate,
  requireRole('trainer', 'student'),
  validate(validateStudentIdParam, 'params'),
  challengesController.listForStudent
);
router.post(
  '/challenges',
  authenticate,
  requireRole('trainer', 'student'),
  validate(validateStudentIdParam, 'params'),
  validate(validateSelfAssign),
  challengesController.assignToStudent
);

export default router;
