import { randomBytes } from 'node:crypto';
import { addDays, atLocal } from './dates.js';
import { AVAILABILITY, PENDING_INVITATION, TRAINER } from './people.js';
import { OWN_EXERCISES, PLANS, TEMPLATES } from './plans.js';

// Escritura de la entrenadora, su biblioteca, sus plantillas y los alumnos con rutinas y medidas.

async function run(query, what) {
  const { data, error } = await query;
  if (error) throw new Error(`demo (${what}): ${error.message}`);
  return data;
}

/** Entrenadora, disponibilidad y ejercicios propios. Devuelve { trainer, exerciseIds: Map<nombre, id> }. */
export async function writeTrainer(db, { passwordHash, createdAt }) {
  const [trainer] = await run(
    db.from('trainers').insert({ ...TRAINER, password_hash: passwordHash, created_at: createdAt }).select('id, name'),
    'trainer'
  );
  await run(db.from('trainer_availability').insert(AVAILABILITY.map((a) => ({ ...a, trainer_id: trainer.id }))), 'disponibilidad');
  await run(
    db.from('exercises').insert(OWN_EXERCISES.map((e) => ({ ...e, trainer_id: trainer.id, is_global: false }))),
    'ejercicios propios'
  );
  const rows = await run(
    db.from('exercises').select('id, name').or(`is_global.eq.true,trainer_id.eq.${trainer.id}`).is('archived_at', null),
    'biblioteca'
  );
  const exerciseIds = new Map(rows.map((r) => [r.name, r.id]));
  return { trainer, exerciseIds };
}

/** Id de un ejercicio por nombre (corta si el seed de ejercicios no lo tiene). */
export function exerciseId(exerciseIds, name) {
  const id = exerciseIds.get(name);
  if (!id) throw new Error(`demo: falta el ejercicio "${name}" en la biblioteca (¿corriste seeds/exercises.sql?)`);
  return id;
}

const planExercises = (plan, exerciseIds) =>
  PLANS[plan].exercises.map((e, i) => ({
    exercise_id: exerciseId(exerciseIds, e.name),
    sets: e.sets, reps: e.reps, rest_seconds: e.rest, suggested_kg: e.baseKg || null, order: i,
  }));

/** Plantillas de la entrenadora (una marcada como generada con IA, el plan B de la demo). */
export async function writeTemplates(db, trainerId, exerciseIds) {
  const rows = TEMPLATES.map(([name, plan, days, ai]) => ({
    trainer_id: trainerId, name, goal: PLANS[plan].goal, level: PLANS[plan].level,
    frequency_per_week: days.length, generated_by_ai: ai,
    structure: { version: 1, days, exercises: planExercises(plan, exerciseIds) },
  }));
  return run(db.from('routine_templates').insert(rows).select('id, name, generated_by_ai'), 'plantillas');
}

/** Un alumno con sus rutinas (ejercicios con la carga de la última semana) y sus medidas. */
export async function writeStudent(db, s, { trainerId, passwordHash, exerciseIds, today }) {
  const from = addDays(today, -7 * s.weeks);
  const createdDate = s.createdDaysAgo === undefined ? addDays(from, -3) : addDays(today, -s.createdDaysAgo);
  const [student] = await run(
    db.from('students').insert({
      trainer_id: trainerId, name: s.name, email: s.email, password_hash: passwordHash, goal: s.goal,
      level: s.level, birth_date: s.birth_date, phone: s.phone, weekly_frequency: s.weekly_frequency,
      gym_equipment: s.gym_equipment, injuries: s.injuries, created_at: atLocal(createdDate, 10),
    }).select('id, name'),
    `alumno ${s.key}`
  );
  const routines = [];
  for (const [plan, days] of s.routines) {
    const p = PLANS[plan];
    const [routine] = await run(
      db.from('routines').insert({
        trainer_id: trainerId, student_id: student.id, name: p.name, goal: p.goal, level: p.level,
        days, created_at: atLocal(createdDate, 11),
      }).select('id'),
      `rutina ${s.key}`
    );
    const exercises = await run(
      db.from('routine_exercises').insert(p.exercises.map((e, i) => ({
        routine_id: routine.id, exercise_id: exerciseId(exerciseIds, e.name), sets: e.sets, reps: e.reps,
        rest_seconds: e.rest, suggested_kg: e.baseKg ? e.baseKg + e.stepKg * s.weeks : null, order_index: i,
      }))).select('id, exercise_id'),
      `ejercicios de rutina ${s.key}`
    );
    routines.push({ key: plan, id: routine.id, days, exercises: p.exercises,
      routineExerciseIds: new Map(exercises.map((r) => [r.exercise_id, r.id])) });
  }
  await writeMetrics(db, student.id, s, { createdDate, today });
  return { student, routines, from, createdDate };
}

/** Una medida cada 14 días, con el peso yendo del inicial al actual. */
async function writeMetrics(db, studentId, s, { createdDate, today }) {
  const [start, end, height] = s.metrics;
  const dates = [];
  for (let d = createdDate; d <= today; d = addDays(d, 14)) dates.push(d);
  const rows = dates.map((d, i) => ({
    student_id: studentId, height_cm: height, recorded_at: atLocal(d, 9),
    weight_kg: Math.round((start + ((end - start) * i) / Math.max(dates.length - 1, 1)) * 10) / 10,
  }));
  await run(db.from('body_metrics').insert(rows), `medidas ${s.key}`);
}

/** Invitación pendiente (vence en 72 h). */
export async function writeInvitation(db, trainerId, now) {
  await run(db.from('invitations').insert({
    ...PENDING_INVITATION, trainer_id: trainerId, token: randomBytes(24).toString('hex'),
    expires_at: new Date(now.getTime() + 72 * 3600000).toISOString(),
  }), 'invitación');
}
