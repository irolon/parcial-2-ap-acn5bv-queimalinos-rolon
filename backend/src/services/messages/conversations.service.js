import * as studentsRepo from '../../repositories/students/students.repository.js';
import * as messagesRepo from '../../repositories/messages/messages.repository.js';
import { SENDER_ROLES, toLastMessage, toPublicPerson } from '../../models/messages/message.model.js';
import { signAvatars } from '../students/avatar-urls.service.js';

/**
 * Conversaciones del PT (solo alumnos activos): primero las que tienen mensajes, por
 * último mensaje desc; después las vacías, por nombre.
 */
export async function listConversations(trainerId) {
  const students = await studentsRepo.findActiveStudentsByTrainer(trainerId);
  const ids = students.map((s) => s.id);
  // GX2: las fotos de toda la lista se firman en una llamada.
  const [lasts, unread, people] = await Promise.all([
    messagesRepo.findLastByStudents(ids),
    messagesRepo.countUnreadByStudents(ids, SENDER_ROLES.STUDENT),
    signAvatars(students.map(toPublicPerson)),
  ]);
  const items = students.map((s, i) => {
    const last = lasts.get(s.id);
    return {
      student: people[i],
      last_message: last ? toLastMessage(last) : null,
      unread_count: unread.get(s.id) ?? 0,
    };
  });
  const time = (c) => Date.parse(c.last_message.created_at);
  return items.sort((a, b) => {
    if (a.last_message && b.last_message) return time(b) - time(a);
    if (a.last_message) return -1;
    if (b.last_message) return 1;
    return a.student.name.localeCompare(b.student.name, 'es');
  });
}
