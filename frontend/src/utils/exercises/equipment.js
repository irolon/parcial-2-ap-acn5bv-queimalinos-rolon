import { EQUIPMENT } from './exerciseOptions';

// Misma lógica que `normalizeEquipment` del backend (models/exercises/equipment.model.js): el `gym_equipment` del
// alumno acepta texto libre ("Agregar otro", invitaciones) y la web lo tiene que llevar al catálogo antes de mandarlo.

/** Sinónimos (ya normalizados: minúsculas, sin acentos, en singular) → código del catálogo. */
const SYNONYMS = {
  mancuerna: 'dumbbell',
  barra: 'barbell',
  maquina: 'machine',
  polea: 'cable',
  'pesa rusa': 'kettlebell',
  banda: 'band',
  'banda elastica': 'band',
  elastico: 'band',
  'peso corporal': 'bodyweight',
  'sin equipamiento': 'bodyweight',
};

/** Minúsculas, sin acentos, espacios simples y cada palabra sin la "s" final del plural. */
const canonical = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word) => (word.length > 3 ? word.replace(/s$/, '') : word))
    .join(' ');

const codeFor = (key) => (EQUIPMENT.includes(key) ? key : (SYNONYMS[key] ?? null));

/**
 * Equipamiento de la ficha → `{ codes, unmapped }`: `codes` son códigos del catálogo (`EQUIPMENT`) sin repetir;
 * `unmapped`, los textos que no se pudieron mapear (tal como se cargaron, sin repetir).
 */
export function normalizeEquipment(values) {
  const codes = new Set();
  const unmapped = new Map();
  for (const value of Array.isArray(values) ? values : []) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const key = canonical(value);
    const code = codeFor(key);
    if (code) codes.add(code);
    else if (!unmapped.has(key)) unmapped.set(key, value.trim());
  }
  return { codes: [...codes], unmapped: [...unmapped.values()] };
}

/** Lo que no mapea, como lo suma el backend a las preferencias (`null` si no hay nada). */
export function extraEquipmentNote(unmapped) {
  return unmapped.length > 0 ? `Equipamiento extra del gimnasio: ${unmapped.join(', ')}` : null;
}
