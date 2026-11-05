// El peso que se le propone al alumno para un ejercicio de su rutina: el plan de Hoy y la serie 1 de la sesión.
// 0 kg es "sin peso" (peso corporal): el celular guarda 0 cuando no hay sugerido ni historial, así que un 0 no tapa
// al dato siguiente. La regla es campo por campo y después el siguiente.

/** El peso si es positivo; 0, negativo, vacío o lo que no es un número → null (sin peso). Acepta numeric como texto. */
export function positiveKg(kg) {
  const value = typeof kg === 'string' && kg.trim() !== '' ? Number(kg) : kg;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * El de la última sesión (`last_session_kg`) y, si no hay, el del entrenador (`suggested_kg`), cada uno con 0 = sin
 * peso; null si ninguno. Toma un ejercicio con la forma normalizada de /routines/today y /routines/mine.
 */
export const suggestedKg = (exercise) =>
  positiveKg(exercise?.last_session_kg) ?? positiveKg(exercise?.suggested_kg) ?? null;
