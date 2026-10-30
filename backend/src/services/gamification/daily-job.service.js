import * as dailyRepo from '../../repositories/gamification/daily-job.repository.js';
import * as gamificationRepo from '../../repositories/gamification/gamification.repository.js';
import { evaluateStudent } from './evaluate.service.js';

/**
 * Job diario de gamificación. Primero recalcula a cada alumno activo con
 * sesiones o desafío activo (así una meta alcanzada el último día completa el
 * desafío) y recién después falla los desafíos activos ya vencidos.
 * Un alumno que falla se loguea y no corta al resto.
 * Devuelve { failedChallenges, evaluated, errors }.
 */
export async function runDailyGamification({ now = new Date() } = {}) {
  const studentIds = await dailyRepo.findStudentIdsToEvaluate();
  const catalog = await gamificationRepo.findCatalog();

  let evaluated = 0;
  let errors = 0;
  for (const studentId of studentIds) {
    try {
      await evaluateStudent(studentId, { now, catalog });
      evaluated += 1;
    } catch (err) {
      errors += 1;
      console.error(`[gamification] job diario: falló el alumno ${studentId}`, err);
    }
  }

  const failedChallenges = await dailyRepo.failExpiredAssignments(now);
  return { failedChallenges, evaluated, errors };
}
