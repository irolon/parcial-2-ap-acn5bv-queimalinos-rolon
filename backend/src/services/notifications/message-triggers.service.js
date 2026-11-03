import { pushOnly } from './notify.service.js';
import { texts } from '../../models/notifications/texts.js';
import { shouldPush } from '../../models/notifications/push-policy.js';
import * as authRepo from '../../repositories/auth/auth.repository.js';

const TYPE = 'message';

/** Ejecuta el aviso sin dejar escapar ningún error: un push nunca rompe ni demora el mensaje. */
async function safely(label, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`[notifications] ${label}`, err.message);
  }
}

const trainerName = async (trainerId) => (await authRepo.findTrainerById(trainerId))?.name ?? null;

/** Push sin fila al alumno de la conversación (o a su PT): `data` lleva el tipo y el alumno. */
function pushMessage({ userId, userRole, studentId, senderName, body, hasImage }) {
  const { title, body: text } = texts.message({ senderName, body, hasImage });
  return pushOnly({ userId, userRole, title, body: text, data: { type: TYPE, student_id: studentId } });
}

/**
 * Mensaje nuevo en una conversación: push al otro lado (PT → alumno, alumno → su PT).
 * Solo push, sin fila en `notifications`. Nunca lanza.
 * @param {{ student: { id, name, trainer_id }, senderRole: 'trainer'|'student', body: string|null, hasImage: boolean }} input
 */
export function onMessageSent({ student, senderRole, body, hasImage }) {
  return safely(TYPE, async () => {
    if (senderRole === 'student') {
      if (!student.trainer_id || !shouldPush(TYPE, 'trainer')) return;
      await pushMessage({
        userId: student.trainer_id, userRole: 'trainer', studentId: student.id,
        senderName: student.name, body, hasImage,
      });
      return;
    }
    if (!shouldPush(TYPE, 'student')) return;
    const senderName = await trainerName(student.trainer_id);
    if (!senderName) return;
    await pushMessage({
      userId: student.id, userRole: 'student', studentId: student.id, senderName, body, hasImage,
    });
  });
}

/** Envío masivo del PT: un push por alumno, en paralelo (cada uno falla por separado). Nunca lanza. */
export function onBroadcastSent({ trainerId, studentIds, body }) {
  return safely(`${TYPE} masivo`, async () => {
    if (studentIds.length === 0 || !shouldPush(TYPE, 'student')) return;
    const senderName = await trainerName(trainerId);
    if (!senderName) return;
    await Promise.all(
      studentIds.map((id) =>
        safely(TYPE, () =>
          pushMessage({ userId: id, userRole: 'student', studentId: id, senderName, body, hasImage: false })
        )
      )
    );
  });
}
