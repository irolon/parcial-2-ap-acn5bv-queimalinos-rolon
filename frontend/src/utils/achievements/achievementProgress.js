import { plural } from '@/utils/shared/plural';

// La unidad del avance según el tipo de criterio del logro: [singular, plural].
const UNITS = {
  sessions_count: ['sesión', 'sesiones'],
  streak: ['día', 'días'],
  pr_count: ['récord', 'récords'],
  full_week: ['semana completa', 'semanas completas'],
};

/**
 * El avance de un logro bloqueado: "7/10 sesiones", "3/7 días", "1/5 récords" o "2/4 semanas completas" (la unidad
 * concuerda con el objetivo: "0/1 sesión"). El logro de desafío no se mide: "Se gana con un desafío". Un tipo
 * desconocido, o un logro sin criterio, da `null` (el backend lo deja en 0/1, que no le dice nada al alumno).
 */
export function progressLabel({ criteria_type: type, current, target }) {
  if (type === 'challenge') return 'Se gana con un desafío';
  const unit = UNITS[type];
  return unit ? `${current}/${plural(target, unit[0], unit[1])}` : null;
}

const closeness = ({ current, target }) => (target > 0 ? current / target : 0);

/**
 * Parte el progreso de logros (`achievements` de `GET /students/:id/achievements/progress`, en el orden del catálogo):
 * - `unlocked`: los que ya tiene, del más nuevo al más viejo y con la forma `{ id, unlocked_at, achievement }` que lee
 *   `AchievementList`;
 * - `locked`: los que faltan, del más cerca al más lejos de su objetivo (como el celular) y, a igual avance, en el
 *   orden del catálogo. Los que no avanzaron, el de desafío incluido, quedan al final.
 * No modifica la lista que recibe.
 */
export function splitAchievements(items) {
  const unlocked = items
    .filter((item) => item.unlocked_at)
    .sort((a, b) => Date.parse(b.unlocked_at) - Date.parse(a.unlocked_at))
    .map(({ id, unlocked_at: unlockedAt, ...achievement }) => ({ id, unlocked_at: unlockedAt, achievement }));
  const locked = items.filter((item) => !item.unlocked_at).sort((a, b) => closeness(b) - closeness(a));
  return { unlocked, locked };
}
