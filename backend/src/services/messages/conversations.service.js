import * as studentsRepo from '../../repositories/students/students.repository.js';
import * as messagesRepo from '../../repositories/messages/messages.repository.js';

/**
 * Conversaciones del PT (solo alumnos activos): primero las que tienen mensajes, por
 * último mensaje desc; después las vacías, por nombre.
 */
export async function listConversations(trainerId) {
  const students = await studentsRepo.findActiveStudentsByTrainer(trainerId);
  const ids = students.map((s) => s.id);
  const [lasts, unread] = await Promise.all([
    messagesRepo.findLastByStudents(ids),
    messagesRepo.countUnreadByStudents(ids, 'student'),
  ]);
  const items = students.map((s) => {
    const last = lasts.get(s.id);
    return {
      student: { id: s.id, name: s.name, avatar_url: s.avatar_url ?? null },
      last_message: last
        ? {
            body: last.body ?? null,
            has_image: Boolean(last.image_path),
            sender_role: last.sender_role,
            created_at: last.created_at,
          }
        : null,
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
