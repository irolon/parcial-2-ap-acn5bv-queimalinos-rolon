import { Router } from 'express';
import { limitRate } from '../../shared/middlewares/rate-limit.middleware.js';
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
import * as exportController from '../../controllers/export/export.controller.js';
import * as avatarController from '../../controllers/students/avatar.controller.js';
import { parseImageUpload } from '../../shared/middlewares/upload.middleware.js';
import bodyMetricsRoutes from '../body-metrics/body-metrics.routes.js';
import studentSessionsRoutes from '../sessions/student-sessions.routes.js';
import studentGamificationRoutes from '../gamification/student-gamification.routes.js';

const router = Router();

// Lista de alumnos del trainer autenticado.
router.get('/', authenticate, requireRole('trainer'), validate(validateListQuery, 'query'), studentsController.list);

// Inicio del entrenador. Va ANTES de /:id: si no, "overview" se tomaría como un id.
router.get('/overview', authenticate, requireRole('trainer'), studentsController.overview);

// Exportación CSV de todos los alumnos del trainer (GX1). Va ANTES de /:id
// (si no, "export" se tomaría como un id); limitador primero.
router.get('/export', limitRate('export'), authenticate, requireRole('trainer'), exportController.exportTrainer);

// Alta del alumno desde invitación — público (lo ejecuta el alumno con su token).
router.post('/', limitRate('studentSignup'), validate(validateRegisterFromInvitation), studentsController.registerFromInvitation);

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

// Exportación CSV de un alumno (GX1): trainer dueño o el propio alumno (ownership en el service).
router.get(
  '/:id/export',
  limitRate('export'),
  authenticate,
  requireRole('trainer', 'student'),
  validate(validateStudentIdParam, 'params'),
  exportController.exportStudent
);

// Edición: trainer dueño (todo) o el propio alumno (nombre y teléfono); ownership y campos en el service.
router.patch(
  '/:id',
  authenticate,
  requireRole('trainer', 'student'),
  validate(validateStudentIdParam, 'params'),
  validate(validateUpdateStudent),
  studentsController.update
);

// Blanqueo de la clave (GX1): solo el trainer dueño (verificado en el service).
// Limitador primero; sin body: la clave temporal la genera el servidor.
router.post(
  '/:id/password-reset',
  limitRate('passwordReset'),
  authenticate,
  requireRole('trainer'),
  validate(validateStudentIdParam, 'params'),
  studentsController.resetPassword
);

// Foto de perfil (GX2): solo el propio alumno (verificado en el service). El multipart se
// parsea después de validar el id; el archivo se valida por firma en el service.
router.put(
  '/:id/avatar',
  authenticate,
  requireRole('student'),
  validate(validateStudentIdParam, 'params'),
  parseImageUpload,
  avatarController.setAvatar
);
router.delete(
  '/:id/avatar',
  authenticate,
  requireRole('student'),
  validate(validateStudentIdParam, 'params'),
  avatarController.removeAvatar
);

// Medidas corporales del alumno: /students/:id/metrics.
router.use('/:id/metrics', bodyMetricsRoutes);

// Historial de sesiones del alumno: /students/:id/sessions.
router.use('/:id/sessions', studentSessionsRoutes);

// Logros y racha del alumno: /students/:id/achievements y /students/:id/streak.
router.use('/:id', studentGamificationRoutes);

export default router;
