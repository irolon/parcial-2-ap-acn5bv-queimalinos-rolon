import { assertCanAccessStudent } from '../students/student-access.service.js';
import * as gamificationRepo from '../../repositories/gamification/gamification.repository.js';
import { toStreakView } from '../../models/gamification/streak.js';
import { evaluateStudent } from './evaluate.service.js';

/** Catálogo de logros (cualquier usuario autenticado). */
export const listCatalog = () => gamificationRepo.findCatalog();

/** Logros desbloqueados del alumno, el más reciente primero. */
export async function listStudentAchievements(user, studentId) {
  await assertCanAccessStudent(user, studentId);
  return gamificationRepo.findStudentAchievements(studentId);
}

/** Racha guardada del alumno; si no hay fila, se evalúa (lo que la persiste). */
export async function getStreak(user, studentId) {
  await assertCanAccessStudent(user, studentId);
  const stored = await gamificationRepo.findStreak(studentId);
  if (stored) return toStreakView(stored);
  const { streak } = await evaluateStudent(studentId);
  return toStreakView(streak);
}
