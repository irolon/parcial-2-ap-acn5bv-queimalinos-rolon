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

// "1234", "1.234", "10.000,5", "72,5": puntos de miles (grupos de 3) y coma decimal, como se escribe en es-AR.
const AR_NUMBER = /^(\d+|\d{1,3}(\.\d{3})+)(,\d+)?$/;
const INTEGER_GOALS = ['sessions_count', 'streak'];
// "72.5": punto decimal (no son miles, que van de a 3 cifras). Se avisa que va con coma en vez de "mayor a 0".
const DOT_DECIMAL = /^\d+\.\d+$/;

/** Número desde el texto del input en es-AR (`10.000` = 10000, `72,5` = 72.5); `NaN` si está vacío o no es válido. */
export function toNumber(text) {
  const clean = String(text).trim();
  return AR_NUMBER.test(clean) ? Number(clean.replaceAll('.', '').replace(',', '.')) : NaN;
}

/** Las mismas reglas que el backend. Devuelve `{ campo: mensaje }` (vacío si está todo bien). */
export function validateChallengeForm(values) {
  const errors = {};
  const name = values.name.trim();
  if (name.length === 0) errors.name = 'Poné un nombre';
  else if (name.length > MAX_NAME) errors.name = `Hasta ${MAX_NAME} caracteres`;

  const value = toNumber(values.goal_value);
  if (Number.isNaN(value) && DOT_DECIMAL.test(values.goal_value.trim())) {
    errors.goal_value = 'Usá coma para los decimales (ej. 72,5)';
  } else if (!Number.isFinite(value) || value <= 0) errors.goal_value = 'Tiene que ser un número mayor a 0';
  else if (INTEGER_GOALS.includes(values.goal_type) && !Number.isInteger(value)) {
    errors.goal_value = 'Tiene que ser un número entero, sin decimales';
  }

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
