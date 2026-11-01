import { MAX_REST_SECONDS } from './workoutSets';

// El descanso de la sesión en curso (spec §3 y §8): cuenta regresiva con fin absoluto y el descanso real que queda
// anotado en la serie que lo disparó (`restSeconds`), como el celular (WorkoutRules.kt, `closingRest`).

const iso = (time) => new Date(time).toISOString();
const ms = (time) => new Date(time).getTime();
const restEnd = (state) => (state.restEndsAt ? Date.parse(state.restEndsAt) : Number.NaN);

/**
 * Descanso del ejercicio a la vista con fin absoluto (`restEndsAt`), desde `now`. 0 s = sin descanso. Guarda también
 * su total (`restTotalSeconds`), así la barra no depende del ejercicio que se ponga a la vista después, y la serie que
 * lo disparó (`restSetId`), que es la que se lleva el descanso real.
 */
export function startRest(state, now = new Date(), setId = null) {
  const seconds = state.exercises[state.cursor]?.restSeconds ?? 0;
  if (seconds <= 0) return { ...state, restEndsAt: null, restTotalSeconds: null, restSetId: null };
  return { ...state, restEndsAt: iso(ms(now) + seconds * 1000), restTotalSeconds: seconds, restSetId: setId };
}

/** Segundos que le quedan al descanso contra `now`, redondeados para arriba y nunca negativos; null sin descanso. */
export function restRemaining(state, now = new Date()) {
  const end = restEnd(state);
  return Number.isNaN(end) ? null : Math.max(0, Math.ceil((end - ms(now)) / 1000));
}

/**
 * El total del descanso en curso, para la barra. Una sesión guardada antes de que existiera `restTotalSeconds` usa el
 * descanso del ejercicio a la vista, como antes.
 */
export function restTotal(state) {
  const total = state.restTotalSeconds;
  return Number.isFinite(total) && total > 0 ? total : (state.exercises[state.cursor]?.restSeconds ?? 0);
}

/**
 * ±segundos (los botones de ±15) sobre lo que le queda ahora al descanso en curso; nunca baja de 0. El total se mueve
 * lo mismo, sin quedar por debajo de lo que queda (la barra nunca pasa de llena).
 */
export function adjustRest(state, deltaSeconds, now = new Date()) {
  const end = restEnd(state);
  if (Number.isNaN(end) || !Number.isFinite(deltaSeconds)) return state;
  const left = Math.max(0, Math.max(0, end - ms(now)) + deltaSeconds * 1000);
  const total = Math.max(restTotal(state) + deltaSeconds, Math.ceil(left / 1000));
  return { ...state, restEndsAt: iso(ms(now) + left), restTotalSeconds: total };
}

/**
 * Cierra el descanso abierto y anota el real en la serie que lo disparó: desde que se registró hasta que dejó de
 * correr. Si ya había vencido, hasta su fin (el alumno pudo dejar la pestaña sin tocar nada); si no, hasta `now`
 * (Saltar o la serie siguiente). Con los ±15″ incluidos y entero de 0 a 3600 (el tope del backend). Sin descanso
 * abierto (o en una sesión guardada antes de `restSetId`) no cambia nada; si esa serie se borró, solo lo cierra.
 */
export function closeRest(state, now = new Date()) {
  if (!state.restSetId) return state;
  const closed = { ...state, restSetId: null };
  const set = state.sets.find((item) => item.id === state.restSetId);
  const executed = Date.parse(set?.executedAt);
  if (Number.isNaN(executed)) return closed;
  const end = Math.min(ms(now), restEnd(state) || Number.POSITIVE_INFINITY);
  const seconds = Math.min(Math.max(Math.round((end - executed) / 1000), 0), MAX_REST_SECONDS);
  return { ...closed, sets: state.sets.map((item) => (item === set ? { ...item, restSeconds: seconds } : item)) };
}

/** Saltea el descanso en curso y anota lo que se descansó hasta acá. */
export const skipRest = (state, now = new Date()) =>
  state.restEndsAt === null ? state : { ...closeRest(state, now), restEndsAt: null };
