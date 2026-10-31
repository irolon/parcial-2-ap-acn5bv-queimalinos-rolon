import { assertCanAccessStudent } from '../students/student-access.service.js';
import * as gamificationRepo from '../../repositories/gamification/gamification.repository.js';
import { evaluateStudent } from './evaluate.service.js';

/** Catálogo de logros (cualquier usuario autenticado). */
export const listCatalog = () => gamificationRepo.findCatalog();

/** Logros desbloqueados del alumno, el más reciente primero. */
export async function listStudentAchievements(user, studentId) {
  await assertCanAccessStudent(user, studentId);
  return gamificationRepo.findStudentAchievements(studentId);
}

/** Forma pública de la racha (la usa también el endpoint de progreso). */
export const toStreakView = (row) => ({
  current_streak_days: row.current_days,
  longest_streak_days: row.longest_days,
  last_session_date: row.last_trained_date,
});

/** Racha guardada del alumno; si no hay fila, se evalúa (lo que la persiste). */
export async function getStreak(user, studentId) {
  await assertCanAccessStudent(user, studentId);
  const stored = await gamificationRepo.findStreak(studentId);
  if (stored) return toStreakView(stored);
  const { streak } = await evaluateStudent(studentId);
  return toStreakView(streak);
}
