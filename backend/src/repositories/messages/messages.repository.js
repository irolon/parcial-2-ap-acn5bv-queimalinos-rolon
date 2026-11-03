import { supabase } from '../../config/supabase.js';
import { unwrap, fetchAll } from '../../shared/utils/supabase-query.js';
import { Errors } from '../../shared/utils/errors.js';
import { MESSAGES_TABLE, MESSAGE_COLUMNS } from '../../models/messages/message.model.js';

export async function insertMessage(row) {
  return unwrap(await supabase.from(MESSAGES_TABLE).insert(row).select(MESSAGE_COLUMNS).single());
}

/** Un solo insert para el envío masivo: o entran todas las filas o ninguna. */
export async function insertMany(rows) {
  unwrap(await supabase.from(MESSAGES_TABLE).insert(rows));
}

/**
 * Página del historial, más nuevos primero; `before` es exclusivo. Pide `limit + 1`
 * filas: si vuelve una de más, hay página anterior (lo decide el service).
 */
export async function findPage(studentId, { before, limit }) {
  let query = supabase.from(MESSAGES_TABLE).select(MESSAGE_COLUMNS).eq('student_id', studentId);
  if (before) query = query.lt('created_at', before);
  return unwrap(
    await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1)
  );
}

/** Marca leídos los mensajes sin leer enviados por `senderRole`; devuelve cuántos. */
export async function markRead(studentId, senderRole) {
  const rows = unwrap(
    await supabase
      .from(MESSAGES_TABLE)
      .update({ read_at: new Date().toISOString() })
      .eq('student_id', studentId)
      .eq('sender_role', senderRole)
      .is('read_at', null)
      .select('id')
  );
  return rows.length;
}

/** Mensajes sin leer enviados por `senderRole` en las conversaciones de `studentIds`. */
export async function countUnread({ studentIds, senderRole }) {
  if (studentIds.length === 0) return 0;
  const { count, error } = await supabase
    .from(MESSAGES_TABLE)
    .select('id', { count: 'exact', head: true })
    .in('student_id', studentIds)
    .eq('sender_role', senderRole)
    .is('read_at', null);
  if (error) throw Errors.internal(error.message);
  return count ?? 0;
}

/**
 * Último mensaje de cada alumno → Map<studentId, fila>. Una consulta `limit(1)` por
 * alumno en paralelo: supabase-js no tiene "distinct on" y traer todo el historial
 * para quedarse con el primero de cada uno saldría más caro en cada poll de 15 s.
 */
export async function findLastByStudents(studentIds) {
  const rows = await Promise.all(
    studentIds.map(async (id) =>
      unwrap(
        await supabase
          .from(MESSAGES_TABLE)
          .select(MESSAGE_COLUMNS)
          .eq('student_id', id)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(1)
      )[0]
    )
  );
  return new Map(rows.filter(Boolean).map((r) => [r.student_id, r]));
}

/** Cantidad de sin leer por alumno → Map<studentId, n> (los de 0 no vienen). */
export async function countUnreadByStudents(studentIds, senderRole) {
  const counts = new Map();
  if (studentIds.length === 0) return counts;
  const rows = await fetchAll(() =>
    supabase
      .from(MESSAGES_TABLE)
      .select('student_id')
      .in('student_id', studentIds)
      .eq('sender_role', senderRole)
      .is('read_at', null)
      .order('id')
  );
  for (const { student_id: id } of rows) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}
