// Escala RPE con repeticiones en reserva: un número solo no le dice nada a un principiante. Copia literal de
// mobile/app/src/main/java/com/fittrainer/ui/workout/RpeTexts.kt (un test compara las dos listas).
export const RPE_LABELS = [
  'Muy fácil, como entrar en calor',
  'Fácil',
  'Liviano, podías seguir un rato largo',
  'Moderado',
  'Algo exigente, te quedaban 5 o más reps',
  'Exigente, te quedaban 4 reps',
  'Difícil, te quedaban 2-3 reps',
  'Muy difícil, te quedaban 1-2 reps',
  'Casi al fallo, te quedaba 1 rep',
  'Al fallo, no salía ni una más',
];

/** Los valores que se pueden elegir: de 1 a 10. */
export const RPE_VALUES = RPE_LABELS.map((_, index) => index + 1);

/** Etiqueta del RPE 1-10; null si viene fuera de rango (un dato raro del servidor no tira la pantalla). */
export const rpeLabel = (rpe) => (Number.isInteger(rpe) ? (RPE_LABELS[rpe - 1] ?? null) : null);
