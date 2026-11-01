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
const studentScoped = [
  authenticate,
  requireRole('trainer', 'student'),
  validate(validateStudentIdParam, 'params'),
];

router.get('/achievements', ...studentScoped, achievementsController.listForStudent);
// Progreso de cada logro del catálogo (tarjeta 15): solo lectura.
router.get('/achievements/progress', ...studentScoped, achievementsController.progress);
router.get('/streak', ...studentScoped, achievementsController.streak);

// Desafíos del alumno: listado y toma.
router.get('/challenges', ...studentScoped, challengesController.listForStudent);
router.post(
  '/challenges',
  ...studentScoped,
  validate(validateSelfAssign),
  challengesController.assignToStudent
);

export default router;
