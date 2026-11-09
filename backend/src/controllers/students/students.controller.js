import { asyncHandler } from '../../shared/utils/async/asyncHandler.js';
import * as studentsService from '../../services/students/students.service.js';
import * as attendanceService from '../../services/students/attendance.service.js';
import * as overviewService from '../../services/students/overview.service.js';
import * as passwordService from '../../services/auth/password.service.js';

/** GET /students — lista los alumnos del trainer. 200 → { data, meta } */
export const list = asyncHandler(async (req, res) => {
  const result = await studentsService.list(req.user.id, req.query);
  res.json(result);
});

/**
 * POST /students — alta del alumno desde el token de invitación (público).
 * 201 → { student, token, refresh_token }
 */
export const registerFromInvitation = asyncHandler(async (req, res) => {
  const result = await studentsService.registerFromInvitation(req.body);
  res.status(201).json(result);
});

/** GET /students/:id — ficha completa (trainer dueño o el propio alumno). */
export const getById = asyncHandler(async (req, res) => {
  const data = await studentsService.getById(req.user, req.params.id);
  res.json({ data });
});

/** PATCH /students/:id — edita o da de baja al alumno (solo trainer dueño). */
export const update = asyncHandler(async (req, res) => {
  const data = await studentsService.update(req.user, req.params.id, req.body);
  res.json({ data });
});

/** GET /students/:id/attendance?month=YYYY-MM — resumen y asistencia del mes (trainer dueño o el propio alumno). */
export const attendance = asyncHandler(async (req, res) => {
  const data = await attendanceService.attendance(req.user, req.params.id, req.query.month);
  res.json({ data });
});

/** GET /students/overview — Inicio del entrenador: KPIs, requieren atención y actividad reciente. */
export const overview = asyncHandler(async (req, res) => {
  const data = await overviewService.overview(req.user.id);
  res.json({ data });
});

/**
 * POST /students/:id/password-reset — el PT dueño blanquea la clave del alumno.
 * 200 → { temporary_password } (se muestra una sola vez; solo se guarda el hash).
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const result = await passwordService.resetStudentPassword(req.user, req.params.id);
  res.json(result);
});
