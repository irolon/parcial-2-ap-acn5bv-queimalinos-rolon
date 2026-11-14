/** Nombre comparable: sin tildes, en minúsculas y con los espacios colapsados. */
export function normalizeName(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** El ejercicio de `library` con el mismo nombre normalizado (sin contar `ignoreId`) o `null`. */
export function findSameName(library, name, ignoreId = null) {
  const target = normalizeName(name);
  if (!target || !library) return null;
  return library.find((e) => e.id !== ignoreId && normalizeName(e.name) === target) ?? null;
}
