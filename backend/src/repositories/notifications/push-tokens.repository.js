import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { PUSH_TOKENS_TABLE } from '../../models/notifications/notification.model.js';

/** Tokens (strings) de todos los dispositivos del usuario (id + rol: los ids pueden repetirse entre tablas). */
export async function findTokensForUser(userId, userRole) {
  const rows = unwrap(
    await supabase.from(PUSH_TOKENS_TABLE).select('token').eq('user_id', userId).eq('user_role', userRole)
  );
  return rows.map((r) => r.token);
}

export async function tokenExists(token) {
  const rows = unwrap(await supabase.from(PUSH_TOKENS_TABLE).select('id').eq('token', token).limit(1));
  return rows.length > 0;
}

/** Registra el token o lo reasigna al usuario actual si ya existía en otro. */
export async function upsertToken(user, token, platform, now) {
  unwrap(
    await supabase.from(PUSH_TOKENS_TABLE).upsert(
      { token, user_id: user.id, user_role: user.role, platform, last_seen_at: now },
      { onConflict: 'token' }
    )
  );
}

export async function deleteTokenForUser(user, token) {
  unwrap(
    await supabase
      .from(PUSH_TOKENS_TABLE)
      .delete()
      .eq('token', token)
      .eq('user_id', user.id)
      .eq('user_role', user.role)
  );
}

export async function deleteTokens(tokens) {
  if (tokens.length === 0) return;
  unwrap(await supabase.from(PUSH_TOKENS_TABLE).delete().in('token', tokens));
}
