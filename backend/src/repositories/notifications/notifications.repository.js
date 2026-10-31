import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { NOTIFICATIONS_TABLE, NOTIFICATION_COLUMNS } from '../../models/notifications/notification.model.js';

const UNIQUE_VIOLATION = '23505';

/**
 * Inserta la notificación. Devuelve null si ya existe: `pr` y `routine_modified` son únicas por
 * sesión (índice `uq_notifications_session`), y dos lotes de series en paralelo pueden intentarlo a la vez.
 */
export async function insert(fields) {
  const res = await supabase.from(NOTIFICATIONS_TABLE).insert(fields).select(NOTIFICATION_COLUMNS).single();
  if (res.error?.code === UNIQUE_VIOLATION) return null;
  return unwrap(res);
}

/** Marca la hora en que el push salió; devuelve la fila actualizada. */
export async function setPushSent(id, at) {
  return unwrap(
    await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({ push_sent_at: at })
      .eq('id', id)
      .select(NOTIFICATION_COLUMNS)
      .single()
  );
}
