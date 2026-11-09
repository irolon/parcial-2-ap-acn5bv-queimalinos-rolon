// Lo que se asume cuando una rutina no trae el dato. Son los mismos valores que propone el editor del
// entrenador y que usa el celular, así la rutina del día, el plan y la sesión cuentan lo mismo.
export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = 10;
export const DEFAULT_REST_SECONDS = 90;
// Lo que tarda una serie sin contar el descanso (el backend no lo informa): lo usan la rutina del día y el editor
// para estimar la duración con la misma cuenta.
export const WORK_SECONDS_PER_SET = 45;
