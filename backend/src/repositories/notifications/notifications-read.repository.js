import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { Errors } from '../../shared/utils/errors.js';
import { NOTIFICATIONS_TABLE } from '../../models/notifications/notification.model.js';

const PUBLIC_COLUMNS = 'id, type, title, body, data, read, created_at';

/** Página de notificaciones del usuario, más nuevas primero; `before` es exclusivo. */
export async function findPage(user, { unreadOnly, limit, before }) {
  let query = supabase
    .from(NOTIFICATIONS_TABLE)
    .select(PUBLIC_COLUMNS)
    .eq('user_id', user.id)
    .eq('user_role', user.role);
  if (unreadOnly) query = query.eq('read', false);
  if (before) query = query.lt('created_at', before);
  return unwrap(await query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit));
}

export async function countUnread(user) {
  const { count, error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('user_role', user.role)
    .eq('read', false);
  if (error) throw Errors.internal(error.message);
  return count ?? 0;
}

/** Marca una notificación propia como leída; devuelve cuántas filas coincidieron. */
export async function markRead(user, id) {
  const rows = unwrap(
    await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('user_role', user.role)
      .select('id')
  );
  return rows.length;
}

export async function markAllRead(user) {
  unwrap(
    await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('user_role', user.role)
      .eq('read', false)
  );
}
