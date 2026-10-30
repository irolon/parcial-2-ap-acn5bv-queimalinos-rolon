import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';import { NOTIFICATIONS_TABLE, NOTIFICATION_COLUMNS } from '../../models/notifications/notification.model.js';

export async function insert(fields) {
  return unwrap(await supabase.from(NOTIFICATIONS_TABLE).insert(fields).select(NOTIFICATION_COLUMNS).single());
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
