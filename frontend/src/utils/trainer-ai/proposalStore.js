// La sesión del asistente vive en `sessionStorage` para que el ida y vuelta con el editor y una recarga no la pierdan.
// Forma: `{ form, student, generationId, proposal, saved, editing,
//   assigned: { [bloque]: { studentId, studentName, routineId, block: { name, days, exercises } } } }`.

export const AI_SESSION_KEY = (trainerId) => `fittrainer.ai-proposal.${trainerId}`;

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isBlock = (block) => isObject(block) && Array.isArray(block.days) && Array.isArray(block.exercises) && block.exercises.every(isObject);

/** Si `data` tiene la forma que escribe la pantalla (lo demás se trata como no tener sesión). */
function isSession(data) {
  return isObject(data)
    && isObject(data.form)
    && typeof data.generationId === 'string'
    && isObject(data.proposal)
    && Array.isArray(data.proposal.routines)
    && data.proposal.routines.length > 0
    && data.proposal.routines.every(isBlock)
    && (data.assigned === undefined || isObject(data.assigned));
}

/** La sesión guardada, o `null` si no hay, no se puede leer, tiene otra forma o no hay entrenador. */
export function readAiSession(trainerId) {
  if (!trainerId) return null;
  try {
    const data = JSON.parse(sessionStorage.getItem(AI_SESSION_KEY(trainerId)));
    return isSession(data) ? data : null;
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
