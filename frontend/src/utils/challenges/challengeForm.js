/** Tipos de meta del formulario, con su unidad (va en la etiqueta del valor) y su ayuda. */
export const GOAL_OPTIONS = [
  { value: 'sessions_count', label: 'Cantidad de sesiones', unit: 'sesiones', hint: 'Sesiones terminadas dentro del plazo' },
  { value: 'streak', label: 'Racha', unit: 'días', hint: 'Días seguidos entrenando, sin cortar la racha' },
  { value: 'volume', label: 'Volumen total', unit: 'kg', hint: 'Kilos levantados en total (peso × repeticiones)' },
  { value: 'weight_target', label: 'Peso objetivo', unit: 'kg', hint: 'Peso corporal al que tiene que llegar' },
];

export const DEFAULT_CHALLENGE_FORM = {
  name: '',
  goal_type: 'sessions_count',
  goal_value: '',
  duration_days: '30',
  reward: true,
  description: '',
};

export const MAX_NAME = 100;
export const MAX_DESCRIPTION = 1000;

/** Número desde el texto del input, aceptando coma decimal; `NaN` si está vacío o no es número. */
const toNumber = (text) => (String(text).trim() === '' ? NaN : Number(String(text).trim().replace(',', '.')));

/** Las mismas reglas que el backend. Devuelve `{ campo: mensaje }` (vacío si está todo bien). */
export function validateChallengeForm(values) {
  const errors = {};
  const name = values.name.trim();
  if (name.length === 0) errors.name = 'Poné un nombre';
  else if (name.length > MAX_NAME) errors.name = `Hasta ${MAX_NAME} caracteres`;

  const value = toNumber(values.goal_value);
  if (!Number.isFinite(value) || value <= 0) errors.goal_value = 'Tiene que ser un número mayor a 0';

  const days = toNumber(values.duration_days);
  if (!Number.isInteger(days) || days < 1 || days > 365) errors.duration_days = 'Entre 1 y 365 días, sin decimales';

  if (values.description.length > MAX_DESCRIPTION) errors.description = `Hasta ${MAX_DESCRIPTION} caracteres`;
  return errors;
}

/** Body del POST /challenges. `rewardId` es el id de `CHALLENGE_DONE` (sin él, sin premio). */
export function toChallengeBody(values, rewardId) {
  const description = values.description.trim();
  return {
    name: values.name.trim(),
    goal_type: values.goal_type,
    goal_value: toNumber(values.goal_value),
    duration_days: toNumber(values.duration_days),
    reward_achievement_id: values.reward && rewardId ? rewardId : null,
    description: description || null,
  };
}
