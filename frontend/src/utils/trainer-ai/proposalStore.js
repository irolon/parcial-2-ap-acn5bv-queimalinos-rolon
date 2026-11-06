// La sesión del asistente vive en `sessionStorage` para que el ida y vuelta con el editor y una recarga no la pierdan.
// Forma: `{ form, student, generationId, proposal, assigned: { [bloque]: { studentId } }, saved, editing }`.

export const AI_SESSION_KEY = (trainerId) => `fittrainer.ai-proposal.${trainerId}`;

/** La sesión guardada, o `null` si no hay, no se puede leer o no hay entrenador. */
export function readAiSession(trainerId) {
  if (!trainerId) return null;
  try {
    const data = JSON.parse(sessionStorage.getItem(AI_SESSION_KEY(trainerId)));
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

export function writeAiSession(trainerId, data) {
  if (!trainerId) return;
  try {
    sessionStorage.setItem(AI_SESSION_KEY(trainerId), JSON.stringify(data));
  } catch {
    /* sin almacenamiento: la propuesta solo vive en memoria */
  }
}

export function clearAiSession(trainerId) {
  try {
    sessionStorage.removeItem(AI_SESSION_KEY(trainerId));
  } catch {
    /* idem */
  }
}
