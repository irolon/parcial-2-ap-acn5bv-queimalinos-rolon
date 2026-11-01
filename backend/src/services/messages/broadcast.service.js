import { randomUUID } from 'node:crypto';
import { Errors } from '../../shared/utils/errors.js';
import * as studentsRepo from '../../repositories/students/students.repository.js';
import * as messagesRepo from '../../repositories/messages/messages.repository.js';
import { SENDER_ROLES } from '../../models/messages/message.model.js';

/**
 * Envío masivo del PT: una fila por alumno con el mismo broadcast_id. Si algún id no es
 * un alumno activo del PT → 403 y no se inserta nada (no se revela cuál falló).
 */
export async function broadcast(trainerId, { studentIds, body }) {
  const owned = await studentsRepo.findActiveStudentsByIds(trainerId, studentIds);
  if (owned.length !== studentIds.length) throw Errors.forbidden();
  const broadcastId = randomUUID();
  await messagesRepo.insertMany(
    studentIds.map((id) => ({
      student_id: id,
      sender_role: SENDER_ROLES.TRAINER,
      body,
      broadcast_id: broadcastId,
    }))
  );
  return { broadcast_id: broadcastId, sent: studentIds.length };
}
