import { EQUIPMENT } from './exercise.model.js';

/**
 * Sinónimos (ya normalizados: minúsculas, sin acentos, en singular) → código del catálogo.
 * El `gym_equipment` del alumno acepta texto libre ("Agregar otro", invitaciones).
 */
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
 * Equipamiento cargado en la ficha → { codes, unmapped }: `codes` son códigos del catálogo
 * (EQUIPMENT) sin repetir; `unmapped`, los textos que no se pudieron mapear (tal como se
 * cargaron, sin repetir). Lo usan los asistentes IA (rutinas del PT y chat del alumno).
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
