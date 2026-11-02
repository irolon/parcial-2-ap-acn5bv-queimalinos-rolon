/** Badge del menú: `null` si no hay no leídos, "1".."9" o "9+". */
export function badgeText(count) {
  if (!count || count < 1) return null;
  return count > 9 ? '9+' : String(count);
}
