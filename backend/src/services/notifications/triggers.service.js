import { notify, pushOnly } from './notify.service.js';
import { texts } from '../../models/notifications/texts.js';
import { shouldPush } from '../../models/notifications/push-policy.js';
import { localDate } from '../../shared/utils/dates/dates.js';
import * as triggerData from '../../repositories/notifications/trigger-data.repository.js';
import { fetchSessionRecords } from '../../repositories/sessions/session-history.repository.js';

/** Ejecuta el disparador sin dejar escapar ningún error: nunca rompe la operación que lo origina. */
async function safely(label, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`[notifications] ${label}`, err.message);
  }
}

const uniq = (values) => [...new Set(values.filter(Boolean))];

/** El entrenador recibe un aviso la primera vez que el alumno sustituye un ejercicio en la sesión. */
export function onSessionModified({ studentId, session, substitutions }) {
  return safely('routine_modified', async () => {
    if (!substitutions?.length) return;
    const student = await triggerData.findStudentInfo(studentId);
    if (!student?.trainer_id) return;
    if (await triggerData.existsForSession('routine_modified', student.trainer_id, session.id)) return;

    const names = await triggerData.findExerciseNames(uniq(substitutions.flatMap((s) => [s.from, s.to])));
    const named = substitutions.map((s) => ({ from: names.get(s.from) ?? '?', to: names.get(s.to) ?? '?' }));
    const { title, body } = texts.routineModified({
      studentName: student.name,
      date: localDate(session.started_at),
      substitutions: named,
    });
    await notify({
      userId: student.trainer_id,
      userRole: 'trainer',
      type: 'routine_modified',
      title,
      body,
      data: { student_id: studentId, session_id: session.id },
      push: shouldPush('routine_modified', 'trainer'),
    });
  });
}

/** Récords de la sesión: un aviso por sesión (push al alumno, solo fila al entrenador). */
async function notifyRecords(student, session) {
  const records = await fetchSessionRecords(student.id, [session.id]);
  if (records.length === 0) return;
  if (await triggerData.existsForSession('pr', student.id, session.id)) return;

  const exerciseIds = uniq(records.map((r) => r.exercise_id));
  const names = await triggerData.findExerciseNames(exerciseIds);
  const exerciseNames = exerciseIds.map((id) => names.get(id) ?? '?');
  const meta = { student_id: student.id, session_id: session.id, exercise_ids: exerciseIds };

  const forStudent = texts.prForStudent({ exerciseNames, date: localDate(session.started_at) });
  await notify({
    userId: student.id, userRole: 'student', type: 'pr', ...forStudent, data: meta,
    push: shouldPush('pr', 'student'),
  });
  if (!student.trainer_id) return;
  const forTrainer = texts.prForTrainer({ studentName: student.name, exerciseNames });
  await notify({
    userId: student.trainer_id, userRole: 'trainer', type: 'pr', ...forTrainer, data: meta,
    push: shouldPush('pr', 'trainer'),
  });
}

/** Filas de un logro (alumno y entrenador); `pushStudent` decide si la del alumno sale como push. */
async function notifyOneAchievement(student, { code, name }, descriptions, pushStudent) {
  const meta = { student_id: student.id, achievement_code: code };
  const forStudent = texts.achievementForStudent({ name, description: descriptions.get(code) ?? null });
  await notify({
    userId: student.id, userRole: 'student', type: 'achievement', ...forStudent, data: meta,
    push: pushStudent,
  });
  if (!student.trainer_id) return;
  const forTrainer = texts.achievementForTrainer({ studentName: student.name, name });
  await notify({
    userId: student.trainer_id, userRole: 'trainer', type: 'achievement', ...forTrainer, data: meta,
    push: false,
  });
}

/** Una fila por logro para el alumno y para el entrenador; con varios, un único push resumen. */
async function notifyAchievements(student, unlocked) {
  const descriptions = await triggerData.findAchievementDescriptions(unlocked.map((a) => a.code));
  const single = unlocked.length === 1;
  const pushStudent = single && shouldPush('achievement', 'student');
  for (const achievement of unlocked) {
    await safely(`achievement ${achievement.code}`, () =>
      notifyOneAchievement(student, achievement, descriptions, pushStudent)
    );
  }
  if (!single && shouldPush('achievement', 'student')) {
    const summary = texts.achievementsSummary(unlocked.map((a) => a.name));
    await pushOnly({ userId: student.id, userRole: 'student', ...summary, data: { type: 'achievement', student_id: student.id } });
  }
}

/** Sesión cerrada: avisos de récords y de logros desbloqueados (cada parte falla por separado). */
export function onSessionClosed({ studentId, session, unlocked = [] }) {
  return safely('cierre de sesión', async () => {
    const student = await triggerData.findStudentInfo(studentId);
    if (!student) return;
    await safely('pr', () => notifyRecords(student, session));
    if (unlocked.length > 0) await safely('achievement', () => notifyAchievements(student, unlocked));
  });
}

/** El entrenador comentó la sesión: avisa al alumno solo si el comentario cambió y no está vacío. */
export function onSessionCommented({ session, studentId, previousComment, comment }) {
  return safely('comment', async () => {
    const text = comment?.trim();
    if (!text || text === (previousComment ?? '').trim()) return;
    const { title, body } = texts.comment({ date: localDate(session.started_at), comment: text });
    await notify({
      userId: studentId,
      userRole: 'student',
      type: 'comment',
      title,
      body,
      data: { session_id: session.id },
      push: shouldPush('comment', 'student'),
    });
  });
}

/**
 * Logros que desbloqueó el job nocturno: solo filas (alumno y entrenador), sin push ni resumen.
 * Nunca lanza: un logro que falla no corta a los demás.
 */
export function onAchievementsFromJob({ studentId, unlocked = [] }) {
  return safely('logros del job', async () => {
    if (unlocked.length === 0) return;
    const student = await triggerData.findStudentInfo(studentId);
    if (!student) return;
    const descriptions = await triggerData.findAchievementDescriptions(unlocked.map((a) => a.code));
    const pushStudent = shouldPush('achievement', 'student', { fromJob: true });
    for (const achievement of unlocked) {
      await safely(`achievement ${achievement.code}`, () =>
        notifyOneAchievement(student, achievement, descriptions, pushStudent)
      );
    }
  });
}

// Evento de turno → a quién avisa y con qué texto (la política de push decide si sale al celular).
const APPOINTMENT_EVENTS = {
  confirmed: { to: 'student', text: 'appointmentConfirmed' },
  cancelledByTrainer: { to: 'student', text: 'appointmentCancelled' },
  createdByTrainer: { to: 'student', text: 'appointmentCreatedByTrainer' },
  requested: { to: 'trainer', text: 'appointmentRequested' },
  cancelledByStudent: { to: 'trainer', text: 'appointmentCancelledByStudent' },
};

/**
 * Cambio en un turno (`appointment` es el turno público): avisa a la otra parte. Al alumno le llega con
 * push; al entrenador solo le queda la fila. Nunca lanza.
 */
export function onAppointmentChanged(event, appointment) {
  return safely(`appointment ${event}`, async () => {
    const { to, text } = APPOINTMENT_EVENTS[event];
    const { title, body } = texts[text]({
      studentName: appointment.student.name,
      scheduledAt: appointment.scheduled_at,
    });
    await notify({
      userId: to === 'student' ? appointment.student.id : appointment.trainer_id,
      userRole: to,
      type: 'appointment',
      title,
      body,
      data: { appointment_id: appointment.id },
      push: shouldPush('appointment', to),
    });
  });
}
