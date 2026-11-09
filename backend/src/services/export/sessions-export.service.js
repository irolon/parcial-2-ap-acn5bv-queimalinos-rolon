import * as exportRepo from '../../repositories/export/sessions-export.repository.js';
import { assertCanAccessStudent } from '../students/student-access.service.js';
import { utcToArgentina } from '../../shared/utils/dates/argentina.js';
import {
  STUDENT_HEADERS,
  TRAINER_HEADERS,
  sessionRows,
  toCsv,
} from '../../models/export/sessions-csv.js';

/*
 * Exportación de sesiones en CSV (GX1). Se arma en memoria: con los volúmenes
 * actuales (miles de series) no hace falta streaming.
 */

/** Fecha de hoy en Argentina ('AAAA-MM-DD') para el nombre del archivo. */
const todayAR = () => utcToArgentina(new Date()).date;

/**
 * Nombre del alumno apto para Content-Disposition, que tiene que ser ASCII:
 * minúsculas, sin acentos, lo que no es letra o número pasa a guion.
 */
export function slugify(name) {
  const slug = String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'alumno';
}

/**
 * GET /students/:id/export: el propio alumno o el PT dueño (ajeno o
 * inexistente → 403 de assertCanAccessStudent). El PT recibe las columnas
 * con Alumno, Email y Activo, igual que en el export de todos.
 */
export async function forStudent(user, studentId) {
  const student = await assertCanAccessStudent(user, studentId);
  const sessions = await exportRepo.findSessionsForStudents([studentId]);

  if (user.role === 'student') {
    const rows = sessions.flatMap((s) => sessionRows(s));
    return {
      filename: `fittrainer-mis-sesiones-${todayAR()}.csv`,
      csv: toCsv(STUDENT_HEADERS, rows),
    };
  }
  const rows = sessions.flatMap((s) => sessionRows(s, student));
  return {
    filename: `fittrainer-${slugify(student.name)}-${todayAR()}.csv`,
    csv: toCsv(TRAINER_HEADERS, rows),
  };
}

/**
 * GET /students/export: todos los alumnos del PT, también los dados de baja,
 * ordenados por alumno (nombre) y fecha.
 */
export async function forTrainer(user) {
  const students = await exportRepo.findTrainerStudents(user.id);
  const sessions = await exportRepo.findSessionsForStudents(students.map((s) => s.id));

  const byStudent = new Map(students.map((s) => [s.id, []]));
  for (const session of sessions) byStudent.get(session.student_id)?.push(session);
  const rows = students.flatMap((student) =>
    byStudent.get(student.id).flatMap((session) => sessionRows(session, student))
  );
  return { filename: `fittrainer-alumnos-${todayAR()}.csv`, csv: toCsv(TRAINER_HEADERS, rows) };
}
