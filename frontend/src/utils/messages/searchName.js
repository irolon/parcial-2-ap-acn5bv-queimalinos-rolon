/** Minúsculas y sin acentos, para comparar nombres. */
export const normalizeText = (text) =>
  (text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();

/** Filtra por nombre (`item.student.name`) sin importar mayúsculas ni acentos. Búsqueda vacía: todo. */
export function filterByStudentName(conversations, query) {
  const needle = normalizeText(query);
  if (!needle) return conversations;
  return conversations.filter((c) => normalizeText(c.student.name).includes(needle));
}
