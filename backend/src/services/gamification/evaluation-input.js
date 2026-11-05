import { localDate } from '../../shared/utils/dates/dates.js';
import * as dataRepo from '../../repositories/gamification/evaluate-data.repository.js';
import { fetchSessionRecords } from '../../repositories/sessions/session-history.repository.js';

const RECORDS_CHUNK = 1000;

/** Récords de las sesiones cerradas, en lotes de hasta 1000 ids. */
async function fetchRecordPairs(studentId, sessionIds) {
  const pairs = [];
  for (let i = 0; i < sessionIds.length; i += RECORDS_CHUNK) {
    pairs.push(...(await fetchSessionRecords(studentId, sessionIds.slice(i, i + RECORDS_CHUNK))));
  }
  return pairs;
}

/**
 * Lo que necesita `buildFacts`: sesiones cerradas, días asignados, récords y el día AR de `now`.
 * La comparten la evaluación (que escribe) y el endpoint de progreso (que solo lee).
 */
export async function loadEvaluationInput(studentId, now = new Date()) {
  const [closed, assignedDays] = await Promise.all([
    dataRepo.findClosedSessions(studentId),
    dataRepo.findAssignedDays(studentId),
  ]);
  const recordPairs = closed.length ? await fetchRecordPairs(studentId, closed.map((s) => s.id)) : [];
  return { closed, assignedDays, recordPairs, today: localDate(now) };
}
