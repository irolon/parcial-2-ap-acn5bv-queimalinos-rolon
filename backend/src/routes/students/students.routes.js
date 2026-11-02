import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import {
  validateRegisterFromInvitation,
  validateListQuery,
  validateStudentIdParam,
  validateUpdateStudent,
} from '../../validations/students/students.validation.js';
import { validateAttendanceQuery } from '../../validations/students/attendance.validation.js';
import * as studentsController from '../../controllers/students/students.controller.js';
import bodyMetricsRoutes from '../body-metrics/body-metrics.routes.js';
import studentSessionsRoutes from '../sessions/student-sessions.routes.js';
import studentGamificationRoutes from '../gamification/student-gamification.routes.js';

const router = Router();

// Lista de alumnos del trainer autenticado.
router.get('/', authenticate, requireRole('trainer'), validate(validateListQuery, 'query'), studentsController.list);

// Alta del alumno desde invitación — público (lo ejecuta el alumno con su token).
router.post('/', validate(validateRegisterFromInvitation), studentsController.registerFromInvitation);

// Ficha: trainer dueño o el propio alumno (el ownership se valida en el service).
router.get(
  '/:id',
  authenticate,
  requireRole('trainer', 'student'),
  validate(validateStudentIdParam, 'params'),
  studentsController.getById
);

// Resumen y asistencia del mes: trainer dueño o el propio alumno (ownership en el service).
router.get(
  '/:id/attendance',
  authenticate,
  requireRole('trainer', 'student'),
  validate(validateStudentIdParam, 'params'),
  validate(validateAttendanceQuery, 'query'),
  studentsController.attendance
);

// Edición y baja: solo trainer (dueño, verificado en el service).
router.patch(
  '/:id',
  authenticate,
  requireRole('trainer'),
  validate(validateStudentIdParam, 'params'),
  validate(validateUpdateStudent),
  studentsController.update
);

// Medidas corporales del alumno: /students/:id/metrics.
router.use('/:id/metrics', bodyMetricsRoutes);

// Historial de sesiones del alumno: /students/:id/sessions.
router.use('/:id/sessions', studentSessionsRoutes);

// Logros y racha del alumno: /students/:id/achievements y /students/:id/streak.
router.use('/:id', studentGamificationRoutes);

export default router;
