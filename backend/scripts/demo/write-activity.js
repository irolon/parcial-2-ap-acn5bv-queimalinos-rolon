import { addDays, atLocal, weekdayName } from './dates.js';
import { buildSessions } from './history.js';
import { exerciseId } from './write-people.js';
import { AI_CHATS, APPOINTMENTS, CHALLENGE, MESSAGES, TRAINER_COMMENTS } from './extras.js';

// Escritura de la actividad: sesiones con series, comentarios, mensajes, asistente, turnos y desafío.

async function run(query, what) {
  const { data, error } = await query;
  if (error) throw new Error(`demo (${what}): ${error.message}`);
  return data;
}

/** Historial de sesiones de un alumno. Devuelve las sesiones insertadas (más nuevas primero). */
export async function writeHistory(db, s, { student, routines, from, today, exerciseIds }) {
  if (!s.weeks) return [];
  const stopBefore = s.stoppedDaysAgo ? addDays(today, -s.stoppedDaysAgo + 1) : undefined;
  const substitute = s.substitutes ? (_date, rng) => (rng() < 0.35 ? s.substitutes : null) : undefined;
  const built = buildSessions({ routines, from, until: today, seed: s.seed, skipRate: s.skipRate, stopBefore, substitute });
  const comments = [...(TRAINER_COMMENTS[s.key] ?? [])];
  const byRoutine = new Map(routines.map((r) => [r.key, r]));
  const inserted = [];
  for (const b of built.reverse()) {
    const routine = byRoutine.get(b.routineKey);
    const [session] = await run(db.from('sessions').insert({
      student_id: student.id, routine_id: routine.id, started_at: b.startedAt, finished_at: b.finishedAt,
      rpe: b.rpe, notes: b.notes, has_modifications: b.hasModifications, trainer_comment: comments.shift() ?? null,
    }).select('id, started_at'), `sesión ${s.key}`);
    await run(db.from('session_sets').insert(b.sets.map((x) => {
      const original = x.original ? exerciseId(exerciseIds, x.original) : null;
      return {
        session_id: session.id, exercise_id: exerciseId(exerciseIds, x.exercise), original_exercise_id: original,
        routine_exercise_id: routine.routineExerciseIds.get(original ?? exerciseId(exerciseIds, x.exercise)) ?? null,
        set_number: x.setNumber, actual_reps: x.reps, actual_kg: x.kg, completed: true,
        executed_at: x.executedAt, rest_seconds: x.rest,
      };
    })), `series ${s.key}`);
    inserted.push(session);
  }
  return inserted;
}

/** Mensajes PT ↔ alumno. */
export async function writeMessages(db, studentIds, today) {
  const rows = MESSAGES.map(([key, role, daysAgo, hour, body, read]) => {
    const createdAt = atLocal(addDays(today, -daysAgo), hour);
    return {
      student_id: studentIds.get(key), sender_role: role, body, created_at: createdAt,
      read_at: read ? new Date(Date.parse(createdAt) + 3600000).toISOString() : null,
    };
  });
  await run(db.from('messages').insert(rows), 'mensajes');
}

/** Consultas al asistente IA, dentro de la última sesión de cada alumno. */
export async function writeAiChats(db, { studentIds, lastSessions, exerciseIds }) {
  const rows = AI_CHATS.flatMap(([key, exercise, question, answer], i) => {
    const session = lastSessions.get(key);
    if (!session) return [];
    const at = Date.parse(session.started_at) + (10 + i * 7) * 60000;
    const base = { session_id: session.id, student_id: studentIds.get(key), exercise_id: exerciseId(exerciseIds, exercise) };
    return [
      { ...base, role: 'user', content: question, created_at: new Date(at).toISOString() },
      { ...base, role: 'assistant', content: answer, created_at: new Date(at + 7000).toISOString() },
    ];
  });
  await run(db.from('chat_messages').insert(rows), 'asistente');
}

/** Corre una fecha al día hábil más cercano (adelante si es futura, atrás si es pasada). */
function weekday(date, forward) {
  let d = date;
  while (['saturday', 'sunday'].includes(weekdayName(d))) d = addDays(d, forward ? 1 : -1);
  return d;
}

/** Turnos pendientes, confirmados y uno cancelado. */
export async function writeAppointments(db, { trainerId, studentIds, today }) {
  const rows = APPOINTMENTS.map(([key, inDays, hour, status, notes]) => ({
    trainer_id: trainerId, student_id: studentIds.get(key), status, notes,
    scheduled_at: atLocal(weekday(addDays(today, inDays), inDays >= 0), hour),
  }));
  await run(db.from('appointments').insert(rows), 'turnos');
}

/** Desafío propio, asignado a varios alumnos (el progreso lo calcula el evaluador). */
export async function writeChallenge(db, { trainerId, studentIds, now }) {
  const { students, startedDaysAgo, ...fields } = CHALLENGE;
  const [challenge] = await run(db.from('challenges').insert({ ...fields, trainer_id: trainerId }).select('id'), 'desafío');
  const started = new Date(now.getTime() - startedDaysAgo * 86400000);
  const ends = new Date(started.getTime() + fields.duration_days * 86400000);
  await run(db.from('student_challenges').insert(students.map((key) => ({
    student_id: studentIds.get(key), challenge_id: challenge.id,
    started_at: started.toISOString(), ends_at: ends.toISOString(),
  }))), 'desafío asignado');
}
