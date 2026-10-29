import { Errors } from '../../shared/utils/errors.js';
import * as repo from '../../repositories/sessions/session-history.repository.js';
import * as studentsRepo from '../../repositories/students/students.repository.js';
import { assertCanAccessStudent } from '../students/student-access.service.js';
import { toSessionSummary, groupSetsByExercise } from '../../models/sessions/session-history.model.js';

const byId = (rows) => new Map(rows.map((r) => [r.id, r]));
const uniq = (values) => [...new Set(values.filter(Boolean))];

function groupBySession(sets) {
  const map = new Map();
  for (const s of sets) {
    if (!map.has(s.session_id)) map.set(s.session_id, []);
    map.get(s.session_id).push(s);
  }
  return map;
}

/** Filas de sesión + routine { id, name } | null (rutina borrada o sin rutina). */
async function withRoutines(rows) {
  const ids = uniq(rows.map((r) => r.routine_id));
  const routines = ids.length ? byId(await repo.findRoutinesByIds(ids)) : new Map();
  return rows.map((r) => ({ ...r, routine: routines.get(r.routine_id) ?? null }));
}

/** GET /students/:id/sessions — página de resúmenes, más recientes primero. */
export async function listSessions(user, studentId, { page, limit }) {
  await assertCanAccessStudent(user, studentId);
  const { data: rows, total } = await repo.findSessionsPage(studentId, { page, limit });
  const meta = { total, page, limit, total_pages: Math.ceil(total / limit) };
  if (rows.length === 0) return { data: [], meta };

  const ids = rows.map((r) => r.id);
  const [sets, records, withRoutine] = await Promise.all([
    repo.findSetsForSessions(ids),
    repo.fetchSessionRecords(studentId, ids),
    withRoutines(rows),
  ]);
  const setsBySession = groupBySession(sets);
  const recordsBySession = new Set(records.map((r) => r.session_id));
  return {
    data: withRoutine.map((r) =>
      toSessionSummary(r, { sets: setsBySession.get(r.id) ?? [], recordsBySession })
    ),
    meta,
  };
}

/** GET /students/:id/sessions/:sessionId — resumen + series agrupadas por ejercicio. */
export async function getSessionDetail(user, studentId, sessionId) {
  await assertCanAccessStudent(user, studentId);
  const row = await repo.findStudentSession(studentId, sessionId);
  if (!row) throw Errors.sessionNotFound();

  const [sets, records, [withRoutine]] = await Promise.all([
    repo.findSetsForSessions([sessionId]),
    repo.fetchSessionRecords(studentId, [sessionId]),
    withRoutines([row]),
  ]);
  const exerciseIds = uniq(sets.flatMap((s) => [s.exercise_id, s.original_exercise_id]));
  const planIds = uniq(sets.map((s) => s.routine_exercise_id));
  const [exercises, planned] = await Promise.all([
    exerciseIds.length ? repo.findExercisesByIds(exerciseIds) : [],
    planIds.length ? repo.findRoutineExercisesByIds(planIds) : [],
  ]);

  const recordsBySession = new Set(records.map((r) => r.session_id));
  return {
    ...toSessionSummary(withRoutine, { sets, recordsBySession }),
    exercises: groupSetsByExercise(sets, {
      exercisesById: byId(exercises),
      plannedByRoutineExercise: byId(planned),
      recordExerciseIds: new Set(records.map((r) => r.exercise_id)),
    }),
  };
}

/** PATCH /sessions/:id/comment — el entrenador del alumno comenta; ajena o inexistente → 404. */
export async function commentSession(user, sessionId, { trainer_comment }) {
  const row = await repo.findSessionById(sessionId);
  if (!row) throw Errors.sessionNotFound();
  const student = await studentsRepo.findStudentById(row.student_id);
  if (!student || student.trainer_id !== user.id) throw Errors.sessionNotFound();

  const updated = await repo.updateTrainerComment(sessionId, trainer_comment);
  const [sets, records, [withRoutine]] = await Promise.all([
    repo.findSetsForSessions([sessionId]),
    repo.fetchSessionRecords(row.student_id, [sessionId]),
    withRoutines([updated]),
  ]);
  return toSessionSummary(withRoutine, {
    sets,
    recordsBySession: new Set(records.map((r) => r.session_id)),
  });
}
