const MAX_PREVIEW = 60;

/** Badge del menú: `null` si no hay no leídos, "1".."9" o "9+". */
export function badgeText(count) {
  if (!count || count < 1) return null;
  return count > 9 ? '9+' : String(count);
}

/**
 * Vista previa del último mensaje en la lista de conversaciones.
 * "Vos: " si lo mandó quien mira (`isTrainer` dice quién mira); "📷 Foto" si no tiene texto; texto recortado a 60.
 */
export function previewText(lastMessage, isTrainer) {
  if (!lastMessage) return '';
  const own = lastMessage.sender_role === (isTrainer ? 'trainer' : 'student');
  const text = (lastMessage.body ?? '').replace(/\s+/g, ' ').trim();
  const shown = text.length > MAX_PREVIEW ? `${text.slice(0, MAX_PREVIEW)}…` : text;
  const content = shown || (lastMessage.has_image ? '📷 Foto' : '');
  return own ? `Vos: ${content}` : content;
}
