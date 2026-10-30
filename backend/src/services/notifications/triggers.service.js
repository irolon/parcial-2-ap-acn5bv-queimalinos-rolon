import { notify, pushOnly } from './notify.service.js';
import { texts } from '../../models/notifications/texts.js';
import { shouldPush } from '../../models/notifications/push-policy.js';
import { localDate } from '../../shared/utils/dates.js';
import * as data from '../../repositories/notifications/trigger-data.repository.js';
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
    const student = await data.findStudentInfo(studentId);
    if (!student?.trainer_id) return;
    if (await data.existsForSession('routine_modified', student.trainer_id, session.id)) return;

    const names = await data.findExerciseNames(uniq(substitutions.flatMap((s) => [s.from, s.to])));
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
  if (await data.existsForSession('pr', student.id, session.id)) return;

  const exerciseIds = uniq(records.map((r) => r.exercise_id));
  const names = await data.findExerciseNames(exerciseIds);
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

/** Una fila por logro para el alumno y para el entrenador; con varios, un único push resumen. */
async function notifyAchievements(student, unlocked) {
  const descriptions = await data.findAchievementDescriptions(unlocked.map((a) => a.code));
  const single = unlocked.length === 1;
  const pushStudent = single && shouldPush('achievement', 'student');
  for (const { code, name } of unlocked) {
    const meta = { student_id: student.id, achievement_code: code };
    const forStudent = texts.achievementForStudent({ name, description: descriptions.get(code) ?? null });
    await notify({
      userId: student.id, userRole: 'student', type: 'achievement', ...forStudent, data: meta,
      push: pushStudent,
    });
    if (!student.trainer_id) continue;
    const forTrainer = texts.achievementForTrainer({ studentName: student.name, name });
    await notify({
      userId: student.trainer_id, userRole: 'trainer', type: 'achievement', ...forTrainer, data: meta,
      push: false,
    });
  }
  if (!single && shouldPush('achievement', 'student')) {
    const summary = texts.achievementsSummary(unlocked.map((a) => a.name));
    await pushOnly({ userId: student.id, ...summary, data: { student_id: student.id } });
  }
}

/** Sesión cerrada: avisos de récords y de logros desbloqueados (cada parte falla por separado). */
export function onSessionClosed({ studentId, session, unlocked = [] }) {
  return safely('cierre de sesión', async () => {
    const student = await data.findStudentInfo(studentId);
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
