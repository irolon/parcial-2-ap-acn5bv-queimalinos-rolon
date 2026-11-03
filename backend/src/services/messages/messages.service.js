import { randomUUID } from 'node:crypto';
import { Errors } from '../../shared/utils/errors.js';
import { detectImageType } from '../../shared/utils/files/image-type.js';
import { assertCanAccessStudent } from '../students/student-access.service.js';
import * as messagesRepo from '../../repositories/messages/messages.repository.js';
import * as imagesRepo from '../../repositories/messages/message-images.repository.js';
import * as studentsRepo from '../../repositories/students/students.repository.js';
import * as authRepo from '../../repositories/auth/auth.repository.js';
import { SENDER_ROLES, toMessage, toPublicPerson } from '../../models/messages/message.model.js';
import { onMessageSent } from '../notifications/message-triggers.service.js';
import { runInBackground } from '../../shared/utils/background.js';

const otherRole = (role) => (role === SENDER_ROLES.TRAINER ? SENDER_ROLES.STUDENT : SENDER_ROLES.TRAINER);

/** Con quién habla el usuario: el PT ve al alumno; el alumno, a su PT. */
async function counterpartOf(user, student) {
  if (user.role === SENDER_ROLES.TRAINER) return toPublicPerson(student);
  return toPublicPerson(await authRepo.findTrainerById(student.trainer_id));
}

/**
 * Firma best-effort → Map<path, url>. Si Storage falla no se responde 500: en el historial, el resto
 * de la conversación carga igual; en el envío, el mensaje ya guardado no se duplica al reintentar.
 * Las fotos quedan con `image_url: null` y se loguea; se firman en el próximo historial.
 */
async function signBestEffort(paths) {
  try {
    return await imagesRepo.signUrls(paths);
  } catch (err) {
    console.error('No se pudieron firmar las fotos de los mensajes:', err.message);
    return new Map();
  }
}

/** Historial paginado por cursor, en orden cronológico, con las fotos ya firmadas. */
export async function history(user, studentId, { before, limit }) {
  const student = await assertCanAccessStudent(user, studentId);
  const rows = await messagesRepo.findPage(studentId, { before, limit });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const urls = await signBestEffort(page.filter((r) => r.image_path).map((r) => r.image_path));
  return {
    data: page.map((r) => toMessage(r, urls.get(r.image_path))).reverse(),
    // page viene de más nuevo a más viejo: el último es el más viejo de la página.
    meta: { next_before: hasMore ? page[page.length - 1].created_at : null },
    counterpart: await counterpartOf(user, student),
  };
}

/** Sube la foto (tipo real por firma, nunca el Content-Type del cliente) y devuelve su path. */
async function storeImage(studentId, file) {
  const type = detectImageType(file.buffer);
  if (!type) throw Errors.imageTypeInvalid();
  const path = `${studentId}/${randomUUID()}.${type.ext}`;
  await imagesRepo.uploadImage(path, file.buffer, type.mime);
  return path;
}

/** Envía texto y/o una foto. El `sender_role` es siempre el del usuario autenticado. */
export async function send(user, studentId, { body, file }) {
  const student = await assertCanAccessStudent(user, studentId);
  // Al dado de baja no se le escribe (ni el PT ni el alumno); leer el historial sigue permitido.
  if (!student.active) throw Errors.studentInactive();
  if (!body && !file) throw Errors.messageEmpty();
  // El tipo se valida antes de tocar Storage: un archivo falso no sube nada.
  const imagePath = file ? await storeImage(studentId, file) : null;
  let row;
  try {
    row = await messagesRepo.insertMessage({
      student_id: studentId,
      sender_role: user.role,
      body: body || null,
      image_path: imagePath,
    });
  } catch (err) {
    // Best-effort: si no se puede borrar, queda un archivo huérfano, no se pierde el error original.
    if (imagePath) await imagesRepo.removeImage(imagePath).catch(() => {});
    throw err;
  }
  // Push al otro lado sin esperarlo (best-effort): nunca demora ni rompe el envío.
  runInBackground('messages push', () =>
    onMessageSent({ student, senderRole: user.role, body: row.body ?? null, hasImage: Boolean(imagePath) })
  );
  const urls = imagePath ? await signBestEffort([imagePath]) : new Map();
  return toMessage(row, urls.get(imagePath));
}

/** Marca leídos solo los mensajes del otro rol. */
export async function markRead(user, studentId) {
  await assertCanAccessStudent(user, studentId);
  return { updated: await messagesRepo.markRead(studentId, otherRole(user.role)) };
}

/** Sin leer del usuario: el PT, los de sus alumnos activos; el alumno, los de su PT. */
export async function unreadCount(user) {
  if (user.role === SENDER_ROLES.STUDENT) {
    return { count: await messagesRepo.countUnread({ studentIds: [user.id], senderRole: SENDER_ROLES.TRAINER }) };
  }
  const students = await studentsRepo.findActiveStudentsByTrainer(user.id);
  const studentIds = students.map((s) => s.id);
  return { count: await messagesRepo.countUnread({ studentIds, senderRole: SENDER_ROLES.STUDENT }) };
}
