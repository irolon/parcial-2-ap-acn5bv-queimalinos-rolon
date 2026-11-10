import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { CHAT_MESSAGES_TABLE, CHAT_MESSAGE_COLUMNS, CHAT_SAVED_COLUMNS } from '../../models/chat/chat-message.model.js';

/**
 * Mensajes del alumno con created_at en [fromIso, toIso), más viejos primero. El par se
 * inserta junto con el mismo created_at (el instante de la consulta), así que a igual
 * instante va primero el del alumno ('user' > 'assistant' en orden descendente).
 */
export async function findDayMessages(studentId, fromIso, toIso) {
  return unwrap(
    await supabase
      .from(CHAT_MESSAGES_TABLE)
      .select(CHAT_MESSAGE_COLUMNS)
      .eq('student_id', studentId)
      .gte('created_at', fromIso)
      .lt('created_at', toIso)
      .order('created_at', { ascending: true })
      .order('role', { ascending: false })
  );
}

/**
 * Mensajes del alumno con created_at anterior a `beforeIso`, de los más nuevos a los más viejos y como mucho `limit`.
 * A igual instante va primero la respuesta: al dar vuelta cada día, la consulta queda antes.
 */
export async function findMessagesBefore(studentId, beforeIso, limit) {
  return unwrap(
    await supabase
      .from(CHAT_MESSAGES_TABLE)
      .select(CHAT_MESSAGE_COLUMNS)
      .eq('student_id', studentId)
      .lt('created_at', beforeIso)
      .order('created_at', { ascending: false })
      .order('role', { ascending: true })
      .limit(limit)
  );
}

/** El mensaje del alumno y la respuesta del asistente en una sola inserción (o quedan los dos o ninguno). */
export async function insertExchange(rows) {
  return unwrap(await supabase.from(CHAT_MESSAGES_TABLE).insert(rows).select(CHAT_SAVED_COLUMNS));
}
